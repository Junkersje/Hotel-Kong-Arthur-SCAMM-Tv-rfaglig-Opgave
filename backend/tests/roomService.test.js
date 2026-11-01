
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const mockGetAllTypes = mock.fn();

mock.module('../src/repositories/roomRepository.js', {
  namedExports: {
    getAllTypes: mockGetAllTypes
  }
});

const { getRoomTypes } = await import('../src/services/roomService.js');

test('T015: Henter og formaterer værelsestyper', async () => {
  const roomTypes = [
    {
      id: 1,
      name: 'Standard',
      capacity: 2,
      description: 'Standardværelse'
    },
    {
      id: 2,
      name: 'Suite',
      capacity: 4,
      description: 'Suite med ekstra plads'
    }
  ];

  mockGetAllTypes.mock.mockImplementationOnce(async () => roomTypes);

  const result = await getRoomTypes();

  assert.deepEqual(result, roomTypes);
  assert.equal(result.length, 2);
});

test('T015: Returnerer en tom liste, når ingen værelsestyper findes', async () => {
  mockGetAllTypes.mock.mockImplementationOnce(async () => []);

  const result = await getRoomTypes();

  assert.deepEqual(result, []);
});

