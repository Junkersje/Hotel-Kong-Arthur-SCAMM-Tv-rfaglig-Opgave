
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
});
