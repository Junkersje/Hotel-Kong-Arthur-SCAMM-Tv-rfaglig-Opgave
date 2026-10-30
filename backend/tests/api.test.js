import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import app from '../src/server.js';
import db from '../src/repositories/db.js';

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
    test('skal kunne forbinde til MySQL og køre simpel query', async () => {
      const result = await db.query('SELECT 1 + 1 AS solution');
      assert.ok(result);
      assert.equal(result[0].solution, 2);
    });

    test('skal indeholde præcis 214 værelser i ROOM tabellen', async () => {
      const [row] = await db.query('SELECT COUNT(*) AS total FROM ROOM');
      assert.equal(row.total, 214);
    });

    test('skal indeholde de 8 officielle værelsestyper', async () => {
      const [row] = await db.query('SELECT COUNT(*) AS total FROM ROOM_TYPE');
      assert.equal(row.total, 8);
    });

    test('skal indeholde bartender Helene Christine (EMP-01)', async () => {
      const rows = await db.query("SELECT * FROM EMPLOYEE WHERE id = 'EMP-01'");
      assert.equal(rows.length, 1);
      assert.equal(rows[0].name, 'Helene Christine');
    });

    test('skal rulle transaktion tilbage ved fejl i withTransaction', async () => {
      let rolledBack = false;
      try {
        await db.withTransaction(async (conn) => {
          await conn.execute("INSERT INTO GUEST (name, country, email, phone) VALUES ('Test Rollback', 'Danmark', 'rollback@test.dk', '+45 00000000')");
          throw new Error('Forceret fejl for rollback-test');
        });
      } catch (e) {
        rolledBack = true;
      }
      assert.equal(rolledBack, true);

      const rows = await db.query("SELECT * FROM GUEST WHERE email = 'rollback@test.dk'");
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
});
