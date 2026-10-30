/**
 * Clean Code: Centraliserede domænekonstanter
 * Eliminerer magiske tal og strenge på tværs af backend-arkitekturen.
 */

export const TOTAL_HOTEL_ROOMS = 214;
export const MIN_GUESTS_PER_ROOM = 1;
export const MAX_GUESTS_PER_ROOM = 4;

export const BOOKING_STATUS = Object.freeze({
  CONFIRMED: 'confirmed',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  CANCELLED: 'cancelled'
});

export const PRODUCT_CATEGORIES = Object.freeze({
  COCKTAIL: 'cocktail',
  COFFEE: 'coffee',
  OTHER: 'other'
});

export const HELENE_CHRISTINE_CODE = 'HC01';

export const SEASONS = Object.freeze({
  LOW: 'Lavsæson',
  MID: 'Mellemsæson',
  HIGH: 'Højsæson'
});
