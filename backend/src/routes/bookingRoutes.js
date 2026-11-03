import express from 'express';
import db from '../config/database.js';
import bookingService from '../services/bookingService.js';
import { validateCreateBooking } from '../validators/bookingValidator.js';

const router = express.Router();

/**
 * @route   GET /api/bookings
 * @desc    Fremsøg og filtrer bookinger (q, status, from, to)
 * @access  Public / Receptionist
 */
router.get('/bookings', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const { q, status, from, to } = req.query;

    let queryText = `
      SELECT 
        b.id,
        b.order_date,
        b.arrival,
        b.departure,
        b.occupants,
        b.price::numeric AS price,
        b.status,
        b.star_rating,
        b.updated_at,
        c.id AS customer_id,
        CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
        c.email AS customer_email,
        c.phone_number AS customer_phone,
        co.name AS customer_country,
        r.id AS room_id,
        r.name AS room_name,
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        rt.max_capacity,
        s.name AS season_name
      FROM booking b
      JOIN costumer c ON b.costumer_id = c.id
      LEFT JOIN country co ON c.country_id = co.id
      LEFT JOIN room r ON b.room_id = r.id
      LEFT JOIN room_type rt ON r.room_type_id = rt.id
      LEFT JOIN season s ON b.season_id = s.id
      WHERE 1=1
    `;

    const queryParams = [];

    // Filter 'q': Søg i booking ID eller fornavn/efternavn
    if (q && q.trim() !== '') {
      queryParams.push(`%${q.trim()}%`);
      const qIdx = queryParams.length;
      if (!isNaN(q.trim())) {
        queryParams.push(Number(q.trim()));
        const idIdx = queryParams.length;
        queryText += ` AND (b.id = $${idIdx} OR c.first_name ILIKE $${qIdx} OR c.last_name ILIKE $${qIdx} OR CONCAT(c.first_name, ' ', c.last_name) ILIKE $${qIdx})`;
      } else {
        queryText += ` AND (c.first_name ILIKE $${qIdx} OR c.last_name ILIKE $${qIdx} OR CONCAT(c.first_name, ' ', c.last_name) ILIKE $${qIdx})`;
      }
    }

    // Filter 'status' (f.eks. 'confirmed', 'checked_in', 'cancelled')
    if (status && status.trim() !== '') {
      queryParams.push(status.trim().toLowerCase());
      queryText += ` AND LOWER(b.status) = $${queryParams.length}`;
    }

    // Filter 'from' (arrival >= from)
    if (from && from.trim() !== '') {
      queryParams.push(from.trim());
      queryText += ` AND b.arrival::date >= $${queryParams.length}::date`;
    }

    // Filter 'to' (departure <= to eller arrival <= to)
    if (to && to.trim() !== '') {
      queryParams.push(to.trim());
      queryText += ` AND b.departure::date <= $${queryParams.length}::date`;
    }

    queryText += ` ORDER BY b.arrival DESC, b.id DESC`;

    const { rows } = await db.query(queryText, queryParams);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Fejl ved hentning af bookinger:', error);
    return res.status(500).json({
      success: false,
      error: 'Kunne ikke hente bookinger.',
      details: error.message,
    });
  }
});

/**
 * @route   POST /api/bookings
 * @desc    Opret en ny booking beskyttet af Zod valideringsmiddleware (T017, T018, T019)
 * @access  Public / Receptionist
 */
router.post('/bookings', validateCreateBooking, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const bookingData = req.validatedBody || req.body;
    const newBooking = await bookingService.createBooking(bookingData);

    return res.status(201).json({
      success: true,
      message: 'Booking oprettet med succes',
      data: newBooking,
    });
  } catch (error) {
    console.error('Fejl ved oprettelse af booking:', error);
    const status = error.statusCode || (error.message?.includes('ledige værelser') ? 409 : 400);
    return res.status(status).json({
      success: false,
      error: error.message || 'Kunne ikke oprette booking.',
    });
  }
});

/**
 * @route   GET /api/room-types
 * @desc    Henter listen over alle værelsestyper
 * @access  Public
 */
router.get('/room-types', async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  try {
    const sql = `
      SELECT 
        id,
        name,
        max_capacity
      FROM room_type
      ORDER BY id ASC
    `;
    const { rows } = await db.query(sql);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    console.error('Fejl ved hentning af værelsestyper:', error);
    return res.status(500).json({
      success: false,
      error: 'Kunne ikke hente værelsestyper.',
      details: error.message,
    });
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = router;
}

export default router;
