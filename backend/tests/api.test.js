import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import db from '../src/repositories/db.js';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/server.js');

describe('Hotel Kong Arthur — Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await db.pool.end();
  });

  describe('Database Layer Tests', () => {
    test('skal kunne forbinde til PostgreSQL og køre simpel query', async () => {
      const result = await db.query('SELECT 1 + 1 AS solution');
      assert.ok(result);
      assert.equal(result[0].solution, 2);
    });

    test('skal indeholde præcis 214 værelser i ROOM tabellen', async () => {
      const [row] = await db.query('SELECT COUNT(*) AS total FROM room');
      assert.equal(row.total, 214);
    });

    test('skal indeholde de 8 officielle værelsestyper', async () => {
      const [row] = await db.query('SELECT COUNT(*) AS total FROM room_type');
      assert.equal(row.total, 8);
    });

    test('skal indeholde de 30 officielle barprodukter i product tabellen', async () => {
      const [row] = await db.query('SELECT COUNT(*) AS total FROM product');
      assert.equal(row.total, 30);
    });

    test('skal rulle transaktion tilbage ved fejl i withTransaction', async () => {
      let rolledBack = false;
      try {
        await db.withTransaction(async (conn) => {
          await conn.query("INSERT INTO costumer (id, first_name, last_name, email, phone_number, country_id) VALUES (99999, 'Test', 'Rollback', 'rollback@test.dk', '+45 00000000', 1)");
          throw new Error('Forceret fejl for rollback-test');
        });
      } catch (e) {
        rolledBack = true;
      }
      assert.equal(rolledBack, true);

      const rows = await db.query("SELECT * FROM costumer WHERE email = 'rollback@test.dk'");
      assert.equal(rows.length, 0, 'Gæsten burde ikke være persisteret efter rollback');
    });
  });

  describe('Server & Health API Tests', () => {
    test('GET / skal returnere API velkomstbesked og links', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.message, 'Hotel Kong Arthur API is running');
    });

    test('GET /api/health skal returnere status UP og database CONNECTED', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'UP');
      assert.equal(data.database, 'CONNECTED');
    });

    test('GET ukendt rute skal returnere HTTP 404 med standardiseret fejlformat', async () => {
      const res = await fetch(`${baseUrl}/api/ukendt-rute-som-ikke-findes`);
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error?.message);
      assert.equal(data.error?.code, 'NOT_FOUND');
    });
  });

  describe('Tableau WDC & Analytics REST Endpoints (T050)', () => {
    test('GET /tableau-wdc.html skal returnere HTTP 200 og indeholde Tableau WDC 2.3 scripts', async () => {
      const res = await fetch(`${baseUrl}/tableau-wdc.html`);
      assert.equal(res.status, 200);
      const text = await res.text();
      assert.ok(text.includes('tableauwdc-2.3.latest.js'), 'Skal inkludere Tableau WDC 2.3 bibliotek');
      assert.ok(text.includes('hotel_summary'), 'Skal definere hotel_summary schema');
      assert.ok(text.includes('room_type_analytics'), 'Skal definere room_type_analytics schema');
      assert.ok(text.includes('country_analytics'), 'Skal definere country_analytics schema');
      assert.ok(text.includes('bar_sales_breakdown'), 'Skal definere bar_sales_breakdown schema');
      assert.ok(text.includes('recent_bookings'), 'Skal definere recent_bookings schema');
    });

    test('GET / skal indeholde tableau_wdc link', async () => {
      const res = await fetch(`${baseUrl}/`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.tableau_wdc, '/tableau-wdc.html');
    });

    test('GET /api/analytics/summary skal returnere 200 og financials + occupancy', async () => {
      const res = await fetch(`${baseUrl}/api/analytics/summary`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data?.financials?.totalRevenue !== undefined);
      assert.equal(json.data?.occupancy?.totalRoomsCapacity, 214);
    });

    test('GET /api/analytics/revenue-by-room-type skal returnere de 8 værelsestyper', async () => {
      const res = await fetch(`${baseUrl}/api/analytics/revenue-by-room-type`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
      assert.equal(json.data.length, 8);
    });

    test('GET /api/analytics/revenue-by-country skal returnere lande med ALOS', async () => {
      const res = await fetch(`${baseUrl}/api/analytics/revenue-by-country`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data));
    });

    test('GET /api/analytics/adr skal returnere ADR metrics', async () => {
      const res = await fetch(`${baseUrl}/api/analytics/adr`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data?.overallADR !== undefined);
      assert.ok(Array.isArray(json.data?.byRoomType));
    });

    test('GET /api/analytics/bar-performance skal returnere produkter og kategori-fordeling', async () => {
      const res = await fetch(`${baseUrl}/api/analytics/bar-performance`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(Array.isArray(json.data?.products));
      assert.ok(Array.isArray(json.data?.categoryDistribution));
    });

    test('GET /api/analytics/helene-breakdown skal returnere cocktail vs kaffe fordeling', async () => {
      const res = await fetch(`${baseUrl}/api/analytics/helene-breakdown`);
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.success, true);
      assert.ok(json.data?.categories);
    });
  });
});
