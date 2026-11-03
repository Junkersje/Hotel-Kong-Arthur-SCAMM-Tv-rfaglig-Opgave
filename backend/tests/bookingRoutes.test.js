import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import db from '../src/config/database.js';
import bookingRoutes from '../src/routes/bookingRoutes.js';

describe('T016: Booking Routes Unit Tests', () => {
  const originalQuery = db.query;

  test('GET /bookings skal returnere HTTP 200 med array af bookinger', async () => {
    const mockBookings = [
      {
        id: 101,
        order_date: '2026-05-01T12:00:00Z',
        arrival: '2026-06-01T14:00:00Z',
        departure: '2026-06-05T10:00:00Z',
        occupants: 2,
        price: 3200,
        status: 'confirmed',
        star_rating: 5,
        customer_name: 'Lars Nielsen',
        customer_country: 'Danmark',
        room_name: 'Værelse 101',
        room_type_name: 'Standard Dobbeltværelse',
        max_capacity: 2,
        season_name: 'Højsæson'
      }
    ];

    db.query = async (sql, params) => {
      assert.ok(sql.includes('FROM booking b'));
      return { rows: mockBookings };
    };

    try {
      const app = express();
      app.use('/api', bookingRoutes);

      const req = { query: {} };
      let responseStatus = null;
      let responseBody = null;
      let responseHeaders = {};

      const res = {
        setHeader: (k, v) => { responseHeaders[k] = v; },
        status: (code) => {
          responseStatus = code;
          return {
            json: (body) => { responseBody = body; }
          };
        }
      };

      const handler = bookingRoutes.stack.find(s => s.route?.path === '/bookings')?.route?.stack[0]?.handle;
      assert.ok(handler, 'Route handler for /bookings skal eksistere');

      await handler(req, res);

      assert.equal(responseStatus, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.count, 1);
      assert.deepEqual(responseBody.data, mockBookings);
      assert.equal(responseHeaders['Content-Type'], 'application/json');
    } finally {
      db.query = originalQuery;
    }
  });

  test('GET /bookings med parametre q, status, from, to tilføjer korrekte SQL filtre', async () => {
    let executedSql = '';
    let executedParams = [];

    db.query = async (sql, params) => {
      executedSql = sql;
      executedParams = params;
      return { rows: [] };
    };

    try {
      const handler = bookingRoutes.stack.find(s => s.route?.path === '/bookings')?.route?.stack[0]?.handle;

      const req = {
        query: {
          q: 'Nielsen',
          status: 'confirmed',
          from: '2026-06-01',
          to: '2026-06-15'
        }
      };

      let responseStatus = null;
      let responseBody = null;
      const res = {
        setHeader: () => {},
        status: (code) => ({
          json: (body) => {
            responseStatus = code;
            responseBody = body;
          }
        })
      };

      await handler(req, res);

      assert.equal(responseStatus, 200);
      assert.equal(responseBody.count, 0);
      assert.ok(executedSql.includes('c.first_name ILIKE $1 OR c.last_name ILIKE $1'));
      assert.ok(executedSql.includes('LOWER(b.status) = $2'));
      assert.ok(executedSql.includes('b.arrival::date >= $3::date'));
      assert.ok(executedSql.includes('b.departure::date <= $4::date'));
      assert.equal(executedParams[0], '%Nielsen%');
      assert.equal(executedParams[1], 'confirmed');
      assert.equal(executedParams[2], '2026-06-01');
      assert.equal(executedParams[3], '2026-06-15');
    } finally {
      db.query = originalQuery;
    }
  });

  test('GET /bookings håndterer numerisk q ved også at søge på b.id', async () => {
    let executedSql = '';
    let executedParams = [];

    db.query = async (sql, params) => {
      executedSql = sql;
      executedParams = params;
      return { rows: [] };
    };

    try {
      const handler = bookingRoutes.stack.find(s => s.route?.path === '/bookings')?.route?.stack[0]?.handle;
      const req = { query: { q: '42' } };
      const res = {
        setHeader: () => {},
        status: () => ({ json: () => {} })
      };

      await handler(req, res);

      assert.ok(executedSql.includes('b.id = $2'));
      assert.equal(executedParams[0], '%42%');
      assert.equal(executedParams[1], 42);
    } finally {
      db.query = originalQuery;
    }
  });

  test('GET /room-types returnerer HTTP 200 med alle værelsestyper', async () => {
    const mockRoomTypes = [
      { id: 1, name: 'Enkeltværelse Standard', max_capacity: 1 },
      { id: 2, name: 'Dobbeltværelse Standard', max_capacity: 2 }
    ];

    db.query = async (sql) => {
      assert.ok(sql.includes('FROM room_type'));
      return { rows: mockRoomTypes };
    };

    try {
      const handler = bookingRoutes.stack.find(s => s.route?.path === '/room-types')?.route?.stack[0]?.handle;
      assert.ok(handler, 'Route handler for /room-types skal eksistere');

      let responseStatus = null;
      let responseBody = null;
      let responseHeaders = {};

      const req = {};
      const res = {
        setHeader: (k, v) => { responseHeaders[k] = v; },
        status: (code) => ({
          json: (body) => {
            responseStatus = code;
            responseBody = body;
          }
        })
      };

      await handler(req, res);

      assert.equal(responseStatus, 200);
      assert.equal(responseBody.success, true);
      assert.equal(responseBody.count, 2);
      assert.deepEqual(responseBody.data, mockRoomTypes);
      assert.equal(responseHeaders['Content-Type'], 'application/json');
    } finally {
      db.query = originalQuery;
    }
  });

  test('GET /bookings returnerer HTTP 500 ved databasefejl', async () => {
    db.query = async () => {
      throw new Error('Databaseforbindelse timeout');
    };

    try {
      const handler = bookingRoutes.stack.find(s => s.route?.path === '/bookings')?.route?.stack[0]?.handle;
      let responseStatus = null;
      let responseBody = null;

      const req = { query: {} };
      const res = {
        setHeader: () => {},
        status: (code) => ({
          json: (body) => {
            responseStatus = code;
            responseBody = body;
          }
        })
      };

      await handler(req, res);

      assert.equal(responseStatus, 500);
      assert.equal(responseBody.success, false);
      assert.equal(responseBody.error, 'Kunne ikke hente bookinger.');
      assert.equal(responseBody.details, 'Databaseforbindelse timeout');
    } finally {
      db.query = originalQuery;
    }
  });

  test('GET /room-types returnerer HTTP 500 ved databasefejl', async () => {
    db.query = async () => {
      throw new Error('Tabellen room_type findes ikke');
    };

    try {
      const handler = bookingRoutes.stack.find(s => s.route?.path === '/room-types')?.route?.stack[0]?.handle;
      let responseStatus = null;
      let responseBody = null;

      const req = {};
      const res = {
        setHeader: () => {},
        status: (code) => ({
          json: (body) => {
            responseStatus = code;
            responseBody = body;
          }
        })
      };

      await handler(req, res);

      assert.equal(responseStatus, 500);
      assert.equal(responseBody.success, false);
      assert.equal(responseBody.error, 'Kunne ikke hente værelsestyper.');
      assert.equal(responseBody.details, 'Tabellen room_type findes ikke');
    } finally {
      db.query = originalQuery;
    }
  });
});
