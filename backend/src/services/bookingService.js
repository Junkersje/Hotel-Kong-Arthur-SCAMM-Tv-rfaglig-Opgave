/**
 * Business Logic Layer: BookingService (OOP Class)
 * SOLID: Single Responsibility, Dependency Inversion (Constructor Injection)
 */

import defaultBookingRepo from '../repositories/bookingRepository.js';
import defaultRoomRepo from '../repositories/roomRepository.js';
import { Booking } from '../models/Booking.js';
import { Guest } from '../models/Guest.js';
import { ValidationError, NotFoundError, ConflictError } from '../errors/AppError.js';
import { MIN_GUESTS_PER_ROOM, MAX_GUESTS_PER_ROOM, BOOKING_STATUS } from '../constants/hotelConstants.js';

export class BookingService {
  /**
   * Constructor Dependency Injection
   * @param {BookingRepository} bookingRepo
   * @param {RoomRepository} roomRepo
   */
  constructor(bookingRepo = defaultBookingRepo, roomRepo = defaultRoomRepo) {
    this.bookingRepo = bookingRepo;
    this.roomRepo = roomRepo;
  }

  /**
   * Henter alle 8 officielle værelsestyper.
   */
  async getRoomTypes() {
    return await this.roomRepo.getAllTypes();
  }

  /**
   * Henter alle bookinger med filtrering.
   * @param {object} filters
   */
  async getBookings(filters) {
    const bookings = await this.bookingRepo.searchBookings(filters);
    return bookings.map(b => b.toJSON());
  }

  /**
   * Henter en specifik booking.
   * @param {number} id
   */
  async getBookingById(id) {
    const booking = await this.bookingRepo.getById(id);
    if (!booking) {
      throw new NotFoundError(`Booking #${id} blev ikke fundet.`);
    }
    return booking.toJSON();
  }

  /**
   * Opretter en ny booking med forretningsvalidering og tildeling af ledigt værelse.
   * @param {object} input
   */
  async createBooking(input) {
    // 1. Validering af input
    this._validateBookingPayload(input);

    const checkIn = input.check_in_date;
    const checkOut = input.check_out_date;
    const roomTypeId = parseInt(input.room_type_id, 10);
    const numGuests = parseInt(input.num_guests, 10);

    // 2. Verificer at værelsestypen findes og kan rumme gæsterne
    const roomType = await this.roomRepo.getTypeById(roomTypeId);
    if (!roomType) {
      throw new ValidationError(`Ugyldig værelsestype ID: ${roomTypeId}`);
    }

    if (numGuests > roomType.capacity) {
      throw new ValidationError(
        `Den valgte værelsestype '${roomType.name}' kan maksimalt rumme ${roomType.capacity} gæst(er). Du har valgt ${numGuests}.`
      );
    }

    // 3. Find ledigt værelse (forhindrer overbooking)
    const availableRoomId = await this.bookingRepo.findAvailableRoom(roomTypeId, checkIn, checkOut);
    if (!availableRoomId) {
      throw new ConflictError(
        `Der er desværre ingen ledige værelser af typen '${roomType.name}' i den valgte periode (${checkIn} til ${checkOut}).`
      );
    }

    // 4. Beregn totalpris
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPriceDkk = nights * roomType.basePriceDkk;

    // 5. Opret gæst og booking
    const guestData = {
      firstName: input.first_name,
      lastName: input.last_name,
      email: input.email,
      phone: input.phone || null,
      country: input.country || null
    };

    const bookingData = {
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numGuests,
      totalPriceDkk,
      status: BOOKING_STATUS.CONFIRMED
    };

    const createdId = await this.bookingRepo.createBooking({
      guestData,
      bookingData,
      roomId: availableRoomId
    });

    const created = await this.bookingRepo.getById(createdId);
    return created ? created.toJSON() : { id: createdId };
  }

  /**
   * Opdaterer en eksisterende booking.
   * @param {number} id
   * @param {object} input
   */
  async updateBooking(id, input) {
    const existing = await this.bookingRepo.getById(id);
    if (!existing) {
      throw new NotFoundError(`Booking #${id} blev ikke fundet.`);
    }

    if (existing.status === BOOKING_STATUS.CANCELLED) {
      throw new ValidationError('En annulleret reservation kan ikke redigeres.');
    }

    const checkIn = input.check_in_date || existing.checkInDate;
    const checkOut = input.check_out_date || existing.checkOutDate;
    const roomTypeId = input.room_type_id ? parseInt(input.room_type_id, 10) : existing.room.roomTypeId;
    const numGuests = input.num_guests !== undefined ? parseInt(input.num_guests, 10) : existing.numGuests;

    // Dato-validering
    if (new Date(checkOut) <= new Date(checkIn)) {
      throw new ValidationError('Afrejsedato skal være efter ankomstdato.');
    }

    // Værelsestype og kapacitet
    const roomType = await this.roomRepo.getTypeById(roomTypeId);
    if (!roomType) {
      throw new ValidationError(`Ugyldig værelsestype ID: ${roomTypeId}`);
    }

    if (numGuests > roomType.capacity) {
      throw new ValidationError(
        `Værelsestypen '${roomType.name}' kan maksimalt rumme ${roomType.capacity} gæster.`
      );
    }

    // Tjek om der er ledigt værelse hvis datoer eller værelsestype ændres
    let targetRoomId = existing.roomId;
    if (checkIn !== existing.checkInDate || checkOut !== existing.checkOutDate || roomTypeId !== existing.room.roomTypeId) {
      targetRoomId = await this.bookingRepo.findAvailableRoom(roomTypeId, checkIn, checkOut, id);
      if (!targetRoomId) {
        throw new ConflictError(`Ingen ledige værelser af typen '${roomType.name}' i den nye periode.`);
      }
    }

    // Beregn ny totalpris
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const nights = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const totalPriceDkk = nights * roomType.basePriceDkk;

    const updateData = {
      roomId: targetRoomId,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numGuests,
      totalPriceDkk,
      status: input.status || existing.status,
      guestData: {
        firstName: input.first_name || existing.guest.firstName,
        lastName: input.last_name || existing.guest.lastName,
        email: input.email || existing.guest.email,
        phone: input.phone !== undefined ? input.phone : existing.guest.phone,
        country: input.country !== undefined ? input.country : existing.guest.country
      }
    };

    await this.bookingRepo.updateBooking(id, updateData);
    const updated = await this.bookingRepo.getById(id);
    return updated.toJSON();
  }

  /**
   * Aflyser en booking via soft-delete.
   * @param {number} id
   */
  async cancelBooking(id) {
    const existing = await this.bookingRepo.getById(id);
    if (!existing) {
      throw new NotFoundError(`Booking #${id} blev ikke fundet.`);
    }

    if (existing.status === BOOKING_STATUS.CANCELLED) {
      return { message: 'Bookingen er allerede annulleret', id, status: BOOKING_STATUS.CANCELLED };
    }

    await this.bookingRepo.cancelBooking(id);
    return { message: 'Booking annulleret succesfuldt', id, status: BOOKING_STATUS.CANCELLED };
  }

  _validateBookingPayload(input) {
    if (!input.first_name || !input.first_name.trim()) {
      throw new ValidationError('Gæstens fornavn er påkrævet.');
    }
    if (!input.last_name || !input.last_name.trim()) {
      throw new ValidationError('Gæstens efternavn er påkrævet.');
    }
    if (!input.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new ValidationError('Indtast en gyldig e-mailadresse.');
    }
    if (!input.check_in_date || !input.check_out_date) {
      throw new ValidationError('Både ankomstdato og afrejsedato er påkrævet.');
    }
    if (new Date(input.check_out_date) <= new Date(input.check_in_date)) {
      throw new ValidationError('Afrejsedato skal være strengt efter ankomstdato.');
    }
    const guests = parseInt(input.num_guests, 10);
    if (isNaN(guests) || guests < MIN_GUESTS_PER_ROOM || guests > MAX_GUESTS_PER_ROOM) {
      throw new ValidationError(`Antal gæster skal være mellem ${MIN_GUESTS_PER_ROOM} og ${MAX_GUESTS_PER_ROOM}.`);
    }
    if (!input.room_type_id) {
      throw new ValidationError('Vælg venligst en værelsestype.');
    }
  }
}

export default new BookingService();
