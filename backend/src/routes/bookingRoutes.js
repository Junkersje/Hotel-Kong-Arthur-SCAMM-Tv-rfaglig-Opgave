/**
 * Presentation Layer: Booking Routes (SH-25 / T025)
 * Udstiller REST endpoints for bookingopdatering (PUT /api/bookings/:id) samt opslag.
 * Overholder 3-lagsarkitekturen (ingen SQL eller forretningslogik i ruterne).
 */

import { Router } from 'express';
import bookingService from '../services/bookingService.js';

const router = Router();

/**
 * GET /api/room-types
 * Henter de 8 officielle værelsestyper.
 */
router.get('/room-types', async (req, res, next) => {
  try {
    const roomTypes = await bookingService.getRoomTypes();
    res.status(200).json(roomTypes);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings
 * Fremsøger og filtrerer bookinger (q/search, status, from, to).
 */
router.get('/bookings', async (req, res, next) => {
  try {
    const bookings = await bookingService.getBookings(req.query);
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings/:id
 * Henter en specifik booking ud fra ID.
 */
router.get('/bookings/:id', async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id);
    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/bookings/:id (SH-25 / T025)
 * Opdaterer en eksisterende booking og returnerer HTTP 200 OK eller HTTP 400/404/409 ved fejl.
 */
router.put('/bookings/:id', async (req, res, next) => {
  try {
    const updatedBooking = await bookingService.updateBooking(req.params.id, req.body);
    res.status(200).json(updatedBooking);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/bookings/:id (SH-30 / T030)
 * Aflyser/sletter en booking via soft delete (status = 'cancelled') og returnerer HTTP 200 OK eller HTTP 404 ved ukendt ID.
 */
router.delete('/bookings/:id', async (req, res, next) => {
  try {
    const cancelledBooking = await bookingService.cancelBooking(req.params.id);
    res.status(200).json(cancelledBooking);
  } catch (error) {
    next(error);
  }
});

export default router;
