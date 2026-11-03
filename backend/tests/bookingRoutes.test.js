
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

const calls = [];
let bookings = [];
let roomTypes = [];
let bookingError = null;
let roomError = null;

// Mock services before importing the routes.
mock.module('../src/services/bookingService.js', {
  namedExports: {
    getBookings: async (filters) => {
      calls.push({ endpoint: 'bookings', filters });
      if (bookingError) throw bookingError;
      return bookings;
    }
  }
});

mock.module('../src/services/roomService.js', {
  namedExports: {
    getRoomTypes: async () => {
      calls.push({ endpoint: 'room-types' });
      if (roomError) throw roomError;
      return roomTypes;
    }
  }
});

const { default: bookingRoutes } = await import(
  '../src/routes/bookingRoutes.js'
);

function reset() {
  calls.length = 0;
  bookings = [];
  roomTypes = [];
  bookingError = null;
  roomError = null;
}

function getHandler(path) {
  const handler = bookingRoutes.stack.find(
    (layer) => layer.route?.path === path
  )?.route?.stack[0]?.handle;

  assert.ok(handler, `Handler for ${path} findes`);
  return handler;
}

async function invoke(path, query = {}) {
  const handler = getHandler(path);
  let statusCode = null;
  let body;
  let forwardedError;

  const req = { query };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    }
  };

  await handler(req, res, (error) => {
    forwardedError = error;
  });

  return { statusCode, body, forwardedError };
}

describe('T016: Booking Routes Unit Tests', () => {
  test('GET /bookings returnerer HTTP 200 med array', async () => {
    reset();
    bookings = [{ id: 101, status: 'confirmed' }];

    const result = await invoke('/bookings');

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, bookings);
    assert.equal(result.forwardedError, undefined);
  });

  test('GET /bookings videresender søgefiltre', async () => {
    reset();

    const result = await invoke('/bookings', {
      search: 'Nielsen',
      status: 'confirmed',
      from: '2026-06-01',
      to: '2026-06-15',
      limit: '10',
      offset: '0'
    });

    assert.equal(result.statusCode, 200);
    assert.deepEqual(calls[0].filters, {
      q: 'Nielsen',
      status: 'confirmed',
      startDate: '2026-06-01',
      endDate: '2026-06-15',
      limit: '10',
      offset: '0'
    });
  });

  test('GET /bookings understøtter eksisterende q', async () => {
    reset();

    await invoke('/bookings', { q: '42' });

    assert.equal(calls[0].filters.q, '42');
  });

  test('GET /room-types returnerer HTTP 200 med array', async () => {
    reset();
    roomTypes = [
      { id: 1, name: 'Enkeltværelse', max_capacity: 1 },
      { id: 2, name: 'Dobbeltværelse', max_capacity: 2 }
    ];

    const result = await invoke('/room-types');

    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.body, roomTypes);
    assert.equal(result.forwardedError, undefined);
  });

  test('GET /bookings sender databasefejl til Express', async () => {
    reset();
    bookingError = new Error('Databaseforbindelse timeout');

    const result = await invoke('/bookings');

    assert.equal(result.statusCode, null);
    assert.equal(result.forwardedError, bookingError);
  });

  test('GET /room-types sender databasefejl til Express', async () => {
    reset();
    roomError = new Error('Tabellen room_type findes ikke');

    const result = await invoke('/room-types');

    assert.equal(result.statusCode, null);
    assert.equal(result.forwardedError, roomError);
  });

  test('POST /bookings opretter en booking og returnerer HTTP 201 Created', async () => {
    const postRoute = bookingRoutes.stack.find(s => s.route?.path === '/bookings' && s.route?.methods?.post);
    assert.ok(postRoute, 'POST /bookings route skal være defineret');

    const mockClient = {
      query: async (sql) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') return { rows: [] };
        if (sql.includes('SELECT id FROM country')) return { rows: [{ id: 1 }] };
        if (sql.includes('SELECT id FROM costumer')) return { rows: [] };
        if (sql.includes('COALESCE(MAX(id), 0) + 1 AS next_id FROM costumer')) {
          return { rows: [{ next_id: 88 }] };
        }
        if (sql.includes('INSERT INTO costumer')) return { rows: [{ id: 88 }] };
        if (sql.includes('FROM room r')) return { rows: [{ id: 201, name: '201', room_type_name: 'Standard Single' }] };
        if (sql.includes('SELECT id FROM season')) return { rows: [{ id: 1 }] };
        if (sql.includes('SELECT price_pr_night FROM room_price')) {
          return { rows: [{ price_pr_night: 1050 }] };
        }
        if (sql.includes('COALESCE(MAX(id), 0) + 1 AS next_id FROM booking')) {
          return { rows: [{ next_id: 999 }] };
        }
        if (sql.includes('INSERT INTO booking')) {
          return {
            rows: [{
              id: 999,
              costumer_id: 88,
              order_date: new Date(),
              room_id: 201,
              arrival: '2026-07-01',
              departure: '2026-07-03',
              season_id: 1,
              occupants: 1,
              price: 2100,
              status: 'confirmed',
              star_rating: 5,
              updated_at: new Date()
            }]
          };
        }
        return { rows: [] };
      },
      release: () => {}
    };

    db.connect = async () => mockClient;

    try {
      const validPayload = {
        first_name: 'Signe',
        last_name: 'Krogh',
        email: 'signe@example.com',
        phone_number: '+45 99887766',
        country: 'Danmark',
        room_type_id: 1,
        num_guests: 1,
        check_in_date: '2026-07-01',
        check_out_date: '2026-07-03'
      };

      const req = { body: validPayload, validatedBody: validPayload };
      let resStatus = null;
      let resBody = null;
      const res = {
        setHeader: () => {},
        status: (code) => ({
          json: (data) => {
            resStatus = code;
            resBody = data;
          }
        })
      };

      const routeHandler = postRoute.route.stack[postRoute.route.stack.length - 1].handle;
      await routeHandler(req, res);

      assert.equal(resStatus, 201);
      assert.equal(resBody.success, true);
      assert.equal(resBody.data.id, 999);
      assert.equal(resBody.data.customer_name, 'Signe Krogh');
    } finally {
      db.connect = originalConnect;
    }
  });
});
