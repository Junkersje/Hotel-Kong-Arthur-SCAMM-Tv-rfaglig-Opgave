
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const mockSearchBookings = mock.fn();

mock.module('../src/repositories/bookingRepository.js', {
  namedExports: {
    searchBookings: mockSearchBookings
  }
});

const { getBookings } = await import('../src/services/bookingService.js');

test('T015: Henter og formaterer bookinger', async () => {
  mockSearchBookings.mock.mockImplementationOnce(async () => [
    {
      id: 1,
      costumer_name: 'Anna Jensen',
      check_in_date: '2026-11-01T00:00:00.000Z',
      check_out_date: '2026-11-04T00:00:00.000Z'
    }
  ]);

  const result = await getBookings({ q: ' Anna ' });

  assert.equal(result.length, 1);
  assert.equal(result[0].check_in_date, '2026-11-01');
  assert.equal(result[0].check_out_date, '2026-11-04');
  assert.equal(result[0].nights, 3);

  assert.equal(mockSearchBookings.mock.calls[0].arguments[0].q, 'Anna');
});

test('T015: Returnerer tom liste, når ingen bookinger findes', async () => {
  mockSearchBookings.mock.mockImplementationOnce(async () => []);

  const result = await getBookings();

  assert.deepEqual(result, []);
});

test('T015: Afviser ugyldig limit', async () => {
  await assert.rejects(
    getBookings({ limit: -1 }),
    /Invalid limit/
  );
});
