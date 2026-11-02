
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const calls = [];

mock.module('../src/repositories/db.js', {
  namedExports: {
    query: async (sql, params = []) => {
      calls.push({ sql, params });
      return [{ id: 1, guest_name: 'Anna Jensen' }];
    }
  }
});

const { searchBookings } = await import(
  '../src/repositories/bookingRepository.js'
);

test('T014: Søgning efter gæstenavn, email og booking-ID', async () => {
  calls.length = 0;

  const results = await searchBookings({ q: 'Anna' });
  const { sql, params } = calls[0];

  assert.equal(results.length, 1);
  assert.match(sql, /CAST\(b\.id AS TEXT\) ILIKE \$1/);
  assert.match(sql, /g\.name ILIKE \$2/);
  assert.match(sql, /g\.email ILIKE \$3/);
  assert.deepEqual(params, ['%Anna%', '%Anna%', '%Anna%']);
});

test('T014: Filtrering efter status og datoer', async () => {
  calls.length = 0;

  await searchBookings({
    status: 'confirmed',
    startDate: '2027-06-01',
    endDate: '2027-06-05'
  });

  const { sql, params } = calls[0];

  assert.match(sql, /b\.status = \$1/);
  assert.match(sql, /b\.check_in_date >= \$2/);
  assert.match(sql, /b\.check_in_date <= \$3/);

  assert.deepEqual(params, [
    'confirmed',
    '2027-06-01',
    '2027-06-05'
  ]);
});

test('T014: Pagination med limit og offset', async () => {
  calls.length = 0;

  await searchBookings({ limit: 10, offset: 20 });

  const { sql } = calls[0];

  assert.match(sql, /LIMIT 10 OFFSET 20/);
  assert.match(sql, /ORDER BY b\.created_at DESC/);
});

test('T014: Begrænser ugyldig pagination', async () => {
  calls.length = 0;

  await searchBookings({ limit: 500, offset: -5 });

  const { sql } = calls[0];

  assert.match(sql, /LIMIT 100 OFFSET 0/);
});
