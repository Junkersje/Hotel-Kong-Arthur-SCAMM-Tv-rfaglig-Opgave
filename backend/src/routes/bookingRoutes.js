
import { Router } from "express";
import {
  getBookings,
  createBooking,
  validateCreateBooking
} from "../services/bookingService.js";
import { getRoomTypes } from "../services/roomService.js";

const router = Router();

// GET /api/bookings
router.get("/bookings", async (req, res, next) => {
  try {
    const { search, q, status, from, to, limit, offset } = req.query;

    const bookings = await getBookings({
      q: search ?? q,
      status,
      startDate: from,
      endDate: to,
      limit,
      offset
    });

    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
});

// POST /api/bookings
router.post("/bookings", validateCreateBooking, async (req, res, next) => {
  try {
    const booking = await createBooking(req.validatedBody);

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/room-types
router.get("/room-types", async (req, res, next) => {
  try {
    const roomTypes = await getRoomTypes();

    res.status(200).json(roomTypes);
  } catch (error) {
    next(error);
  }
});

export default router;
