/**
 * Data Access Layer: BookingRepository (SH-23 / T023)
 * Håndterer al databaseadgang og transaktioner for BOOKING, GUEST, ROOM og ROOM_TYPE i MySQL.
 * Overholder 3-lagsarkitekturen samt OOP og SOLID (Dependency Injection via constructor).
 */

import db from './db.js';

/**
 * Vejledende basispriser pr. værelsestype-ID (jf. data-model.md & Constitution)
 * Anvendes ved prisgenberegning, når ingen eksplicit total_price angives.
 */
export const ROOM_TYPE_BASE_PRICES_DKK = {
  1: 1050, // Standard Single (900-1200)
  2: 1250, // Grand Lit (1100-1400)
  3: 1400, // Standard Double (1200-1600)
  4: 1700, // Superior Double (1400-2000)
  5: 2150, // Junior Suite (1800-2500)
  6: 2400, // Spa Executive (2000-2800)
  7: 3000, // Suite (2500-3500)
  8: 3500  // LOFT Suite (3000-4000)
};

function formatDateOnly(val) {
  if (!val) return null;
  if (val instanceof Date) {
    const year = val.getFullYear();
    const month = String(val.getMonth() + 1).padStart(2, '0');
    const day = String(val.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(val).substring(0, 10);
}

function splitFullName(fullName = '') {
  const trimmed = String(fullName || '').trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

function mapRowToBooking(row) {
  if (!row) return null;
  const { firstName, lastName } = splitFullName(row.guest_name);
  const totalPrice = Number(row.total_price ?? 0);

  return {
    id: row.id,
    guest_id: row.guest_id,
    guest_name: row.guest_name,
    first_name: firstName,
    last_name: lastName,
    email: row.guest_email,
    phone: row.guest_phone,
    country: row.guest_country,
    room_type_id: row.room_type_id,
    room_type_name: row.room_type_name,
    room_type_capacity: row.room_type_capacity,
    room_number: row.room_number,
    floor: row.room_floor,
    check_in_date: formatDateOnly(row.check_in_date),
    check_out_date: formatDateOnly(row.check_out_date),
    num_guests: Number(row.num_guests),
    total_price: totalPrice,
    total_price_dkk: totalPrice,
    status: row.status,
    satisfaction_rating: row.satisfaction_rating ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export class BookingRepository {
  constructor(dbClient = db) {
    this.db = dbClient;
  }

  /**
   * Henter en specifik booking ud fra ID inkl. gæste-, værelses- og værelsestypedetaljer (SH-23 / T023).
   * @param {number|string} id
   * @returns {Promise<object|null>}
   */
  async getById(id) {
    const sql = `
      SELECT
        b.id,
        b.guest_id,
        g.name AS guest_name,
        g.email AS guest_email,
        g.phone AS guest_phone,
        g.country AS guest_country,
        b.room_type_id,
        rt.name AS room_type_name,
        rt.capacity AS room_type_capacity,
        b.room_number,
        r.floor AS room_floor,
        b.check_in_date,
        b.check_out_date,
        b.num_guests,
        b.total_price,
        b.status,
        b.satisfaction_rating,
        b.created_at,
        b.updated_at
      FROM BOOKING b
      INNER JOIN GUEST g ON b.guest_id = g.id
      INNER JOIN ROOM_TYPE rt ON b.room_type_id = rt.id
      LEFT JOIN ROOM r ON b.room_number = r.room_number
      WHERE b.id = ?
      LIMIT 1
    `;

    const rows = await this.db.query(sql, [Number(id)]);
    if (!rows || rows.length === 0) {
      return null;
    }
    return mapRowToBooking(rows[0]);
  }

  /**
   * Henter værelsestype ud fra ID.
   * @param {number|string} roomTypeId
   * @returns {Promise<object|null>}
   */
  async getRoomTypeById(roomTypeId) {
    const sql = `
      SELECT id, name, capacity, description
      FROM ROOM_TYPE
      WHERE id = ?
      LIMIT 1
    `;
    const rows = await this.db.query(sql, [Number(roomTypeId)]);
    if (!rows || rows.length === 0) {
      return null;
    }
    const rt = rows[0];
    return {
      ...rt,
      base_price_dkk: ROOM_TYPE_BASE_PRICES_DKK[rt.id] || 1500
    };
  }

  /**
   * Henter alle 8 officielle værelsestyper.
   * @returns {Promise<Array<object>>}
   */
  async getAllRoomTypes() {
    const sql = `
      SELECT id, name, capacity, description
      FROM ROOM_TYPE
      ORDER BY id ASC
    `;
    const rows = await this.db.query(sql);
    return rows.map((rt) => ({
      ...rt,
      base_price_dkk: ROOM_TYPE_BASE_PRICES_DKK[rt.id] || 1500
    }));
  }

  /**
   * Finder et ledigt værelsesnummer for en given værelsestype og periode uden dato-overlap.
   * Hvis excludeBookingId angives, ignoreres den pågældende booking under overlap-tjekket (ved opdatering).
   * @param {number} roomTypeId
   * @param {string} checkInDate
   * @param {string} checkOutDate
   * @param {number|null} [excludeBookingId]
   * @param {object|null} [connection]
   * @returns {Promise<number|null>}
   */
  async findAvailableRoom(roomTypeId, checkInDate, checkOutDate, excludeBookingId = null, connection = null) {
    const params = [Number(roomTypeId), checkOutDate, checkInDate];
    let excludeClause = '';
    if (excludeBookingId !== null && excludeBookingId !== undefined) {
      excludeClause = 'AND b.id != ?';
      params.push(Number(excludeBookingId));
    }

    const sql = `
      SELECT r.room_number
      FROM ROOM r
      WHERE r.room_type_id = ?
        AND r.room_number NOT IN (
          SELECT b.room_number
          FROM BOOKING b
          WHERE b.status != 'cancelled'
            AND b.room_number IS NOT NULL
            AND b.check_in_date < ?
            AND b.check_out_date > ?
            ${excludeClause}
        )
      ORDER BY r.room_number ASC
      LIMIT 1
    `;

    if (connection) {
      const [rows] = await connection.execute(sql, params);
      return rows.length > 0 ? rows[0].room_number : null;
    }

    const rows = await this.db.query(sql, params);
    return rows.length > 0 ? rows[0].room_number : null;
  }

  /**
   * Tjekker om et specifikt værelsesnummer er ledigt i perioden (ekskl. evt. excludeBookingId).
   * @param {number} roomNumber
   * @param {string} checkInDate
   * @param {string} checkOutDate
   * @param {number|null} [excludeBookingId]
   * @param {object|null} [connection]
   * @returns {Promise<boolean>}
   */
  async isRoomAvailable(roomNumber, checkInDate, checkOutDate, excludeBookingId = null, connection = null) {
    const params = [Number(roomNumber), checkOutDate, checkInDate];
    let excludeClause = '';
    if (excludeBookingId !== null && excludeBookingId !== undefined) {
      excludeClause = 'AND b.id != ?';
      params.push(Number(excludeBookingId));
    }

    const sql = `
      SELECT COUNT(*) AS overlap_count
      FROM BOOKING b
      WHERE b.room_number = ?
        AND b.status != 'cancelled'
        AND b.check_in_date < ?
        AND b.check_out_date > ?
        ${excludeClause}
    `;

    if (connection) {
      const [rows] = await connection.execute(sql, params);
      return Number(rows[0]?.overlap_count || 0) === 0;
    }

    const rows = await this.db.query(sql, params);
    return Number(rows[0]?.overlap_count || 0) === 0;
  }

  /**
   * Opdaterer en eksisterende booking og tilhørende gæstedata i en atomar transaktion (SH-23 / T023).
   * Verificerer at nyt værelse/periode ikke skaber overlap med andre aktive reservationer.
   * @param {number|string} id
   * @param {object} updateData
   * @returns {Promise<object|null>}
   */
  async updateBooking(id, updateData) {
    const bookingId = Number(id);

    await this.db.withTransaction(async (conn) => {
      const [existingRows] = await conn.execute(
        'SELECT * FROM BOOKING WHERE id = ? FOR UPDATE',
        [bookingId]
      );

      if (!existingRows || existingRows.length === 0) {
        const notFoundErr = new Error(`Booking #${bookingId} blev ikke fundet.`);
        notFoundErr.status = 404;
        notFoundErr.code = 'NOT_FOUND';
        throw notFoundErr;
      }

      const existing = existingRows[0];
      const existingCheckIn = formatDateOnly(existing.check_in_date);
      const existingCheckOut = formatDateOnly(existing.check_out_date);

      const nextRoomTypeId =
        updateData.room_type_id !== undefined
          ? Number(updateData.room_type_id)
          : Number(existing.room_type_id);
      const nextCheckIn = updateData.check_in_date || existingCheckIn;
      const nextCheckOut = updateData.check_out_date || existingCheckOut;
      const nextNumGuests =
        updateData.num_guests !== undefined
          ? Number(updateData.num_guests)
          : Number(existing.num_guests);
      const nextTotalPrice =
        updateData.total_price !== undefined
          ? Number(updateData.total_price)
          : updateData.total_price_dkk !== undefined
          ? Number(updateData.total_price_dkk)
          : Number(existing.total_price);
      const nextStatus = updateData.status || existing.status;
      const nextSatisfactionRating =
        updateData.satisfaction_rating !== undefined
          ? updateData.satisfaction_rating
          : existing.satisfaction_rating;

      // Bestem værelsesnummer og verificer at der ikke opstår dato-overlap
      let nextRoomNumber =
        updateData.room_number !== undefined && updateData.room_number !== null
          ? Number(updateData.room_number)
          : Number(existing.room_number);

      const datesChanged = nextCheckIn !== existingCheckIn || nextCheckOut !== existingCheckOut;
      const roomTypeChanged = nextRoomTypeId !== Number(existing.room_type_id);
      const explicitRoomChanged =
        updateData.room_number !== undefined &&
        Number(updateData.room_number) !== Number(existing.room_number);

      if (nextStatus !== 'cancelled' && (datesChanged || roomTypeChanged || explicitRoomChanged)) {
        if (!roomTypeChanged || explicitRoomChanged) {
          // Tjek først om det nuværende/valgte værelse er ledigt i den nye periode
          const currentRoomStillAvailable = await this.isRoomAvailable(
            nextRoomNumber,
            nextCheckIn,
            nextCheckOut,
            bookingId,
            conn
          );

          if (!currentRoomStillAvailable) {
            if (explicitRoomChanged) {
              const conflictErr = new Error(
                `Værelse ${nextRoomNumber} er allerede optaget i perioden ${nextCheckIn} til ${nextCheckOut}.`
              );
              conflictErr.status = 409;
              conflictErr.code = 'ROOM_CONFLICT';
              throw conflictErr;
            }
            // Find et andet ledigt værelse af samme værelsestype
            const alternativeRoom = await this.findAvailableRoom(
              nextRoomTypeId,
              nextCheckIn,
              nextCheckOut,
              bookingId,
              conn
            );
            if (!alternativeRoom) {
              const conflictErr = new Error(
                `Der er ingen ledige værelser for den valgte værelsestype i perioden ${nextCheckIn} til ${nextCheckOut}.`
              );
              conflictErr.status = 409;
              conflictErr.code = 'NO_AVAILABLE_ROOM';
              throw conflictErr;
            }
            nextRoomNumber = alternativeRoom;
          }
        } else {
          // Værelsestypen er ændret uden specifikt værelsesnummer -> tildel ledigt værelse af ny type
          const availableRoom = await this.findAvailableRoom(
            nextRoomTypeId,
            nextCheckIn,
            nextCheckOut,
            bookingId,
            conn
          );
          if (!availableRoom) {
            const conflictErr = new Error(
              `Der er ingen ledige værelser af den valgte værelsestype i perioden ${nextCheckIn} til ${nextCheckOut}.`
            );
            conflictErr.status = 409;
            conflictErr.code = 'NO_AVAILABLE_ROOM';
            throw conflictErr;
          }
          nextRoomNumber = availableRoom;
        }
      }

      // Opdater gæsteoplysninger i GUEST tabellen hvis angivet
      const [guestRows] = await conn.execute(
        'SELECT * FROM GUEST WHERE id = ? FOR UPDATE',
        [existing.guest_id]
      );
      if (guestRows && guestRows.length > 0) {
        const currentGuest = guestRows[0];
        const guestInput = updateData.guestData || updateData;

        let nextGuestName = currentGuest.name;
        if (guestInput.guest_name && String(guestInput.guest_name).trim()) {
          nextGuestName = String(guestInput.guest_name).trim();
        } else if (guestInput.first_name || guestInput.last_name) {
          const combined = [guestInput.first_name, guestInput.last_name]
            .filter(Boolean)
            .join(' ')
            .trim();
          if (combined) nextGuestName = combined;
        } else if (guestInput.name && String(guestInput.name).trim()) {
          nextGuestName = String(guestInput.name).trim();
        }

        const nextCountry =
          guestInput.country !== undefined && guestInput.country !== null && String(guestInput.country).trim() !== ''
            ? String(guestInput.country).trim()
            : currentGuest.country;
        const nextEmail =
          guestInput.email !== undefined && guestInput.email !== null && String(guestInput.email).trim() !== ''
            ? String(guestInput.email).trim()
            : currentGuest.email;
        const nextPhone =
          guestInput.phone !== undefined && guestInput.phone !== null && String(guestInput.phone).trim() !== ''
            ? String(guestInput.phone).trim()
            : currentGuest.phone;

        await conn.execute(
          'UPDATE GUEST SET name = ?, country = ?, email = ?, phone = ? WHERE id = ?',
          [nextGuestName, nextCountry, nextEmail, nextPhone, existing.guest_id]
        );
      }

      // Opdater BOOKING tabellen
      await conn.execute(
        `UPDATE BOOKING
         SET room_type_id = ?,
             room_number = ?,
             check_in_date = ?,
             check_out_date = ?,
             num_guests = ?,
             total_price = ?,
             status = ?,
             satisfaction_rating = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          nextRoomTypeId,
          nextRoomNumber,
          nextCheckIn,
          nextCheckOut,
          nextNumGuests,
          nextTotalPrice,
          nextStatus,
          nextSatisfactionRating,
          bookingId
        ]
      );
    });

    return await this.getById(bookingId);
  }

  /**
   * Udfører soft delete af en reservation ved at sætte status = 'cancelled' (SH-28 / T028).
   * Rækken bevares i MySQL af hensyn til historik, mens værelset i perioden straks frigives.
   * @param {number|string} id
   * @returns {Promise<object|null>}
   */
  async cancelBooking(id) {
    const bookingId = Number(id);
    const sql = `
      UPDATE BOOKING
      SET status = 'cancelled',
          updated_at = NOW()
      WHERE id = ?
    `;
    await this.db.query(sql, [bookingId]);
    return await this.getById(bookingId);
  }

  /**
   * Fremsøger bookinger med valgfri filtrering på søgetekst (ID, navn, email) og status.
   * @param {object} [filters]
   * @returns {Promise<Array<object>>}
   */
  async searchBookings(filters = {}) {
    const queryText = String(filters.q ?? filters.search ?? '').trim();
    const status = String(filters.status ?? '').trim();
    const fromDate = String(filters.from ?? '').trim();
    const toDate = String(filters.to ?? '').trim();
    const limit = Math.min(Math.max(parseInt(filters.limit, 10) || 100, 1), 500);
    const offset = Math.max(parseInt(filters.offset, 10) || 0, 0);

    const conditions = [];
    const params = [];

    if (queryText) {
      conditions.push('(CAST(b.id AS CHAR) LIKE ? OR g.name LIKE ? OR g.email LIKE ? OR CAST(b.room_number AS CHAR) LIKE ?)');
      const wildcard = `%${queryText}%`;
      params.push(wildcard, wildcard, wildcard, wildcard);
    }

    if (status) {
      conditions.push('b.status = ?');
      params.push(status);
    }

    if (fromDate) {
      conditions.push('b.check_out_date >= ?');
      params.push(fromDate);
    }

    if (toDate) {
      conditions.push('b.check_in_date <= ?');
      params.push(toDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        b.id,
        b.guest_id,
        g.name AS guest_name,
        g.email AS guest_email,
        g.phone AS guest_phone,
        g.country AS guest_country,
        b.room_type_id,
        rt.name AS room_type_name,
        rt.capacity AS room_type_capacity,
        b.room_number,
        r.floor AS room_floor,
        b.check_in_date,
        b.check_out_date,
        b.num_guests,
        b.total_price,
        b.status,
        b.satisfaction_rating,
        b.created_at,
        b.updated_at
      FROM BOOKING b
      INNER JOIN GUEST g ON b.guest_id = g.id
      INNER JOIN ROOM_TYPE rt ON b.room_type_id = rt.id
      LEFT JOIN ROOM r ON b.room_number = r.room_number
      ${whereClause}
      ORDER BY b.check_in_date DESC, b.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const rows = await this.db.query(sql, params);
    return rows.map(mapRowToBooking);
  }
}

export default new BookingRepository();
