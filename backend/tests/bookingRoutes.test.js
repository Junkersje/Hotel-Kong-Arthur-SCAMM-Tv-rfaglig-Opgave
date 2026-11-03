import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

const calls = [];
let bookings = [];
let roomTypes = [];
let bookingError = null;
let roomError = null;
let createBookingError = null;

let createBookingFn = async (bookingData) => {
  calls.push({ endpoint: 'create-booking', data: bookingData });
  if (createBookingError) throw createBookingError;
  return {
    id: 999,
    customer_id: 88,
    customer_name: `${bookingData.first_name} ${bookingData.last_name}`,
    customer_email: bookingData.email,
    room: { id: 201, name: '201', room_type_id: bookingData.room_type_id, room_type_name: 'Standard Single' },
    arrival: bookingData.check_in_date,
    departure: bookingData.check_out_date,
    occupants: bookingData.num_guests,
    price: 2100,
    status: 'confirmed'
  };
};

// Mock services before importing the routes.
mock.module('../src/services/bookingService.js', {
  namedExports: {
    getBookings: async (filters) => {
      calls.push({ endpoint: 'bookings', filters });
      if (bookingError) throw bookingError;
      return bookings;
    },
    createBooking: async (data) => {
      return await createBookingFn(data);
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
  createBookingError = null;
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
    setHeader() {},
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

describe('T016 & T019: Booking Routes Unit Tests', () => {
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

  test('POST /bookings opretter en booking og returnerer HTTP 201 Created med Location header', async () => {
    reset();
    const postRoute = bookingRoutes.stack.find(s => s.route?.path === '/bookings' && s.route?.methods?.post);
    assert.ok(postRoute, 'POST /bookings route skal være defineret');

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
    const resHeaders = {};

    const res = {
      setHeader: (key, val) => {
        resHeaders[key] = val;
      },
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
    assert.equal(resHeaders['Location'], '/api/bookings/999');
    assert.equal(resHeaders['Content-Type'], 'application/json');
  });

  test('POST /bookings returnerer HTTP 409 Conflict når værelser er udsolgt', async () => {
    reset();
    const postRoute = bookingRoutes.stack.find(s => s.route?.path === '/bookings' && s.route?.methods?.post);

    const conflictErr = new Error('Der er desværre ingen ledige værelser af denne type i den valgte periode.');
    conflictErr.statusCode = 409;
    createBookingError = conflictErr;

    const validPayload = {
      first_name: 'Peter',
      last_name: 'Hansen',
      email: 'peter@example.com',
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

    assert.equal(resStatus, 409);
    assert.equal(resBody.success, false);
    assert.equal(resBody.error, 'Konflikt ved værelsestildeling');
    assert.match(resBody.details, /ingen ledige værelser/i);
  });

  test('POST /bookings returnerer HTTP 500 ved uventet serverfejl', async () => {
    reset();
    const postRoute = bookingRoutes.stack.find(s => s.route?.path === '/bookings' && s.route?.methods?.post);

    createBookingError = new Error('Uventet forbindelsesnedbrud');

    const validPayload = {
      first_name: 'Peter',
      last_name: 'Hansen',
      email: 'peter@example.com',
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

    assert.equal(resStatus, 500);
    assert.equal(resBody.success, false);
    assert.equal(resBody.error, 'Uventet forbindelsesnedbrud');
  });

  test('POST /bookings afviser ugyldig payload via middleware med HTTP 400', async () => {
    reset();
    const postRoute = bookingRoutes.stack.find(s => s.route?.path === '/bookings' && s.route?.methods?.post);
    const validatorMiddleware = postRoute.route.stack[0].handle;

    const invalidPayload = {
      first_name: '',
      last_name: '',
      email: 'not-an-email',
      check_in_date: '2026-07-05',
      check_out_date: '2026-07-01'
    };

    const req = { body: invalidPayload };
    let resStatus = null;
    let resBody = null;

    const res = {
      status: (code) => ({
        json: (data) => {
          resStatus = code;
          resBody = data;
        }
      })
    };

    let nextCalled = false;
    await validatorMiddleware(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, false);
    assert.equal(resStatus, 400);
    assert.equal(resBody.success, false);
    assert.equal(resBody.error, 'Valideringsfejl');
    assert.ok(Array.isArray(resBody.details));
  });
});
