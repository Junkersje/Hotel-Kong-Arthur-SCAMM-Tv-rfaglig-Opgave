
import db from '../config/database.js';
import * as bookingRepository from '../repositories/bookingRepository.js';
import {
  createBookingSchema,
  validateCreateBooking
} from '../validators/bookingValidator.js';

export async function withTransaction(callback) {
  const client = await db.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

function formatDate(value) {
  if (value == null) return null;

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return null;
}

function calculateNights(checkIn, checkOut) {
  const start = formatDate(checkIn);
  const end = formatDate(checkOut);

  if (!start || !end) return null;

  const nights =
    (Date.parse(end + 'T00:00:00Z') -
      Date.parse(start + 'T00:00:00Z')) / 86400000;

  return Number.isInteger(nights) && nights > 0
    ? nights
    : null;
}

export async function createBooking(data) {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    country,
    room_type_id,
    num_guests,
    check_in_date,
    check_out_date
  } = data;

  const nights = calculateNights(check_in_date, check_out_date);

  if (!nights) {
    const error = new Error(
      'Afrejsedato skal være efter ankomstdato.'
    );
    error.statusCode = 400;
    throw error;
  }

  return await withTransaction(async (client) => {
    // Find eksisterende gæst via e-mail.
    const existingGuest = await client.query(
      `SELECT id FROM guest
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email.trim()]
    );

    let guestId;

    if (existingGuest.rows.length > 0) {
      guestId = existingGuest.rows[0].id;

      await client.query(
        `UPDATE guest
         SET name = $1,
             country = $2,
             phone = $3
         WHERE id = $4`,
        [
          `${first_name.trim()} ${last_name.trim()}`,
          String(country).trim(),
          phone_number || null,
          guestId
        ]
      );
    } else {
      const newGuest = await client.query(
        `INSERT INTO guest (name, country, email, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          `${first_name.trim()} ${last_name.trim()}`,
          String(country).trim(),
          email.trim(),
          phone_number || null
        ]
      );

      guestId = newGuest.rows[0].id;
    }

    // Find et ledigt værelse af den ønskede type.
    const availableRoom = await client.query(
      `SELECT r.room_number, rt.name AS room_type_name
       FROM room r
       JOIN room_type rt ON r.room_type_id = rt.id
       WHERE r.room_type_id = $1
         AND r.status = 'available'
         AND NOT EXISTS (
           SELECT 1
           FROM booking b
           WHERE b.room_number = r.room_number
             AND b.status NOT IN ('cancelled', 'canceled')
             AND b.check_in_date < $3::date
             AND b.check_out_date > $2::date
         )
       ORDER BY r.room_number
       LIMIT 1
       FOR UPDATE OF r`,
      [room_type_id, check_in_date, check_out_date]
    );

    if (availableRoom.rows.length === 0) {
      const error = new Error(
        'Der er ingen ledige værelser af denne type i den valgte periode.'
      );
      error.statusCode = 409;
      throw error;
    }

    const room = availableRoom.rows[0];

    // Der findes ingen room_price-tabel i den nuværende database.
    // Derfor anvendes ingen opdigtet værelsespris.
    // Prisberegning skal tilføjes, når den rigtige priskilde er kendt.
    const totalPrice = 0;

    const result = await client.query(
      `INSERT INTO booking (
        guest_id,
        room_type_id,
        room_number,
        check_in_date,
        check_out_date,
        num_guests,
        total_price,
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        'confirmed', NOW(), NOW()
      )
      RETURNING id, status, created_at`,
      [
        guestId,
        room_type_id,
        room.room_number,
        check_in_date,
        check_out_date,
        num_guests,
        totalPrice
      ]
    );

    const booking = result.rows[0];

    return {
      id: booking.id,
      guest_id: guestId,
      customer_id: guestId,
      customer_name: `${first_name} ${last_name}`,
      customer_email: email,
      room: {
        room_number: room.room_number,
        room_type_id,
        room_type_name: room.room_type_name
      },
      check_in_date,
      check_out_date,
      arrival: check_in_date,
      departure: check_out_date,
      total_nights: nights,
      num_guests,
      total_price: totalPrice,
      status: booking.status,
      created_at: booking.created_at
    };
  });
}

export async function getBookings(filterParams = {}) {
  const filters = {};

  if (filterParams.q != null) {
    filters.q = String(filterParams.q).trim();
  }

  if (filterParams.status != null && filterParams.status !== '') {
    filters.status = String(filterParams.status).trim();
  }

  for (const key of ['startDate', 'endDate']) {
    if (filterParams[key] != null && filterParams[key] !== '') {
      const value = String(filterParams[key]);

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        formatDate(new Date(value)) !== value
      ) {
        throw new Error(`Invalid ${key}`);
      }

      filters[key] = value;
    }
  }

  for (const key of ['limit', 'offset']) {
    if (filterParams[key] != null && filterParams[key] !== '') {
      const value = Number(filterParams[key]);

      if (
        !Number.isSafeInteger(value) ||
        (key === 'limit' ? value <= 0 : value < 0)
      ) {
        throw new Error(`Invalid ${key}`);
      }

      filters[key] = value;
    }
  }

  const bookings = await bookingRepository.searchBookings(filters);

  return bookings.map((booking) => ({
    ...booking,
    check_in_date: formatDate(booking.check_in_date),
    check_out_date: formatDate(booking.check_out_date),
    nights: calculateNights(
      booking.check_in_date,
      booking.check_out_date
    )
  }));
}

const bookingService = {
  createBooking,
  getBookings,
  withTransaction
};

export {
  createBookingSchema,
  validateCreateBooking
};

export default bookingService;
