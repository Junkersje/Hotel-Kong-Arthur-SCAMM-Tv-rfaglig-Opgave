/**
 * Data Access Layer: BookingRepository (OOP Class)
 * Single Responsibility: Databaseoperationer og SQL-transaktioner for gæster og reservationer.
 */

import { query, withTransaction } from './db.js';
import { Booking } from '../models/Booking.js';
import { Guest } from '../models/Guest.js';
import { Room } from '../models/Room.js';
import { BOOKING_STATUS } from '../constants/hotelConstants.js';
import { NotFoundError } from '../errors/AppError.js';

export class BookingRepository {
  /**
   * Søger i bookinger med filtre på fritekst, status og datoer.
   * @param {object} filters - { q, status, from, to }
   * @returns {Promise<Booking[]>}
   */
  async searchBookings({ q = '', status = '', from = null, to = null } = {}) {
    let sql = `
      SELECT b.id, b.guest_id, b.room_id, b.check_in_date, b.check_out_date,
             b.num_guests, b.total_price_dkk, b.status, b.satisfaction_score,
             b.created_at, b.updated_at,
             g.first_name, g.last_name, g.email, g.phone, g.country,
             r.room_number, r.floor, rt.name as room_type_name, rt.id as room_type_id
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE 1=1
    `;
    const params = [];

    if (q && q.trim()) {
      const term = `%${q.trim()}%`;
      sql += ` AND (
        g.first_name LIKE ? OR 
        g.last_name LIKE ? OR 
        CONCAT(g.first_name, ' ', g.last_name) LIKE ? OR
        g.email LIKE ? OR 
        b.id = ? OR
        r.room_number = ?
      )`;
      const numId = parseInt(q.trim(), 10) || 0;
      params.push(term, term, term, term, numId, q.trim());
    }

    if (status && Object.values(BOOKING_STATUS).includes(status)) {
      sql += ` AND b.status = ?`;
      params.push(status);
    }

    if (from) {
      sql += ` AND b.check_in_date >= ?`;
      params.push(from);
    }

    if (to) {
      sql += ` AND b.check_out_date <= ?`;
      params.push(to);
    }

    sql += ` ORDER BY b.check_in_date DESC, b.id DESC LIMIT 100`;

    const rows = await query(sql, params);
    return rows.map(r => this._mapRowToBooking(r));
  }

  /**
   * Henter en specifik booking frem på ID.
   * @param {number} id
   * @returns {Promise<Booking|null>}
   */
  async getById(id) {
    const sql = `
      SELECT b.id, b.guest_id, b.room_id, b.check_in_date, b.check_out_date,
             b.num_guests, b.total_price_dkk, b.status, b.satisfaction_score,
             b.created_at, b.updated_at,
             g.first_name, g.last_name, g.email, g.phone, g.country,
             r.room_number, r.floor, rt.name as room_type_name, rt.id as room_type_id
      FROM bookings b
      JOIN guests g ON b.guest_id = g.id
      JOIN rooms r ON b.room_id = r.id
      JOIN room_types rt ON r.room_type_id = rt.id
      WHERE b.id = ?
    `;
    const rows = await query(sql, [id]);
    if (rows.length === 0) return null;
    return this._mapRowToBooking(rows[0]);
  }

  /**
   * Finder et konkret ledigt værelse af den ønskede type i datointervallet.
   * Forhindrer dobbeltbookinger.
   * @param {number} roomTypeId
   * @param {string} checkIn
   * @param {string} checkOut
   * @param {number|null} excludeBookingId - Anvendes ved redigering af eksisterende booking
   * @returns {Promise<number|null>} Værelses-ID eller null
   */
  async findAvailableRoom(roomTypeId, checkIn, checkOut, excludeBookingId = null) {
    let sql = `
      SELECT r.id
      FROM rooms r
      WHERE r.room_type_id = ?
        AND r.is_active = 1
        AND r.id NOT IN (
          SELECT b.room_id
          FROM bookings b
          WHERE b.status != 'cancelled'
            AND (b.check_in_date < ? AND b.check_out_date > ?)
    `;
    const params = [roomTypeId, checkOut, checkIn];

    if (excludeBookingId) {
      sql += ` AND b.id != ?`;
      params.push(excludeBookingId);
    }

    sql += `
        )
      ORDER BY r.floor ASC, r.room_number ASC
      LIMIT 1
    `;

    const rows = await query(sql, params);
    return rows.length > 0 ? rows[0].id : null;
  }

  /**
   * Opretter en ny booking og gæsteprofil under en atomar ACID-transaktion.
   * @param {object} data
   * @returns {Promise<Booking>}
   */
  async createBooking({ guestData, bookingData, roomId }) {
    return await withTransaction(async (conn) => {
      // 1. Opret eller find gæst
      let guestId;
      const [existingGuest] = await conn.query(
        'SELECT id FROM guests WHERE email = ?',
        [guestData.email]
      );

      if (existingGuest.length > 0) {
        guestId = existingGuest[0].id;
        // Opdater gæstedata ved ny booking
        await conn.query(
          'UPDATE guests SET first_name = ?, last_name = ?, phone = COALESCE(?, phone), country = COALESCE(?, country) WHERE id = ?',
          [guestData.firstName, guestData.lastName, guestData.phone, guestData.country, guestId]
        );
      } else {
        const [guestRes] = await conn.query(
          'INSERT INTO guests (first_name, last_name, email, phone, country) VALUES (?, ?, ?, ?, ?)',
          [guestData.firstName, guestData.lastName, guestData.email, guestData.phone, guestData.country]
        );
        guestId = guestRes.insertId;
      }

      // 2. Indsæt booking
      const [bookingRes] = await conn.query(
        `INSERT INTO bookings (
          guest_id, room_id, check_in_date, check_out_date, num_guests, total_price_dkk, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          guestId,
          roomId,
          bookingData.checkInDate,
          bookingData.checkOutDate,
          bookingData.numGuests,
          bookingData.totalPriceDkk,
          bookingData.status || BOOKING_STATUS.CONFIRMED
        ]
      );

      const createdId = bookingRes.insertId;
      return createdId;
    });
  }

  /**
   * Opdaterer en eksisterende booking.
   * @param {number} id
   * @param {object} updateData
   * @returns {Promise<boolean>}
   */
  async updateBooking(id, updateData) {
    return await withTransaction(async (conn) => {
      // Opdater gæst hvis angivet
      if (updateData.guestData) {
        const [bRows] = await conn.query('SELECT guest_id FROM bookings WHERE id = ?', [id]);
        if (bRows.length === 0) throw new NotFoundError(`Booking #${id} blev ikke fundet`);
        const guestId = bRows[0].guest_id;

        await conn.query(
          'UPDATE guests SET first_name = ?, last_name = ?, email = ?, phone = COALESCE(?, phone), country = COALESCE(?, country) WHERE id = ?',
          [
            updateData.guestData.firstName,
            updateData.guestData.lastName,
            updateData.guestData.email,
            updateData.guestData.phone,
            updateData.guestData.country,
            guestId
          ]
        );
      }

      // Opdater booking
      const fields = [];
      const values = [];

      if (updateData.roomId) {
        fields.push('room_id = ?');
        values.push(updateData.roomId);
      }
      if (updateData.checkInDate) {
        fields.push('check_in_date = ?');
        values.push(updateData.checkInDate);
      }
      if (updateData.checkOutDate) {
        fields.push('check_out_date = ?');
        values.push(updateData.checkOutDate);
      }
      if (updateData.numGuests) {
        fields.push('num_guests = ?');
        values.push(updateData.numGuests);
      }
      if (updateData.totalPriceDkk !== undefined) {
        fields.push('total_price_dkk = ?');
        values.push(updateData.totalPriceDkk);
      }
      if (updateData.status) {
        fields.push('status = ?');
        values.push(updateData.status);
      }

      if (fields.length > 0) {
        values.push(id);
        await conn.query(`UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`, values);
      }

      return true;
    });
  }

  /**
   * Udfører soft delete: sætter status = 'cancelled'.
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async cancelBooking(id) {
    const sql = `UPDATE bookings SET status = 'cancelled' WHERE id = ?`;
    const result = await query(sql, [id]);
    return result.affectedRows > 0;
  }

  _mapRowToBooking(r) {
    return new Booking({
      id: r.id,
      guestId: r.guest_id,
      roomId: r.room_id,
      checkInDate: r.check_in_date instanceof Date ? r.check_in_date.toISOString().substring(0, 10) : String(r.check_in_date).substring(0, 10),
      checkOutDate: r.check_out_date instanceof Date ? r.check_out_date.toISOString().substring(0, 10) : String(r.check_out_date).substring(0, 10),
      numGuests: r.num_guests,
      totalPriceDkk: r.total_price_dkk,
      status: r.status,
      satisfactionScore: r.satisfaction_score,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      guest: new Guest({
        id: r.guest_id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        phone: r.phone,
        country: r.country
      }),
      room: new Room({
        id: r.room_id,
        roomNumber: r.room_number,
        roomTypeId: r.room_type_id,
        floor: r.floor
      })
    });
  }
}

export default new BookingRepository();
