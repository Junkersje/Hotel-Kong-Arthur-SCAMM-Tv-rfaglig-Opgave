/**
 * MVVM: Model Layer - BookingModel
 * Repræsenterer booking-domænemodellen (OOP), konstanter, valideringsregler og formateringshjælpere.
 */

export const MAX_GUESTS_PER_ROOM = 4;
export const MIN_GUESTS_PER_ROOM = 1;

export const BOOKING_STATUSES = {
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const STATUS_LABELS = {
  confirmed: 'Bekræftet',
  checked_in: 'Indtjekket',
  checked_out: 'Udtjekket',
  completed: 'Gennemført',
  cancelled: 'Annulleret'
};

export const STATUS_COLORS = {
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  checked_in: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  checked_out: 'bg-slate-100 text-slate-700 border-slate-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  cancelled: 'bg-rose-50 text-rose-700 border-rose-200'
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
  if (Number.isNaN(diffTime) || diffTime <= 0) return 0;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Formaterer en datostreng til YYYY-MM-DD visning.
 * @param {string|Date} dateValue
 * @returns {string}
 */
export function formatDate(dateValue) {
  if (!dateValue) return '—';
  if (typeof dateValue === 'string') {
    return dateValue.substring(0, 10);
  }
  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    return dateValue.toISOString().substring(0, 10);
  }
  return String(dateValue);
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

/**
 * Udtrækker gæstens fulde navn på tværs af API-/databaseskema-varianter.
 * @param {object} booking
 * @returns {string}
 */
export function getGuestDisplayName(booking) {
  if (!booking) return 'Ukendt gæst';
  if (booking.guest_name && booking.guest_name.trim()) {
    return booking.guest_name.trim();
  }
  const combined = [booking.first_name, booking.last_name].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  if (booking.name && booking.name.trim()) return booking.name.trim();
  return 'Ukendt gæst';
}

/**
 * Udtrækker totalpris i DKK på tværs af API-/databaseskema-varianter.
 * @param {object} booking
 * @returns {number}
 */
export function getBookingTotalPrice(booking) {
  if (!booking) return 0;
  const raw = booking.total_price ?? booking.total_price_dkk ?? 0;
  const parsed = typeof raw === 'number' ? raw : parseFloat(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Domæneklasse for en Booking-entitet i frontenden (OOP).
 */
export class BookingModel {
  constructor(raw = {}) {
    this.id = raw.id;
    this.guest_id = raw.guest_id ?? null;
    this.guest_name = getGuestDisplayName(raw);
    this.first_name = raw.first_name ?? '';
    this.last_name = raw.last_name ?? '';
    this.email = raw.email ?? '';
    this.phone = raw.phone ?? '';
    this.country = raw.country || 'Ukendt';
    this.room_type_id = raw.room_type_id;
    this.room_type_name = raw.room_type_name || (raw.room_type_id ? `Type #${raw.room_type_id}` : 'Ukendt type');
    this.room_number = raw.room_number ?? null;
    this.check_in_date = formatDate(raw.check_in_date);
    this.check_out_date = formatDate(raw.check_out_date);
    this.num_guests = Number(raw.num_guests) || 1;
    this.total_price = getBookingTotalPrice(raw);
    this.total_price_dkk = this.total_price;
    this.status = raw.status || BOOKING_STATUSES.CONFIRMED;
    this.satisfaction_rating = raw.satisfaction_rating ?? raw.satisfaction_score ?? null;
  }

  get nights() {
    return calculateNights(this.check_in_date, this.check_out_date);
  }

  get isCancelled() {
    return this.status === BOOKING_STATUSES.CANCELLED;
  }

  get statusLabel() {
    return STATUS_LABELS[this.status] || this.status;
  }

  get statusColorClass() {
    return STATUS_COLORS[this.status] || 'bg-slate-100 text-slate-800 border-slate-200';
  }

  get formattedPrice() {
    return formatCurrency(this.total_price);
  }
}

/**
 * Validerer booking-input i henhold til forretningsregler.
 * @param {object} bookingData
 * @returns {{ isValid: boolean, errors: object }}
 */
export function validateBookingInput(bookingData = {}) {
  const errors = {};

  const hasFullName = bookingData.guest_name && bookingData.guest_name.trim().length > 0;
  const hasSplitName =
    bookingData.first_name &&
    bookingData.first_name.trim().length > 0 &&
    bookingData.last_name &&
    bookingData.last_name.trim().length > 0;

  if (!hasFullName && !hasSplitName) {
    if ('guest_name' in bookingData) {
      errors.guest_name = 'Gæstens navn er påkrævet.';
    } else {
      if (!bookingData.first_name || !bookingData.first_name.trim()) {
        errors.first_name = 'Fornavn er påkrævet.';
      }
      if (!bookingData.last_name || !bookingData.last_name.trim()) {
        errors.last_name = 'Efternavn er påkrævet.';
      }
    }
  }

  if (bookingData.email !== undefined && (!bookingData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bookingData.email))) {
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
  if (Number.isNaN(guests) || guests < MIN_GUESTS_PER_ROOM || guests > MAX_GUESTS_PER_ROOM) {
    errors.num_guests = `Antal gæster skal være mellem ${MIN_GUESTS_PER_ROOM} og ${MAX_GUESTS_PER_ROOM}.`;
  }

  if (!bookingData.room_type_id) {
    errors.room_type_id = 'Vælg venligst en værelsestype.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

export default BookingModel;
