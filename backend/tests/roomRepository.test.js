
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

// Vi erstatter PostgreSQL med en falsk databasefunktion.
const queryMock = mock.fn(async () => []);

mock.module('../src/repositories/db.js', {
  namedExports: {
    query: queryMock
  }
});

const { getAllTypes, getAll, getAvailableRooms } =
  await import('../src/repositories/roomRepository.js');

test('T013: getAllTypes henter værelsestyper', async () => {
  queryMock.mock.resetCalls();

  const roomTypes = [
    { id: 1, name: 'Standard Single', capacity: 1 }
  ];

  queryMock.mock.mockImplementation(async () => roomTypes);

  const result = await getAllTypes();

  assert.deepEqual(result, roomTypes);
  assert.equal(queryMock.mock.callCount(), 1);
  assert.match(queryMock.mock.calls[0].arguments[0], /FROM ROOM_TYPE/i);
});

test('T013: getAll henter værelser med værelsestype', async () => {
  queryMock.mock.resetCalls();

  const rooms = [
    { room_number: 103, room_type_name: 'Standard Single' }
  ];

  queryMock.mock.mockImplementation(async () => rooms);

  const result = await getAll();

  assert.deepEqual(result, rooms);
  assert.match(queryMock.mock.calls[0].arguments[0], /JOIN ROOM_TYPE/i);
});

test('T013: getAvailableRooms bruger de korrekte parametre', async () => {
  queryMock.mock.resetCalls();
  queryMock.mock.mockImplementation(async () => []);

  const result = await getAvailableRooms(
    1,
    '2027-06-01',
    '2027-06-05'
  );

  assert.deepEqual(result, []);
  assert.deepEqual(
    queryMock.mock.calls[0].arguments[1],
    [1, '2027-06-05', '2027-06-01']
  );
  assert.match(
    queryMock.mock.calls[0].arguments[0],
    /NOT EXISTS/i
  );
});
