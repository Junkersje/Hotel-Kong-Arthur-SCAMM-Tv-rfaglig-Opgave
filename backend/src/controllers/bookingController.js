/**
 * Presentation Layer: BookingController (OOP Class)
 * SOLID: Single Responsibility (HTTP-håndtering, parsing af parametre, response mapping)
 * Dependency Inversion: Modtager BookingService via Constructor Injection
 */

import defaultBookingService from '../services/bookingService.js';

export class BookingController {
  constructor(bookingService = defaultBookingService) {
    this.bookingService = bookingService;

    // Bind metoder så de bevarer 'this' kontekst i Express callbacks
    this.getBookings = this.getBookings.bind(this);
    this.getRoomTypes = this.getRoomTypes.bind(this);
    this.getBookingById = this.getBookingById.bind(this);
    this.createBooking = this.createBooking.bind(this);
    this.updateBooking = this.updateBooking.bind(this);
    this.cancelBooking = this.cancelBooking.bind(this);
  }

  async getBookings(req, res, next) {
    try {
      const filters = {
        q: req.query.q,
        status: req.query.status,
        from: req.query.from,
        to: req.query.to
      };
      const data = await this.bookingService.getBookings(filters);
      res.status(200).json(data);
    } catch (err) {
      next(err);
    }
  }

  async getRoomTypes(req, res, next) {
    try {
      const types = await this.bookingService.getRoomTypes();
      res.status(200).json(types.map(t => t.toJSON ? t.toJSON() : t));
    } catch (err) {
      next(err);
    }
  }

  async getBookingById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const booking = await this.bookingService.getBookingById(id);
      res.status(200).json(booking);
    } catch (err) {
      next(err);
    }
  }

  async createBooking(req, res, next) {
    try {
      const created = await this.bookingService.createBooking(req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }

  async updateBooking(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await this.bookingService.updateBooking(id, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }

  async cancelBooking(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const result = await this.bookingService.cancelBooking(id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}

export default new BookingController();
