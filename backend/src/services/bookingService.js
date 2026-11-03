
import * as bookingRepository from "../repositories/bookingRepository.js";

function formatDate(value) {
  if (value == null) return null;

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return null;
}

function calculateNights(checkIn, checkOut) {
  const start = formatDate(checkIn);
  const end = formatDate(checkOut);

  if (!start || !end) return null;

  const nights =
    (Date.parse(end + "T00:00:00Z") -
      Date.parse(start + "T00:00:00Z")) /
    86400000;

  return Number.isInteger(nights) && nights >= 0
    ? nights
    : null;
}

export async function getBookings(filterParams = {}) {
  const filters = {};

  if (filterParams.q != null) {
    filters.q = String(filterParams.q).trim();
  }

  if (filterParams.status != null && filterParams.status !== "") {
    filters.status = String(filterParams.status).trim();
  }

  for (const key of ["startDate", "endDate"]) {
    if (filterParams[key] != null && filterParams[key] !== "") {
      const value = String(filterParams[key]);

      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          formatDate(new Date(value)) !== value) {
        throw new Error(`Invalid ${key}`);
      }

      filters[key] = value;
    }
  }

  for (const key of ["limit", "offset"]) {
    if (filterParams[key] != null && filterParams[key] !== "") {
      const value = Number(filterParams[key]);

      if (!Number.isSafeInteger(value) ||
          (key === "limit" ? value <= 0 : value < 0)) {
        throw new Error(`Invalid ${key}`);
      }

      filters[key] = value;
    }
  }

  const bookings = await bookingRepository.searchBookings(filters);

  return bookings.map((booking) => ({
    ...booking,
    check_in_date: formatDate(booking.check_in_date),
    check_out_date: formatDate(booking.check_out_date),
    nights: calculateNights(
      booking.check_in_date,
      booking.check_out_date
    ),
  }));
}

export { createBookingSchema, validateCreateBooking } from "../validators/bookingValidator.js";

export default { getBookings };
