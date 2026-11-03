import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createBooking, withTransaction } from '../src/services/bookingService.js';
import db from '../src/config/database.js';

describe('T018: Booking Creation & Transaction Tests', () => {
  const originalConnect = db.connect;

  test('withTransaction committer ved succes og frigiver klient', async () => {
    let beginCalled = false;
    let commitCalled = false;
    let releaseCalled = false;

    const mockClient = {
      query: async (sql) => {
        if (sql === 'BEGIN') beginCalled = true;
        if (sql === 'COMMIT') commitCalled = true;
        return { rows: [] };
      },
      release: () => { releaseCalled = true; }
    };

    db.connect = async () => mockClient;

    try {
      const res = await withTransaction(async (client) => {
        return 'success_val';
      });

      assert.equal(res, 'success_val');
      assert.equal(beginCalled, true);
      assert.equal(commitCalled, true);
      assert.equal(releaseCalled, true);
    } finally {
      db.connect = originalConnect;
    }
  });

  test('withTransaction ruller tilbage (ROLLBACK) ved fejl og frigiver klient', async () => {
    let beginCalled = false;
    let rollbackCalled = false;
    let releaseCalled = false;

    const mockClient = {
      query: async (sql) => {
        if (sql === 'BEGIN') beginCalled = true;
        if (sql === 'ROLLBACK') rollbackCalled = true;
        return { rows: [] };
      },
      release: () => { releaseCalled = true; }
    };

    db.connect = async () => mockClient;

    try {
      await assert.rejects(async () => {
        await withTransaction(async () => {
          throw new Error('Test transaktion fejl');
        });
      }, /Test transaktion fejl/);

      assert.equal(beginCalled, true);
      assert.equal(rollbackCalled, true);
      assert.equal(releaseCalled, true);
    } finally {
      db.connect = originalConnect;
    }
  });

  test('createBooking persisterer kunde, finder ledigt værelse og opretter booking', async () => {
    const executedQueries = [];

    const mockClient = {
      query: async (sql, params = []) => {
        executedQueries.push({ sql, params });

        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
          return { rows: [] };
        }
        // 1. Land opslag
        if (sql.includes('SELECT id FROM country')) {
          return { rows: [{ id: 45 }] };
        }
        // 2. Costumer opslag (ny kunde)
        if (sql.includes('SELECT id FROM costumer WHERE LOWER(email)')) {
          return { rows: [] };
        }
        if (sql.includes('COALESCE(MAX(id), 0) + 1 AS next_id FROM costumer')) {
          return { rows: [{ next_id: 99 }] };
        }
        if (sql.includes('INSERT INTO costumer')) {
          return { rows: [{ id: 99 }] };
        }
        // 3. Værelse tilgængelighed
        if (sql.includes('FROM room r') && sql.includes('FOR UPDATE OF r')) {
          return { rows: [{ id: 101, name: 'Værelse 101', room_type_name: 'Standard Double' }] };
        }
        // 4. Sæson og pris
        if (sql.includes('SELECT id FROM season')) {
          return { rows: [{ id: 1 }] };
        }
        if (sql.includes('SELECT price_pr_night FROM room_price')) {
          return { rows: [{ price_pr_night: 1400 }] };
        }
        // 5. Booking oprettelse
        if (sql.includes('COALESCE(MAX(id), 0) + 1 AS next_id FROM booking')) {
          return { rows: [{ next_id: 501 }] };
        }
        if (sql.includes('INSERT INTO booking')) {
          return {
            rows: [{
              id: 501,
              costumer_id: 99,
              order_date: new Date(),
              room_id: 101,
              arrival: '2026-07-01',
              departure: '2026-07-04',
              season_id: 1,
              occupants: 2,
              price: 4200,
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
      const bookingData = {
        first_name: 'Mette',
        last_name: 'Frederiksen',
        email: 'mette@regeringen.dk',
        phone_number: '+45 11223344',
        country: 'Danmark',
        room_type_id: 2,
        num_guests: 2,
        check_in_date: '2026-07-01',
        check_out_date: '2026-07-04'
      };

      const result = await createBooking(bookingData);

      assert.equal(result.id, 501);
      assert.equal(result.customer_id, 99);
      assert.equal(result.customer_name, 'Mette Frederiksen');
      assert.equal(result.room.id, 101);
      assert.equal(result.room.name, 'Værelse 101');
      assert.equal(result.status, 'confirmed');
      assert.equal(result.total_nights, 3);
      assert.equal(result.price, 4200);

      // Verificer at FOR UPDATE blev anvendt til låsning
      assert.ok(executedQueries.some(q => q.sql.includes('FOR UPDATE OF r')));
    } finally {
      db.connect = originalConnect;
    }
  });

  test('createBooking kaster 409 fejl og ruller tilbage når intet værelse er ledigt', async () => {
    const mockClient = {
      query: async (sql) => {
        if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
        if (sql.includes('SELECT id FROM country')) return { rows: [{ id: 45 }] };
        if (sql.includes('SELECT id FROM costumer')) return { rows: [{ id: 10 }] };
        if (sql.includes('UPDATE costumer')) return { rows: [{ id: 10 }] };
        if (sql.includes('FROM room r') && sql.includes('FOR UPDATE OF r')) {
          // Intet ledigt værelse
          return { rows: [] };
        }
        return { rows: [] };
      },
      release: () => {}
    };

    db.connect = async () => mockClient;

    try {
      await assert.rejects(async () => {
        await createBooking({
          first_name: 'Anna',
          last_name: 'Hansen',
          email: 'anna@test.dk',
          country: 'Danmark',
          room_type_id: 3,
          num_guests: 2,
          check_in_date: '2026-08-01',
          check_out_date: '2026-08-05'
        });
      }, (err) => {
        assert.equal(err.statusCode, 409);
        assert.ok(err.message.includes('ingen ledige værelser'));
        return true;
      });
    } finally {
      db.connect = originalConnect;
    }
  });
});
