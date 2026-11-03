/**
 * Business Logic Layer: BookingService (SH-24 / T024)
 * Håndterer forretningsregler, datovalidering, kapacitetskontrol og prisgenberegning ved bookingændringer.
 * Overholder 3-lagsarkitekturen samt OOP og SOLID (Constructor Dependency Injection).
 */

import { z } from 'zod';
import bookingRepository, { ROOM_TYPE_BASE_PRICES_DKK } from '../repositories/bookingRepository.js';

export const MIN_GUESTS_PER_ROOM = 1;
export const MAX_GUESTS_PER_ROOM = 4;
export const ALLOWED_BOOKING_STATUSES = [
  'confirmed',
  'checked_in',
  'checked_out',
  'completed',
  'cancelled'
];

/**
 * Struktureret hierarki af typede applikationsfejl (Constitution Princip VII).
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.status = statusCode;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ValidationError extends AppError {
  constructor(message, code = 'VALIDATION_ERROR') {
    super(message, 400, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message, code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

export class ConflictError extends AppError {
  constructor(message, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

function createAppError(message, statusCode = 400, code = 'VALIDATION_ERROR') {
  if (statusCode === 404) return new NotFoundError(message, code);
  if (statusCode === 409) return new ConflictError(message, code);
  if (statusCode === 400) return new ValidationError(message, code);
  return new AppError(message, statusCode, code);
}

function parsePositiveInt(val) {
  if (typeof val === 'number') {
    return Number.isInteger(val) && val > 0 ? val : NaN;
  }
  if (typeof val === 'string' && /^\d+$/.test(val.trim())) {
    const parsed = Number(val.trim());
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : NaN;
  }
  return NaN;
}

function parseUtcDate(dateStr) {
  if (!dateStr) return NaN;
  const match = String(dateStr).substring(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return NaN;
    }
    const utcMs = Date.UTC(year, month - 1, day);
    const checkDate = new Date(utcMs);
    if (
      checkDate.getUTCFullYear() !== year ||
      checkDate.getUTCMonth() + 1 !== month ||
      checkDate.getUTCDate() !== day
    ) {
      return NaN;
    }
    return utcMs;
  }
  const d = new Date(dateStr);
  return d.getTime();
}

export function calculateNightsBetween(checkInDate, checkOutDate) {
  const startMs = parseUtcDate(checkInDate);
  const endMs = parseUtcDate(checkOutDate);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return 0;
  }
  const diffMs = endMs - startMs;
  if (diffMs <= 0) return 0;
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Zod-skema til validering af bookingopdateringer (jf. plan.md & Constitution VII).
 */
export const updateBookingSchema = z
  .object({
    guest_name: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    country: z.string().nullable().optional(),
    room_type_id: z.union([z.number(), z.string()]).optional(),
    room_number: z.union([z.number(), z.string()]).nullable().optional(),
    check_in_date: z.string().optional(),
    check_out_date: z.string().optional(),
    num_guests: z.union([z.number(), z.string()]).optional(),
    total_price: z.union([z.number(), z.string()]).optional(),
    total_price_dkk: z.union([z.number(), z.string()]).optional(),
    status: z.enum(ALLOWED_BOOKING_STATUSES).optional(),
    satisfaction_rating: z.union([z.number(), z.string()]).nullable().optional()
  })
  .passthrough();

export class BookingService {
  constructor(repository = bookingRepository) {
    this.bookingRepository = repository;
  }

  /**
   * Henter og filtrerer bookinger.
   * Validerer status- og datointervalfiltre i booking-listen.
   * @param {object} [filters]
   * @returns {Promise<Array<object>>}
   */
  async getBookings(filters = {}) {
    if (filters && typeof filters === 'object') {
      const status = filters.status !== undefined && filters.status !== null
        ? String(filters.status).trim()
        : '';
      if (status && !ALLOWED_BOOKING_STATUSES.includes(status)) {
        throw createAppError(
          `Ugyldig bookingstatus '${status}'. Tilladte værdier: ${ALLOWED_BOOKING_STATUSES.join(', ')}.`,
          400,
          'INVALID_STATUS'
        );
      }

      const fromDate = filters.from !== undefined && filters.from !== null
        ? String(filters.from).trim()
        : '';
      const toDate = filters.to !== undefined && filters.to !== null
        ? String(filters.to).trim()
        : '';

      const isIsoDateString = (str) => /^\d{4}-\d{2}-\d{2}$/.test(str);

      if (fromDate && (!isIsoDateString(fromDate) || Number.isNaN(parseUtcDate(fromDate)))) {
        throw createAppError(
          'Ugyldigt datoformat for fra-dato (forventet YYYY-MM-DD).',
          400,
          'INVALID_DATE_FILTER'
        );
      }
      if (toDate && (!isIsoDateString(toDate) || Number.isNaN(parseUtcDate(toDate)))) {
        throw createAppError(
          'Ugyldigt datoformat for til-dato (forventet YYYY-MM-DD).',
          400,
          'INVALID_DATE_FILTER'
        );
      }
      if (fromDate && toDate && parseUtcDate(fromDate) > parseUtcDate(toDate)) {
        throw createAppError(
          'Fra-dato må ikke være efter til-dato i booking-listens datointerval.',
          400,
          'INVALID_DATE_RANGE'
        );
      }
    }

    return await this.bookingRepository.searchBookings(filters);
  }

  /**
   * Henter de 8 officielle værelsestyper.
   * @returns {Promise<Array<object>>}
   */
  async getRoomTypes() {
    return await this.bookingRepository.getAllRoomTypes();
  }

  /**
   * Henter en specifik booking ud fra ID eller kaster 404.
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  async getBookingById(id) {
    const parsedId = parsePositiveInt(id);
    if (Number.isNaN(parsedId)) {
      throw createAppError('Ugyldigt booking-ID.', 400, 'INVALID_BOOKING_ID');
    }

    const booking = await this.bookingRepository.getById(parsedId);
    if (!booking) {
      throw createAppError(`Booking #${parsedId} blev ikke fundet.`, 404, 'NOT_FOUND');
    }
    return booking;
  }

  /**
   * Validerer og opdaterer en eksisterende booking (SH-24 / T024).
   * - Returnerer 404 hvis reservationen ikke eksisterer
   * - Afviser redigering af en 'cancelled' reservation (medmindre den eksplicit genaktiveres)
   * - Validerer at check_out_date > check_in_date
   * - Validerer gæsteantal (1..4 samt værelsestens kapacitet)
   * - Genberegner automatisk totalpris hvis antal overnatninger eller værelsestype ændres
   * @param {number|string} id
   * @param {object} input
   * @returns {Promise<object>}
   */
  async updateBooking(id, input = {}) {
    const parsedId = parsePositiveInt(id);
    if (Number.isNaN(parsedId)) {
      throw createAppError('Ugyldigt booking-ID.', 400, 'INVALID_BOOKING_ID');
    }

    // 1. Valider at reservationen eksisterer (404 hvis den ikke findes)
    const existing = await this.bookingRepository.getById(parsedId);
    if (!existing) {
      throw createAppError(`Booking #${parsedId} blev ikke fundet.`, 404, 'NOT_FOUND');
    }

    // 2. Valider status og skema (inkl. Zod-kontrol)
    const zodResult = updateBookingSchema.safeParse(input);
    if (!zodResult.success) {
      const firstIssue = zodResult.error.issues[0];
      if (firstIssue?.path?.[0] === 'status') {
        throw createAppError(
          `Ugyldig bookingstatus '${input.status}'. Tilladte værdier: ${ALLOWED_BOOKING_STATUSES.join(', ')}.`,
          400,
          'INVALID_STATUS'
        );
      }
      throw createAppError(
        firstIssue?.message || 'Ugyldigt inputformat for bookingopdatering.',
        400,
        'VALIDATION_ERROR'
      );
    }

    const requestedStatus = input.status || existing.status;

    const isReactivating =
      existing.status === 'cancelled' &&
      input.status &&
      input.status !== 'cancelled';

    if (existing.status === 'cancelled' && !isReactivating) {
      throw createAppError(
        'En annulleret reservation kan ikke redigeres uden samtidig genaktivering af status.',
        400,
        'BOOKING_CANCELLED'
      );
    }

    // 2b. Valider gæstenavn og e-mailformat hvis angivet
    if (
      input.guest_name !== undefined &&
      input.first_name === undefined &&
      input.last_name === undefined &&
      String(input.guest_name).trim() === ''
    ) {
      throw createAppError('Gæstens navn må ikke være tomt.', 400, 'INVALID_GUEST_NAME');
    }

    if (
      input.email !== undefined &&
      input.email !== null &&
      String(input.email).trim() !== '' &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email).trim())
    ) {
      throw createAppError('Indtast en gyldig e-mailadresse.', 400, 'INVALID_EMAIL');
    }

    // 3. Dato-validering (check_out_date > check_in_date)
    const nextCheckIn = input.check_in_date || existing.check_in_date;
    const nextCheckOut = input.check_out_date || existing.check_out_date;
    const nights = calculateNightsBetween(nextCheckIn, nextCheckOut);

    if (nights <= 0) {
      throw createAppError(
        'Afrejsedato skal være strengt efter ankomstdato (check_out_date > check_in_date).',
        400,
        'INVALID_DATE_RANGE'
      );
    }

    // 4. Valider værelsestype, værelsesnummer og gæsteantal (1-4 og maks. kapacitet på værelsestypen)
    const nextRoomTypeId =
      input.room_type_id !== undefined
        ? parsePositiveInt(input.room_type_id)
        : Number(existing.room_type_id);

    if (Number.isNaN(nextRoomTypeId)) {
      throw createAppError('Ugyldig værelsestype angivet.', 400, 'INVALID_ROOM_TYPE');
    }

    const roomType = await this.bookingRepository.getRoomTypeById(nextRoomTypeId);
    if (!roomType) {
      throw createAppError(
        `Værelsestype med ID ${nextRoomTypeId} findes ikke.`,
        400,
        'ROOM_TYPE_NOT_FOUND'
      );
    }

    let nextRoomNumber = existing.room_number;
    if (input.room_number !== undefined && input.room_number !== null && input.room_number !== '') {
      const parsedRoomNumber = parsePositiveInt(input.room_number);
      if (Number.isNaN(parsedRoomNumber)) {
        throw createAppError('Ugyldigt værelsesnummer angivet.', 400, 'INVALID_ROOM_NUMBER');
      }
      nextRoomNumber = parsedRoomNumber;
    }

    const nextNumGuests =
      input.num_guests !== undefined
        ? parsePositiveInt(input.num_guests)
        : Number(existing.num_guests);

    if (
      Number.isNaN(nextNumGuests) ||
      nextNumGuests < MIN_GUESTS_PER_ROOM ||
      nextNumGuests > MAX_GUESTS_PER_ROOM
    ) {
      throw createAppError(
        `Antal gæster skal være mellem ${MIN_GUESTS_PER_ROOM} og ${MAX_GUESTS_PER_ROOM}.`,
        400,
        'INVALID_GUEST_COUNT'
      );
    }

    if (nextNumGuests > Number(roomType.capacity)) {
      throw createAppError(
        `Værelsestypen '${roomType.name}' tillader maksimalt ${roomType.capacity} gæst(er).`,
        400,
        'CAPACITY_EXCEEDED'
      );
    }

    // 5. Genberegn totalpris hvis antallet af overnatninger eller værelsestypen ændres
    const existingNights = calculateNightsBetween(existing.check_in_date, existing.check_out_date);
    const datesOrNightsChanged =
      nextCheckIn !== existing.check_in_date ||
      nextCheckOut !== existing.check_out_date ||
      nights !== existingNights;
    const roomTypeChanged = nextRoomTypeId !== Number(existing.room_type_id);

    let nextTotalPrice = Number(existing.total_price);

    if (input.total_price !== undefined || input.total_price_dkk !== undefined) {
      const explicitPrice = Number(input.total_price ?? input.total_price_dkk);
      if (Number.isNaN(explicitPrice) || explicitPrice < 0) {
        throw createAppError('Totalpris skal være et ikke-negativt beløb.', 400, 'INVALID_PRICE');
      }
      nextTotalPrice = explicitPrice;
    } else if (datesOrNightsChanged || roomTypeChanged) {
      // Hvis kun datoer ændres på samme værelsestype, bevares eksisterende dagspris hvis gyldig;
      // hvis værelsestypen skiftes, anvendes den nye værelsestypes basispris pr. nat.
      const baseRateForType =
        ROOM_TYPE_BASE_PRICES_DKK[nextRoomTypeId] || roomType.base_price_dkk || 1500;
      const existingNightlyRate =
        !roomTypeChanged && existingNights > 0 && Number(existing.total_price) > 0
          ? Number(existing.total_price) / existingNights
          : baseRateForType;

      nextTotalPrice = Math.round(nights * existingNightlyRate * 100) / 100;
    }

    // 6. Valider eventuel kundetilfredshedsrating (1-5)
    let nextSatisfactionRating = existing.satisfaction_rating;
    if (input.satisfaction_rating !== undefined) {
      if (input.satisfaction_rating === null || input.satisfaction_rating === '') {
        nextSatisfactionRating = null;
      } else {
        const rating = parsePositiveInt(input.satisfaction_rating);
        if (Number.isNaN(rating) || rating < 1 || rating > 5) {
          throw createAppError(
            'Kundetilfredshedsscore skal være mellem 1 og 5 stjerner.',
            400,
            'INVALID_SATISFACTION_RATING'
          );
        }
        nextSatisfactionRating = rating;
      }
    }

    const updatePayload = {
      room_type_id: nextRoomTypeId,
      room_number:
        input.room_number !== undefined && input.room_number !== null && input.room_number !== ''
          ? nextRoomNumber
          : undefined,
      check_in_date: nextCheckIn,
      check_out_date: nextCheckOut,
      num_guests: nextNumGuests,
      total_price: nextTotalPrice,
      status: requestedStatus,
      satisfaction_rating: nextSatisfactionRating,
      guestData: {
        guest_name: input.guest_name,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email,
        phone: input.phone,
        country: input.country
      }
    };

    return await this.bookingRepository.updateBooking(parsedId, updatePayload);
  }

  /**
   * Aflyser en eksisterende booking via soft delete til status 'cancelled' (SH-29 / T029).
   * - Returnerer 404 hvis booking-ID ikke findes
   * - Håndterer allerede annullerede bookinger idempotent uden fejl
   * @param {number|string} id
   * @returns {Promise<object>}
   */
  async cancelBooking(id) {
    const parsedId = parsePositiveInt(id);
    if (Number.isNaN(parsedId)) {
      throw createAppError('Ugyldigt booking-ID.', 400, 'INVALID_BOOKING_ID');
    }

    const existing = await this.bookingRepository.getById(parsedId);
    if (!existing) {
      throw createAppError(`Booking #${parsedId} blev ikke fundet.`, 404, 'NOT_FOUND');
    }

    if (existing.status === 'cancelled') {
      return {
        ...existing,
        message: 'Reservationen er allerede annulleret.'
      };
    }

    const cancelledBooking = await this.bookingRepository.cancelBooking(parsedId);
    return {
      ...cancelledBooking,
      message: 'Reservationen blev annulleret (soft delete).'
    };
  }
}

export default new BookingService();
