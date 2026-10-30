/**
 * OOP Domain Model: Booking
 * Indkapsler reservationens tilstand, forretningsregler og beregninger.
 */

import { BOOKING_STATUS, MIN_GUESTS_PER_ROOM, MAX_GUESTS_PER_ROOM } from '../constants/hotelConstants.js';
import { ValidationError } from '../errors/AppError.js';

export class Booking {
  constructor({
    id = null,
    guestId,
    roomId,
    checkInDate,
    checkOutDate,
    numGuests = 1,
    totalPriceDkk,
    status = BOOKING_STATUS.CONFIRMED,
    satisfactionScore = null,
    createdAt = null,
    updatedAt = null,
    guest = null,
    room = null
  }) {
    this.id = id;
    this.guestId = guestId;
    this.roomId = roomId;
    this.checkInDate = checkInDate;
    this.checkOutDate = checkOutDate;
    this.numGuests = parseInt(numGuests, 10);
    this.totalPriceDkk = parseFloat(totalPriceDkk);
    this.status = status;
    this.satisfactionScore = satisfactionScore ? parseInt(satisfactionScore, 10) : null;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
    this.guest = guest;
    this.room = room;
  }

  /**
   * Beregner antal overnattede nætter.
   * @returns {number}
   */
  calculateNights() {
    if (!this.checkInDate || !this.checkOutDate) return 0;
    const start = new Date(this.checkInDate);
    const end = new Date(this.checkOutDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime <= 0) return 0;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Tjekker om bookingen er aktiv (dvs. ikke aflyst).
   * @returns {boolean}
   */
  isActive() {
    return this.status !== BOOKING_STATUS.CANCELLED;
  }

  /**
   * Udfører soft delete (aflysning) på bookingen.
   */
  cancel() {
    if (this.status === BOOKING_STATUS.CANCELLED) {
      return; // Allerede aflyst
    }
    this.status = BOOKING_STATUS.CANCELLED;
    this.updatedAt = new Date();
  }

  /**
   * Validerer reservationens invarians.
   */
  validate() {
    const nights = this.calculateNights();
    if (nights <= 0) {
      throw new ValidationError('Afrejsedato skal være strengt efter ankomstdato.');
    }

    if (isNaN(this.numGuests) || this.numGuests < MIN_GUESTS_PER_ROOM || this.numGuests > MAX_GUESTS_PER_ROOM) {
      throw new ValidationError(`Antal gæster skal være mellem ${MIN_GUESTS_PER_ROOM} og ${MAX_GUESTS_PER_ROOM}.`);
    }

    if (this.satisfactionScore !== null && (this.satisfactionScore < 1 || this.satisfactionScore > 5)) {
      throw new ValidationError('Kundetilfredshedsscore skal være mellem 1 og 5 stjerner.');
    }
  }

  toJSON() {
    return {
      id: this.id,
      guest_id: this.guestId,
      room_id: this.roomId,
      check_in_date: this.checkInDate,
      check_out_date: this.checkOutDate,
      nights: this.calculateNights(),
      num_guests: this.numGuests,
      total_price_dkk: this.totalPriceDkk,
      status: this.status,
      satisfaction_score: this.satisfactionScore,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
      guest: this.guest ? (this.guest.toJSON ? this.guest.toJSON() : this.guest) : undefined,
      room: this.room ? (this.room.toJSON ? this.room.toJSON() : this.room) : undefined
    };
  }
}
