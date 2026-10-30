/**
 * MVVM: Model Layer - BookingModel
 * Repræsenterer booking-domænemodellen, valideringsregler og forretningsberegninger i frontenden.
 */

export const BOOKING_STATUSES = {
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  CANCELLED: 'cancelled'
};

export const STATUS_LABELS = {
  confirmed: 'Bekræftet',
  checked_in: 'Indtjekket',
  checked_out: 'Udtjekket',
  cancelled: 'Annulleret'
};

export const STATUS_COLORS = {
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  checked_in: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  checked_out: 'bg-slate-100 text-slate-800 border-slate-200',
  cancelled: 'bg-rose-100 text-rose-800 border-rose-200'
};

/**
 * Beregner antal overnattede nætter mellem to datoer.
 * @param {string} checkIn - YYYY-MM-DD
 * @param {string} checkOut - YYYY-MM-DD
 * @returns {number}
 */
export function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diffTime = end - start;
  if (diffTime <= 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Validerer booking-input forretningsregler.
 * @param {object} bookingData
 * @returns {{ isValid: boolean, errors: object }}
 */
export function validateBookingInput(bookingData) {
  const errors = {};

  if (!bookingData.first_name || bookingData.first_name.trim().length === 0) {
    errors.first_name = 'Fornavn er påkrævet.';
  }

  if (!bookingData.last_name || bookingData.last_name.trim().length === 0) {
    errors.last_name = 'Efternavn er påkrævet.';
  }

  if (!bookingData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.email)) {
    errors.email = 'Indtast en gyldig e-mailadresse.';
  }

  if (!bookingData.check_in_date) {
    errors.check_in_date = 'Ankomstdato er påkrævet.';
  }

  if (!bookingData.check_out_date) {
    errors.check_out_date = 'Afrejsedato er påkrævet.';
  } else if (bookingData.check_in_date && bookingData.check_out_date <= bookingData.check_in_date) {
    errors.check_out_date = 'Afrejsedato skal være efter ankomstdato.';
  }

  const guests = parseInt(bookingData.num_guests, 10);
  if (isNaN(guests) || guests < 1 || guests > 4) {
    errors.num_guests = 'Antal gæster skal være mellem 1 og 4.';
  }

  if (!bookingData.room_type_id) {
    errors.room_type_id = 'Vælg venligst en værelsestype.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Formaterer valuta til DKK.
 * @param {number|string} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    maximumFractionDigits: 0
  }).format(num);
}
