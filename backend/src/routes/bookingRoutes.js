
import { Router } from "express";
import { getBookings } from "../services/bookingService.js";
import { getRoomTypes } from "../services/roomService.js";

const router = Router();

// GET /api/bookings
router.get("/bookings", async (req, res, next) => {
  try {
    const { q, status, from, to, limit, offset } = req.query;

    const bookings = await getBookings({
      q,
      status,
      startDate: from,
      endDate: to,
      limit,
      offset,
    });

    res.status(200).json(bookings);
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
