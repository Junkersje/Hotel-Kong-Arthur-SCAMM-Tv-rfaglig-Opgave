/**
 * Business Logic Layer: BookingService (SH-24 / T024)
 * Håndterer forretningsregler, datovalidering, kapacitetskontrol og prisgenberegning ved bookingændringer.
 * Overholder 3-lagsarkitekturen samt OOP og SOLID (Constructor Dependency Injection).
 */

import bookingRepository, { ROOM_TYPE_BASE_PRICES_DKK } from '../repositories/bookingRepository.js';

export const MIN_GUESTS_PER_ROOM = 1;
export const MAX_GUESTS_PER_ROOM = 4;
export const ALLOWED_BOOKING_STATUSES = ['confirmed', 'checked_in', 'checked_out', 'cancelled'];

function createAppError(message, statusCode = 400, code = 'VALIDATION_ERROR') {
  const error = new Error(message);
  error.status = statusCode;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function calculateNightsBetween(checkInDate, checkOutDate) {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export class BookingService {
  constructor(repository = bookingRepository) {
    this.bookingRepository = repository;
  }

  /**
   * Henter og filtrerer bookinger.
   * @param {object} [filters]
   * @returns {Promise<Array<object>>}
   */
  async getBookings(filters = {}) {
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
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
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
    const parsedId = parseInt(id, 10);
    if (Number.isNaN(parsedId) || parsedId <= 0) {
      throw createAppError('Ugyldigt booking-ID.', 400, 'INVALID_BOOKING_ID');
    }

    // 1. Valider at reservationen eksisterer (404 hvis den ikke findes)
    const existing = await this.bookingRepository.getById(parsedId);
    if (!existing) {
      throw createAppError(`Booking #${parsedId} blev ikke fundet.`, 404, 'NOT_FOUND');
    }

    // 2. Valider at nuværende status tillader redigering
    const requestedStatus = input.status || existing.status;
    if (!ALLOWED_BOOKING_STATUSES.includes(requestedStatus)) {
      throw createAppError(
        `Ugyldig bookingstatus '${requestedStatus}'. Tilladte værdier: ${ALLOWED_BOOKING_STATUSES.join(', ')}.`,
        400,
        'INVALID_STATUS'
      );
    }

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

    // 4. Valider værelsestype og gæsteantal (1-4 og maks. kapacitet på værelsestypen)
    const nextRoomTypeId =
      input.room_type_id !== undefined
        ? parseInt(input.room_type_id, 10)
        : Number(existing.room_type_id);

    if (Number.isNaN(nextRoomTypeId) || nextRoomTypeId <= 0) {
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

    const nextNumGuests =
      input.num_guests !== undefined
        ? parseInt(input.num_guests, 10)
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
        const rating = parseInt(input.satisfaction_rating, 10);
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
      room_number: input.room_number !== undefined ? input.room_number : existing.room_number,
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
}

export default new BookingService();
