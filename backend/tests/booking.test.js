/**
 * Unit Tests: Demonstrerer OOP, SOLID og Clean Code
 * Tester Booking Domain Model og BookingService med mockede afhængigheder (Dependency Inversion).
 */

import { Booking } from '../src/models/Booking.js';
import { BookingService } from '../src/services/bookingService.js';
import { ValidationError, ConflictError } from '../errors/AppError.js';
import { BOOKING_STATUS } from '../constants/hotelConstants.js';

describe('Booking Domain Model (OOP & Invariant Validation)', () => {
  test('Beregner korrekt antal overnattede nætter', () => {
    const booking = new Booking({
      guestId: 1,
      roomId: 10,
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-15',
      numGuests: 2,
      totalPriceDkk: 7000
    });

    expect(booking.calculateNights()).toBe(5);
    expect(booking.isActive()).toBe(true);
  });

  test('Afviser ugyldig datoperiode hvor afrejse er før ankomst', () => {
    const booking = new Booking({
      guestId: 1,
      roomId: 10,
      checkInDate: '2026-06-15',
      checkOutDate: '2026-06-10',
      numGuests: 2,
      totalPriceDkk: 7000
    });

    expect(() => booking.validate()).toThrow(ValidationError);
  });

  test('Soft delete aflysning ændrer status til cancelled', () => {
    const booking = new Booking({
      id: 42,
      guestId: 1,
      roomId: 10,
      checkInDate: '2026-06-10',
      checkOutDate: '2026-06-15',
      numGuests: 2,
      totalPriceDkk: 7000,
      status: BOOKING_STATUS.CONFIRMED
    });

    booking.cancel();
    expect(booking.status).toBe(BOOKING_STATUS.CANCELLED);
    expect(booking.isActive()).toBe(false);
  });
});

describe('BookingService (SOLID: Dependency Inversion med Mock Repositories)', () => {
  let mockBookingRepo;
  let mockRoomRepo;
  let service;

  beforeEach(() => {
    // Mock repositories uden behov for en aktiv databaseforbindelse
    mockBookingRepo = {
      searchBookings: jest.fn(),
      getById: jest.fn(),
      findAvailableRoom: jest.fn(),
      createBooking: jest.fn(),
      updateBooking: jest.fn(),
      cancelBooking: jest.fn()
    };

    mockRoomRepo = {
      getAllTypes: jest.fn(),
      getTypeById: jest.fn()
    };

    // Constructor Injection (Dependency Inversion)
    service = new BookingService(mockBookingRepo, mockRoomRepo);
  });

  test('createBooking: Opretter booking og beregner totalpris korrekt', async () => {
    mockRoomRepo.getTypeById.mockResolvedValue({
      id: 3,
      name: 'Standard dobbeltværelse',
      capacity: 2,
      basePriceDkk: 1400.00
    });

    mockBookingRepo.findAvailableRoom.mockResolvedValue(105); // Room #105 ledigt
    mockBookingRepo.createBooking.mockResolvedValue(99); // Created ID 99
    mockBookingRepo.getById.mockResolvedValue(
      new Booking({
        id: 99,
        guestId: 1,
        roomId: 105,
        checkInDate: '2026-06-10',
        checkOutDate: '2026-06-12', // 2 nætter = 2800 DKK
        numGuests: 2,
        totalPriceDkk: 2800.00,
        status: BOOKING_STATUS.CONFIRMED
      })
    );

    const result = await service.createBooking({
      first_name: 'Lars',
      last_name: 'Jensen',
      email: 'lars@example.dk',
      room_type_id: 3,
      num_guests: 2,
      check_in_date: '2026-06-10',
      check_out_date: '2026-06-12'
    });

    expect(result.id).toBe(99);
    expect(result.total_price_dkk).toBe(2800.00);
    expect(mockBookingRepo.createBooking).toHaveBeenCalled();
  });

  test('createBooking: Kaster ConflictError hvis ingen ledige værelser findes', async () => {
    mockRoomRepo.getTypeById.mockResolvedValue({
      id: 3,
      name: 'Standard dobbeltværelse',
      capacity: 2,
      basePriceDkk: 1400.00
    });

    mockBookingRepo.findAvailableRoom.mockResolvedValue(null); // Ingen ledige værelser!

    await expect(service.createBooking({
      first_name: 'Lars',
      last_name: 'Jensen',
      email: 'lars@example.dk',
      room_type_id: 3,
      num_guests: 2,
      check_in_date: '2026-06-10',
      check_out_date: '2026-06-12'
    })).rejects.toThrow(ConflictError);
  });
});
