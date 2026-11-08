import db from '../config/database.js';
import seasonService from './seasonService.js';
import * as bookingRepository from '../repositories/bookingRepository.js';
import * as roomRepository from '../repositories/roomRepository.js';
import { withTransaction as dbWithTransaction } from '../repositories/db.js';
import {
  createBookingSchema,
  validateCreateBooking
} from '../validators/bookingValidator.js';

/**
 * Hjælpefunktion til at afvikle en atomar transaktion med automatisk COMMIT eller ROLLBACK i PostgreSQL.
 * @param {Function} callback - Async funktion der modtager en dedikeret PostgreSQL client
 */
export async function withTransaction(callback) {
  if (typeof db.connect === 'function') {
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
  return await dbWithTransaction(callback);
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
 * Forretningslogik og transaktionsstyring orkestreres her, mens
 * al dataadgang er fuldstændigt uddelegeret til repositories.
 * 
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
    // 1. Håndter Country via repository
    let countryId = null;
    if (country) {
      countryId = await bookingRepository.findOrCreateCountry(country, client);
    }

    // 2. Håndter Costumer via repository
    const customerEmail = String(email).trim();
    const firstName = String(first_name).trim();
    const lastName = String(last_name).trim();
    const phone = phone_number ? String(phone_number).trim() : null;

    const customerId = await bookingRepository.findOrCreateCustomer({
      firstName,
      lastName,
      email: customerEmail,
      phoneNumber: phone,
      countryId
    }, client);

    // 3. Find og lås et ledigt værelse af den ønskede værelsestype i perioden
    // Anvender PostgreSQL FOR UPDATE OF r via repository til at forhindre race conditions
    const assignedRoom = await roomRepository.findAndLockAvailableRoom({
      roomTypeId: room_type_id,
      checkIn: check_in_date,
      checkOut: check_out_date
    }, client);

    if (!assignedRoom) {
      const err = new Error('Der er desværre ingen ledige værelser af denne type i den valgte periode.');
      err.statusCode = 409; // Conflict
      throw err;
    }

    // 4. Bestem sæson og beregn samlet pris ud fra room_price tabellen via repository
    const checkInSeasonCode = seasonService.getSeasonForDate(check_in_date);
    const seasonMap = { mid: 1, low: 2, high: 3 };
    let seasonId = seasonMap[checkInSeasonCode] || 1;
    try {
      const dbSeason = await roomRepository.getSeasonByName(checkInSeasonCode, client);
      if (dbSeason?.id) {
        seasonId = dbSeason.id;
      }
    } catch {
      // fallback til seasonMap
    }

    const priceRow = await roomRepository.getRoomPrice(room_type_id, seasonId, client);
    let calculatedPrice = 0;
    if (priceRow && priceRow.price_pr_night != null) {
      calculatedPrice = Number(priceRow.price_pr_night) * totalNights;
    } else {
      const baseRate = 1200;
      calculatedPrice = baseRate * totalNights;
    }

    // 5. Opret reservation i booking tabellen via repository
    const now = new Date();
    const insertRes = await bookingRepository.insertBooking({
      costumerId: customerId,
      orderDate: now,
      roomId: assignedRoom.id,
      arrival: check_in_date,
      departure: check_out_date,
      seasonId,
      occupants: num_guests,
      price: calculatedPrice,
      status: 'confirmed',
      starRating: 5,
      updatedAt: now
    }, client);

    const bookingId = insertRes?.id;

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

/**
 * Opdaterer en eksisterende booking atomisk i PostgreSQL (PUT /api/bookings/:id)
 * Dataadgang uddelegeret til repositories.
 * 
 * @param {number|string} id - Booking ID
 * @param {Object} data - Opdaterede bookingdata
 */
export async function updateBooking(id, data = {}) {
  const bookingId = Number.parseInt(id, 10);
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
    const err = new Error('Ugyldigt booking ID.');
    err.statusCode = 400;
    throw err;
  }

  return await withTransaction(async (client) => {
    const existing = await bookingRepository.getBookingById(bookingId, { lock: true }, client);

    if (!existing) {
      const err = new Error(`Booking #${bookingId} blev ikke fundet.`);
      err.statusCode = 404;
      throw err;
    }

    const nextCheckIn = data.check_in_date ? formatDate(data.check_in_date) : formatDate(existing.arrival);
    const nextCheckOut = data.check_out_date ? formatDate(data.check_out_date) : formatDate(existing.departure);
    const totalNights = calculateNights(nextCheckIn, nextCheckOut);

    if (!totalNights || totalNights <= 0) {
      const err = new Error('Afrejsedato skal være efter ankomstdato.');
      err.statusCode = 400;
      throw err;
    }

    const nextRoomTypeId = data.room_type_id ? Number(data.room_type_id) : Number(existing.current_room_type_id);
    const nextGuests = data.num_guests ? Number(data.num_guests) : Number(existing.occupants || 1);
    const nextStatus = data.status ? String(data.status).trim() : existing.status;

    // Opdater kundeoplysninger hvis angivet
    let firstName = data.first_name !== undefined ? String(data.first_name).trim() : existing.first_name;
    let lastName = data.last_name !== undefined ? String(data.last_name).trim() : existing.last_name;
    if (!data.first_name && !data.last_name && data.guest_name) {
      const parts = String(data.guest_name).trim().split(/\s+/);
      firstName = parts[0] || existing.first_name;
      lastName = parts.slice(1).join(' ') || existing.last_name;
    }
    const customerEmail = data.email ? String(data.email).trim() : existing.email;
    const customerPhone = (data.phone_number ?? data.phone) !== undefined
      ? String(data.phone_number ?? data.phone).trim()
      : existing.phone_number;

    let countryId = existing.country_id;
    let countryName = data.country ? String(data.country).trim() : null;
    if (countryName) {
      countryId = await bookingRepository.findOrCreateCountry(countryName, client);
    }

    await bookingRepository.updateCustomer(existing.costumer_id, {
      firstName,
      lastName,
      email: customerEmail,
      phoneNumber: customerPhone,
      countryId
    }, client);

    // Tjek om værelset skal genallokeres (ved skift af værelsestype eller datointerval)
    let assignedRoomId = existing.room_id;
    let assignedRoomNumber = existing.current_room_number;
    let assignedRoomTypeName = data.room_type_name || null;

    const datesChanged =
      nextCheckIn !== formatDate(existing.arrival) ||
      nextCheckOut !== formatDate(existing.departure);
    const roomTypeChanged = nextRoomTypeId !== Number(existing.current_room_type_id);

    if ((datesChanged || roomTypeChanged) && nextStatus !== 'cancelled') {
      const availableRoom = await roomRepository.findAndLockAvailableRoom({
        roomTypeId: nextRoomTypeId,
        checkIn: nextCheckIn,
        checkOut: nextCheckOut,
        excludeBookingId: bookingId,
        preferRoomId: existing.room_id
      }, client);

      if (!availableRoom) {
        const err = new Error('Der er desværre ingen ledige værelser af denne type i den valgte periode.');
        err.statusCode = 409;
        throw err;
      }

      assignedRoomId = availableRoom.id;
      assignedRoomNumber = availableRoom.name;
      assignedRoomTypeName = availableRoom.room_type_name;
    }

    // Beregn pris hvis ikke eksplicit sendt eller hvis datoer/værelsestype er ændret
    let nextPrice = data.total_price !== undefined ? Number(data.total_price) : Number(existing.price);
    if (datesChanged || roomTypeChanged || Number.isNaN(nextPrice)) {
      const checkInSeasonCode = seasonService.getSeasonForDate(nextCheckIn);
      const seasonMap = { mid: 1, low: 2, high: 3 };
      const seasonId = seasonMap[checkInSeasonCode] || existing.season_id || 1;
      const priceRow = await roomRepository.getRoomPrice(nextRoomTypeId, seasonId, client);
      if (priceRow && priceRow.price_pr_night != null) {
        nextPrice = Number(priceRow.price_pr_night) * totalNights;
      } else if (data.total_price !== undefined && !Number.isNaN(Number(data.total_price))) {
        nextPrice = Number(data.total_price);
      }
    }

    const now = new Date();
    await bookingRepository.updateBooking(bookingId, {
      roomId: assignedRoomId,
      arrival: nextCheckIn,
      departure: nextCheckOut,
      occupants: nextGuests,
      price: nextPrice,
      status: nextStatus,
      updatedAt: now
    }, client);

    return {
      id: bookingId,
      costumer_id: existing.costumer_id,
      guest_id: existing.costumer_id,
      first_name: firstName,
      last_name: lastName,
      guest_name: `${firstName} ${lastName}`.trim(),
      email: customerEmail,
      phone: customerPhone,
      phone_number: customerPhone,
      country: countryName || data.country || null,
      country_id: countryId,
      room_id: assignedRoomId,
      room_number: assignedRoomNumber,
      room_type_id: nextRoomTypeId,
      room_type_name: assignedRoomTypeName,
      check_in_date: nextCheckIn,
      check_out_date: nextCheckOut,
      arrival: nextCheckIn,
      departure: nextCheckOut,
      num_guests: nextGuests,
      occupants: nextGuests,
      total_price: nextPrice,
      price: nextPrice,
      status: nextStatus,
      nights: totalNights,
      total_nights: totalNights,
      created_at: existing.order_date,
      updated_at: now
    };
  });
}

/**
 * Aflyser en booking atomisk via bookingRepository (DELETE /api/bookings/:id)
 * @param {number|string} id - Booking ID
 */
export async function cancelBooking(id) {
  const bookingId = Number.parseInt(id, 10);
  if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
    const err = new Error('Ugyldigt booking ID.');
    err.statusCode = 400;
    throw err;
  }

  return await withTransaction(async (client) => {
    const row = await bookingRepository.cancelBooking(bookingId, client);

    if (!row) {
      const err = new Error(`Booking #${bookingId} blev ikke fundet.`);
      err.statusCode = 404;
      throw err;
    }

    return {
      id: row.id,
      costumer_id: row.costumer_id,
      room_id: row.room_id,
      check_in_date: formatDate(row.arrival),
      check_out_date: formatDate(row.departure),
      num_guests: row.occupants,
      total_price: row.price,
      status: 'cancelled',
      created_at: row.order_date,
      updated_at: row.updated_at
    };
  });
}

const bookingService = {
  createBooking,
  getBookings,
  updateBooking,
  cancelBooking,
  withTransaction
};

export {
  createBookingSchema,
  validateCreateBooking
};

export default bookingService;
