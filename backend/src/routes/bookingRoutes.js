import { Router } from "express";
import { getBookings, createBooking } from "../services/bookingService.js";
import { getRoomTypes } from "../services/roomService.js";
import { validateCreateBooking } from "../validators/bookingValidator.js";

const router = Router();

// GET /api/bookings (T016)
router.get("/bookings", async (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const { search, q, status, from, to, limit, offset } = req.query;

    const bookings = await getBookings({
      q: search ?? q,
      status,
      startDate: from,
      endDate: to,
      limit,
      offset,
    });

    return res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
});

// GET /api/room-types (T016)
router.get("/room-types", async (req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const roomTypes = await getRoomTypes();

    return res.status(200).json(roomTypes);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/bookings
 * @desc    Opretter en ny reservation under en atomar transaktion med Zod-validering (T017, T018, T019)
 * @access  Public / Receptionist
 */
router.post("/bookings", validateCreateBooking, async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  try {
    const bookingPayload = req.validatedBody || req.body;
    
    // Opret reservation via transaktionslogikken i BLL (T018)
    const newBooking = await createBooking(bookingPayload);

    // Sæt Location header jf. REST/OpenAPI best practice
    const locationUri = `/api/bookings/${newBooking.id}`;
    res.setHeader("Location", locationUri);

    return res.status(201).json({
      success: true,
      message: "Reservation oprettet med succes",
      data: newBooking,
    });
  } catch (error) {
    console.error("Fejl ved oprettelse af reservation:", error);

    // Håndter kapacitetskonflikt / udsolgte værelser
    if (error.statusCode === 409 || error.message?.includes("ingen ledige værelser")) {
      return res.status(409).json({
        success: false,
        error: "Konflikt ved værelsestildeling",
        details: error.message,
      });
    }

    return res.status(error.statusCode || 500).json({
      success: false,
      error: error.message || "Der opstod en intern serverfejl ved oprettelsen af reservationen",
    });
  }
});

if (typeof module !== "undefined" && module.exports) {
  module.exports = router;
}

export default router;
