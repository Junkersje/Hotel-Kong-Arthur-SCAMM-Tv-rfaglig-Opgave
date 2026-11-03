import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createBookingSchema, validateCreateBooking } from '../src/validators/bookingValidator.js';

describe('T017: Booking Validator Tests', () => {
  const validPayload = {
    first_name: 'Frederik',
    last_name: 'Jensen',
    email: 'frederik@example.com',
    phone_number: '+45 12345678',
    country: 'Danmark',
    room_type_id: 2,
    num_guests: 2,
    check_in_date: '2026-07-01',
    check_out_date: '2026-07-05'
  };

  test('Valid booking payload parses successfully', () => {
    const result = createBookingSchema.safeParse(validPayload);
    assert.equal(result.success, true);
    assert.equal(result.data.first_name, 'Frederik');
    assert.equal(result.data.num_guests, 2);
  });

  test('Accepterer positivt heltal som country_id', () => {
    const result = createBookingSchema.safeParse({
      ...validPayload,
      country: 1
    });
    assert.equal(result.success, true);
    assert.equal(result.data.country, 1);
  });

  test('Afviser tomt fornavn og efternavn', () => {
    const result = createBookingSchema.safeParse({
      ...validPayload,
      first_name: '   ',
      last_name: ''
    });
    assert.equal(result.success, false);
    const fields = result.error.errors.map(e => e.path[0]);
    assert.ok(fields.includes('first_name'));
    assert.ok(fields.includes('last_name'));
  });

  test('Afviser ugyldigt email-format', () => {
    const result = createBookingSchema.safeParse({
      ...validPayload,
      email: 'ikke-en-email'
    });
    assert.equal(result.success, false);
    assert.equal(result.error.errors[0].path[0], 'email');
  });

  test('Afviser num_guests uden for 1-4', () => {
    const zeroGuests = createBookingSchema.safeParse({
      ...validPayload,
      num_guests: 0
    });
    assert.equal(zeroGuests.success, false);

    const fiveGuests = createBookingSchema.safeParse({
      ...validPayload,
      num_guests: 5
    });
    assert.equal(fiveGuests.success, false);

    const fourGuests = createBookingSchema.safeParse({
      ...validPayload,
      num_guests: 4
    });
    assert.equal(fourGuests.success, true);
  });

  test('Afviser når check_out_date er før eller lig med check_in_date', () => {
    const sameDate = createBookingSchema.safeParse({
      ...validPayload,
      check_in_date: '2026-07-05',
      check_out_date: '2026-07-05'
    });
    assert.equal(sameDate.success, false);
    assert.equal(sameDate.error.errors[0].path[0], 'check_out_date');
    assert.equal(sameDate.error.errors[0].message, 'Afrejsedato skal være strengt efter ankomstdato');

    const earlierDeparture = createBookingSchema.safeParse({
      ...validPayload,
      check_in_date: '2026-07-05',
      check_out_date: '2026-07-01'
    });
    assert.equal(earlierDeparture.success, false);
    assert.equal(earlierDeparture.error.errors[0].path[0], 'check_out_date');
  });

  test('validateCreateBooking middleware returnerer HTTP 400 med struktureret fejlformat ved ugyldige data', () => {
    let statusCode = null;
    let jsonBody = null;
    let nextCalled = false;

    const req = {
      body: {
        ...validPayload,
        first_name: '',
        email: 'dårlig-email',
        check_in_date: '2026-08-10',
        check_out_date: '2026-08-05'
      }
    };

    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { jsonBody = data; }
        };
      }
    };

    const next = () => { nextCalled = true; };

    validateCreateBooking(req, res, next);

    assert.equal(nextCalled, false);
    assert.equal(statusCode, 400);
    assert.equal(jsonBody.success, false);
    assert.equal(jsonBody.error, 'Valideringsfejl');
    assert.ok(Array.isArray(jsonBody.details));
    assert.ok(jsonBody.details.some(d => d.field === 'first_name'));
    assert.ok(jsonBody.details.some(d => d.field === 'email'));
    assert.ok(jsonBody.details.some(d => d.field === 'check_out_date'));
  });

  test('validateCreateBooking middleware kalder next() og populerer req.validatedBody ved gyldige data', () => {
    let nextCalled = false;
    const req = { body: { ...validPayload } };
    const res = {
      status: () => ({ json: () => {} })
    };
    const next = () => { nextCalled = true; };

    validateCreateBooking(req, res, next);

    assert.equal(nextCalled, true);
    assert.ok(req.validatedBody);
    assert.equal(req.validatedBody.first_name, 'Frederik');
    assert.equal(req.validatedBody.num_guests, 2);
  });
});
