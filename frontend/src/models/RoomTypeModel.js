/**
 * MVVM: Model Layer - RoomTypeModel
 * Repræsenterer de 8 officielle værelsestyper og hotellets kapacitetsmodel.
 */

export const OFFICIAL_ROOM_TYPES = [
  { id: 1, name: 'Standard enkeltværelse', capacity: 1, basePrice: 1050 },
  { id: 2, name: 'Grand lit værelse', capacity: 2, basePrice: 1250 },
  { id: 3, name: 'Standard dobbeltværelse', capacity: 2, basePrice: 1400 },
  { id: 4, name: 'Superior dobbeltværelse', capacity: 3, basePrice: 1700 },
  { id: 5, name: 'Junior suite', capacity: 3, basePrice: 2150 },
  { id: 6, name: 'Spa executive', capacity: 2, basePrice: 2400 },
  { id: 7, name: 'Suite', capacity: 4, basePrice: 3000 },
  { id: 8, name: 'LOFT suite', capacity: 4, basePrice: 3500 }
];

export const TOTAL_HOTEL_ROOMS = 214;
export const MAX_GUESTS_PER_ROOM = 4;

/**
 * Finder værelsestype ud fra ID.
 * @param {number|string} id
 * @returns {object|undefined}
 */
export function getRoomTypeById(id) {
  const numId = parseInt(id, 10);
  return OFFICIAL_ROOM_TYPES.find(rt => rt.id === numId);
}
