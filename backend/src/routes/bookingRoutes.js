/**
 * Presentation Layer: Booking Routes
 * Udstiller REST endpoints for reservationer og værelsestyper i henhold til OpenAPI kontrakten.
 */

import { Router } from 'express';
import bookingController from '../controllers/bookingController.js';

const router = Router();

// Værelsestyper
router.get('/room-types', bookingController.getRoomTypes);

// Bookinger CRUD
router.get('/bookings', bookingController.getBookings);
router.get('/bookings/:id', bookingController.getBookingById);
router.post('/bookings', bookingController.createBooking);
router.put('/bookings/:id', bookingController.updateBooking);
router.delete('/bookings/:id', bookingController.cancelBooking);

export default router;
