import db from '../config/database.js';
import seasonService from './seasonService.js';
import * as bookingRepository from '../repositories/bookingRepository.js';
import {
  createBookingSchema,
  validateCreateBooking
} from '../validators/bookingValidator.js';

/**
 * Hjælpefunktion til at afvikle en atomar transaktion med automatisk COMMIT eller ROLLBACK i PostgreSQL.
 * @param {Function} callback - Async funktion der modtager en dedikeret PostgreSQL client
 */
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

/**
 * Opretter en ny booking atomisk i PostgreSQL (T018)
 * @param {Object} data - Validerede bookingdata
 */
export async function createBooking(data) {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    country, // ID eller navn
    room_type_id,
    num_guests,
    check_in_date,
    check_out_date
  } = data;

  const nightsAllocation = seasonService.calculateNightsBySeason(check_in_date, check_out_date);
  const totalNights = nightsAllocation?.totalNights ?? calculateNights(check_in_date, check_out_date);

  if (!totalNights || totalNights <= 0) {
    const error = new Error('Afrejsedato skal være efter ankomstdato.');
    error.statusCode = 400;
    throw error;
  }

  return await withTransaction(async (client) => {
    // 1. Håndter Country (Find eksisterende eller opret nyt med PostgreSQL RETURNING)
    let countryId = null;
    if (typeof country === 'number') {
      countryId = country;
    } else if (country) {
      const countryName = String(country).trim();
      const countryRes = await client.query(
        `SELECT id FROM country WHERE LOWER(name) = LOWER($1)`,
        [countryName]
      );
      if (countryRes.rows && countryRes.rows.length > 0) {
        countryId = countryRes.rows[0].id;
      } else {
        const newCountryRes = await client.query(
          `INSERT INTO country (name) VALUES ($1) RETURNING id`,
          [countryName]
        );
        countryId = newCountryRes.rows?.[0]?.id ?? null;
      }
    }

    // 2. Håndter Costumer (Find på email i costumer-tabellen eller opret ny med RETURNING id)
    let customerId;
    const customerEmail = String(email).trim();
    const firstName = String(first_name).trim();
    const lastName = String(last_name).trim();
    const phone = phone_number ? String(phone_number).trim() : null;

    const existingCustomerRes = await client.query(
      `SELECT id FROM costumer WHERE LOWER(email) = LOWER($1)`,
      [customerEmail]
    );

    if (existingCustomerRes.rows && existingCustomerRes.rows.length > 0) {
      customerId = existingCustomerRes.rows[0].id;
      await client.query(
        `UPDATE costumer 
         SET first_name = $1, last_name = $2, phone_number = COALESCE($3, phone_number), country_id = COALESCE($4, country_id)
         WHERE id = $5`,
        [firstName, lastName, phone, countryId, customerId]
      );
    } else {
      const newCustRes = await client.query(
        `INSERT INTO costumer (first_name, last_name, email, phone_number, country_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [firstName, lastName, customerEmail, phone, countryId]
      );
      customerId = newCustRes.rows?.[0]?.id;
    }

    // 3. Find og lås et ledigt værelse af den ønskede værelsestype i perioden
    // Værelset må IKKE have overlappende bookinger (hvor status != 'cancelled')
    // Anvender PostgreSQL FOR UPDATE OF r til at forhindre race conditions
    const availableRoomRes = await client.query(
      `SELECT r.id, r.name, rt.name AS room_type_name
       FROM room r
       JOIN room_type rt ON r.room_type_id = rt.id
       WHERE r.room_type_id = $1
         AND r.id NOT IN (
           SELECT b.room_id
           FROM booking b
           WHERE b.status NOT IN ('cancelled', 'canceled')
             AND b.arrival < $3::timestamp
             AND b.departure > $2::timestamp
         )
       ORDER BY r.id ASC
       LIMIT 1
       FOR UPDATE OF r`,
      [room_type_id, check_in_date, check_out_date]
    );

    if (!availableRoomRes.rows || availableRoomRes.rows.length === 0) {
      const err = new Error('Der er desværre ingen ledige værelser af denne type i den valgte periode.');
      err.statusCode = 409; // Conflict
      throw err;
    }

    const assignedRoom = availableRoomRes.rows[0];

    // 4. Bestem sæson og beregn samlet pris ud fra room_price tabellen
    const checkInSeasonCode = seasonService.getSeasonForDate(check_in_date);
    const seasonMap = { mid: 1, low: 2, high: 3 };
    let seasonId = seasonMap[checkInSeasonCode] || 1;
    try {
      const seasonRes = await client.query(
        `SELECT id FROM season WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [checkInSeasonCode]
      );
      if (seasonRes.rows && seasonRes.rows.length > 0) {
        seasonId = seasonRes.rows[0].id;
      }
    } catch {
      // fallback til seasonMap
    }

    // Hent dagspris fra PostgreSQL room_price tabellen
    const priceRes = await client.query(
      `SELECT price_pr_night FROM room_price WHERE room_type_id = $1 AND season_id = $2`,
      [room_type_id, seasonId]
    );

    let calculatedPrice = 0;
    if (priceRes.rows && priceRes.rows.length > 0) {
      calculatedPrice = Number(priceRes.rows[0].price_pr_night) * totalNights;
    } else {
      const baseRate = 1200;
      calculatedPrice = baseRate * totalNights;
    }

    // 5. Opret reservation i booking tabellen ved hjælp af PostgreSQL RETURNING
    const now = new Date();
    const insertBookingRes = await client.query(
      `INSERT INTO booking (
         costumer_id, order_date, room_id, arrival, departure, 
         season_id, occupants, price, status, star_rating, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, order_date`,
      [
        customerId,
        now,
        assignedRoom.id,
        check_in_date,
        check_out_date,
        seasonId,
        num_guests,
        calculatedPrice,
        'confirmed',
        5, // Standard rating
        now,
      ]
    );

    const bookingId = insertBookingRes.rows?.[0]?.id;

    // Returner det fulde booking-objekt tilpasset API og frontend
    return {
      id: bookingId,
      costumer_id: customerId,
      customer_id: customerId,
      guest_id: customerId,
      customer_name: `${firstName} ${lastName}`,
      customer_email: customerEmail,
      room: {
        id: assignedRoom.id,
        name: assignedRoom.name,
        room_number: assignedRoom.name,
        room_type_id,
        room_type_name: assignedRoom.room_type_name
      },
      arrival: check_in_date,
      departure: check_out_date,
      check_in_date,
      check_out_date,
      total_nights: totalNights,
      nights: totalNights,
      occupants: num_guests,
      num_guests,
      price: calculatedPrice,
      total_price: calculatedPrice,
      status: 'confirmed',
      created_at: now
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
