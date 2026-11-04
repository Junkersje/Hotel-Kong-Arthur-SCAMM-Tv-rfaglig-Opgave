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
  confirmed: 'bg-amber-100 text-amber-900 border-amber-300',
  checked_in: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  checked_out: 'bg-sky-100 text-sky-900 border-sky-300',
  completed: 'bg-sky-100 text-sky-900 border-sky-300',
  cancelled: 'bg-slate-200 text-slate-600 border-slate-300'
};

export const STATUS_DOT_COLORS = {
  confirmed: 'bg-amber-400',
  checked_in: 'bg-emerald-500',
  checked_out: 'bg-sky-500',
  completed: 'bg-sky-500',
  cancelled: 'bg-slate-400'
};

export const STATUS_ROW_STYLES = {
  confirmed: 'border-l-4 border-l-amber-400 bg-amber-50/60 hover:bg-amber-100/70',
  checked_in: 'border-l-4 border-l-emerald-500 bg-emerald-50/60 hover:bg-emerald-100/70',
  checked_out: 'border-l-4 border-l-sky-500 bg-sky-50/60 hover:bg-sky-100/70',
  completed: 'border-l-4 border-l-sky-500 bg-sky-50/60 hover:bg-sky-100/70',
  cancelled: 'border-l-4 border-l-slate-400 bg-slate-100/80 hover:bg-slate-200/70 text-slate-500'
};

function parseUtcDate(dateStr) {
  if (!dateStr) return NaN;
  const match = String(dateStr).substring(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return NaN;
    }
    const utcMs = Date.UTC(year, month - 1, day);
    const checkDate = new Date(utcMs);
    if (
      checkDate.getUTCFullYear() !== year ||
      checkDate.getUTCMonth() + 1 !== month ||
      checkDate.getUTCDate() !== day
    ) {
      return NaN;
    }
    return utcMs;
  }
  const d = new Date(dateStr);
  return d.getTime();
}

/**
 * Beregner antal overnattede nætter mellem to datoer.
 * @param {string} checkIn - YYYY-MM-DD
 * @param {string} checkOut - YYYY-MM-DD
 * @returns {number}
 */
export function calculateNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const start = parseUtcDate(checkIn);
  const end = parseUtcDate(checkOut);
  const diffTime = end - start;
  if (Number.isNaN(diffTime) || diffTime <= 0) return 0;
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
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
  if (booking.guest_name && String(booking.guest_name).trim()) {
    return String(booking.guest_name).trim();
  }
  if (booking.costumer_name && String(booking.costumer_name).trim()) {
    return String(booking.costumer_name).trim();
  }
  if (booking.customer_name && String(booking.customer_name).trim()) {
    return String(booking.customer_name).trim();
  }
  const combined = [booking.first_name, booking.last_name].filter(Boolean).join(' ').trim();
  if (combined) return combined;
  if (booking.name && String(booking.name).trim()) return String(booking.name).trim();
  return 'Ukendt gæst';
}

/**
 * Udtrækker totalpris i DKK på tværs af API-/databaseskema-varianter.
 * @param {object} booking
 * @returns {number}
 */
export function getBookingTotalPrice(booking) {
  if (!booking) return 0;
  const raw = booking.total_price ?? booking.total_price_dkk ?? booking.price ?? 0;
  const parsed = typeof raw === 'number' ? raw : parseFloat(raw);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Domæneklasse for en Booking-entitet i frontenden (OOP).
 */
export class BookingModel {
  constructor(raw = {}) {
    this.id = raw.id;
    this.guest_id = raw.guest_id ?? raw.costumer_id ?? raw.customer_id ?? null;
    this.guest_name = getGuestDisplayName(raw);

    const nameParts =
      this.guest_name && this.guest_name !== 'Ukendt gæst'
        ? this.guest_name.split(/\s+/)
        : [];
    this.first_name = raw.first_name ?? (nameParts[0] || '');
    this.last_name = raw.last_name ?? (nameParts.slice(1).join(' ') || '');

    this.email =
      raw.email ?? raw.costumer_email ?? raw.customer_email ?? raw.guest_email ?? '';
    this.phone =
      raw.phone ??
      raw.phone_number ??
      raw.costumer_phone ??
      raw.customer_phone ??
      raw.guest_phone ??
      '';
    this.phone_number = this.phone;
    this.country =
      raw.country ||
      raw.costumer_country ||
      raw.customer_country ||
      raw.guest_country ||
      'Ukendt';
    this.room_type_id = raw.room_type_id ?? raw.room?.room_type_id;
    this.room_type_name =
      raw.room_type_name ||
      raw.room?.room_type_name ||
      (this.room_type_id ? `Type #${this.room_type_id}` : 'Ukendt type');
    this.room_number = raw.room_number ?? raw.room?.room_number ?? raw.room?.name ?? null;
    this.check_in_date = formatDate(raw.check_in_date ?? raw.arrival);
    this.check_out_date = formatDate(raw.check_out_date ?? raw.departure);
    this.num_guests = Number(raw.num_guests ?? raw.occupants) || 1;
    this.total_price = getBookingTotalPrice(raw);
    this.total_price_dkk = this.total_price;
    this.status = raw.status || BOOKING_STATUSES.CONFIRMED;
    this.satisfaction_rating =
      raw.satisfaction_rating ?? raw.satisfaction_score ?? raw.star_rating ?? null;
    this.created_at = raw.created_at ?? raw.order_date ?? null;
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

  get statusDotClass() {
    return STATUS_DOT_COLORS[this.status] || 'bg-slate-400';
  }

  get statusRowClass() {
    return STATUS_ROW_STYLES[this.status] || 'border-l-4 border-l-slate-300 bg-white';
  }

  get formattedPrice() {
    return formatCurrency(this.total_price);
  }

  get formattedCreatedAt() {
    if (!this.created_at) return '—';
    return formatDate(this.created_at);
  }
}

/**
 * Validerer booking-input i henhold til forretningsregler.
 * @param {object} bookingData
 * @returns {{ isValid: boolean, errors: object }}
 */
export function validateBookingInput(bookingData = {}) {
  const errors = {};

  const usesSplitNameFields = 'first_name' in bookingData || 'last_name' in bookingData;

  if (usesSplitNameFields) {
    if (!bookingData.first_name || !bookingData.first_name.trim()) {
      errors.first_name = 'Fornavn er påkrævet.';
    }
    if (!bookingData.last_name || !bookingData.last_name.trim()) {
      errors.last_name = 'Efternavn er påkrævet.';
    }
  } else if (!bookingData.guest_name || !bookingData.guest_name.trim()) {
    errors.guest_name = 'Gæstens navn er påkrævet.';
  }

  if (
    bookingData.email !== undefined &&
    String(bookingData.email).trim() !== '' &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(bookingData.email).trim())
  ) {
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

/**
 * Sorterer bookinger med nyeste (hvornår kunden lavede bookingen: created_at / order_date, ellers id) først.
 * @param {Array<object>} list
 * @returns {Array<BookingModel>}
 */
export function sortBookingsByNewest(list = []) {
  return [...list].sort((a, b) => {
    const timeA = a?.created_at ? new Date(a.created_at).getTime() : NaN;
    const timeB = b?.created_at ? new Date(b.created_at).getTime() : NaN;

    const validA = !Number.isNaN(timeA);
    const validB = !Number.isNaN(timeB);

    if (validA && validB && timeA !== timeB) {
      return timeB - timeA;
    }
    if (validA && !validB) return -1;
    if (!validA && validB) return 1;

    return (Number(b?.id) || 0) - (Number(a?.id) || 0);
  });
}

/**
 * Finder hvilket søgekriterie (ID, navn, email, mobilnr.) der matchede søgningen til visning af relevans.
 * @param {BookingModel|object} raw
 * @param {string} searchQuery
 * @returns {string|null}
 */
export function getBookingMatchReason(raw, searchQuery = '') {
  const query = String(searchQuery || '').trim().toLowerCase();
  if (!query) return null;
  const booking = raw instanceof BookingModel ? raw : new BookingModel(raw);
  const cleanQuery = query.replace(/^#/, '');

  if (String(booking.id ?? '').toLowerCase() === cleanQuery) {
    return 'Eksakt ID';
  }
  if (String(booking.id ?? '').toLowerCase().includes(cleanQuery)) {
    return 'Booking ID';
  }
  if ((booking.guest_name || '').toLowerCase().includes(query)) {
    return 'Fulde navn';
  }
  if ((booking.email || '').toLowerCase().includes(query)) {
    return 'E-mail';
  }
  const normalizedPhone = String(booking.phone ?? '').replace(/\s+/g, '').toLowerCase();
  const normalizedPhoneQuery = query.replace(/\s+/g, '');
  if (normalizedPhone && normalizedPhone.includes(normalizedPhoneQuery)) {
    return 'Mobil nr.';
  }
  return 'Match';
}

/**
 * Filtrerer en liste af bookinger i henhold til søgetekst, statusfilter og datointerval.
 * Ekskluderer 'cancelled' fra den aktive liste medmindre 'cancelled' eller includeCancelled eksplicit er valgt.
 * @param {Array<object>} rawBookings
 * @param {object} [filters]
 * @param {string} [filters.searchQuery]
 * @param {string} [filters.statusFilter]
 * @param {string} [filters.fromDate]
 * @param {string} [filters.toDate]
 * @param {boolean} [filters.includeCancelled]
 * @returns {Array<object>}
 */
export function filterBookingsList(
  rawBookings = [],
  { searchQuery = '', statusFilter = '', fromDate = '', toDate = '', includeCancelled = false } = {}
) {
  if (!Array.isArray(rawBookings)) return [];

  const normalizedStatus = String(statusFilter || '').trim();
  const normalizedFrom = String(fromDate || '').trim();
  const normalizedTo = String(toDate || '').trim();
  const query = String(searchQuery || '').trim().toLowerCase();
  const cleanIdQuery = query.replace(/^#/, '');
  const compactPhoneQuery = query.replace(/\s+/g, '');

  return rawBookings.filter((raw) => {
    const booking = raw instanceof BookingModel ? raw : new BookingModel(raw);

    if (normalizedStatus && normalizedStatus !== 'all') {
      if (normalizedStatus === BOOKING_STATUSES.COMPLETED) {
        if (
          booking.status !== BOOKING_STATUSES.COMPLETED &&
          booking.status !== BOOKING_STATUSES.CHECKED_OUT
        ) {
          return false;
        }
      } else if (booking.status !== normalizedStatus) {
        return false;
      }
    } else if (!includeCancelled && normalizedStatus !== 'all' && booking.status === BOOKING_STATUSES.CANCELLED) {
      // Fjernes fra den aktive liste ved soft delete (US4 / SH-32) medmindre alle/cancelled er valgt
      return false;
    }

    if (
      normalizedFrom &&
      booking.check_out_date &&
      booking.check_out_date !== '—' &&
      booking.check_out_date < normalizedFrom
    ) {
      return false;
    }
    if (
      normalizedTo &&
      booking.check_in_date &&
      booking.check_in_date !== '—' &&
      booking.check_in_date > normalizedTo
    ) {
      return false;
    }

    if (!query) {
      return true;
    }

    const idMatch = String(booking.id ?? '').toLowerCase().includes(cleanIdQuery);
    const nameMatch = (booking.guest_name || '').toLowerCase().includes(query);
    const firstNameMatch = (booking.first_name || '').toLowerCase().includes(query);
    const lastNameMatch = (booking.last_name || '').toLowerCase().includes(query);
    const emailMatch = (booking.email || '').toLowerCase().includes(query);
    const phoneRaw = String(booking.phone || booking.phone_number || '').toLowerCase();
    const phoneMatch =
      phoneRaw.includes(query) ||
      (compactPhoneQuery.length > 0 && phoneRaw.replace(/\s+/g, '').includes(compactPhoneQuery));
    const roomMatch = String(booking.room_number ?? '').toLowerCase().includes(query);
    const roomTypeMatch = (booking.room_type_name || '').toLowerCase().includes(query);
    const countryMatch = (booking.country || '').toLowerCase().includes(query);

    return (
      idMatch ||
      nameMatch ||
      firstNameMatch ||
      lastNameMatch ||
      emailMatch ||
      phoneMatch ||
      roomMatch ||
      roomTypeMatch ||
      countryMatch
    );
  });
}

export default BookingModel;
