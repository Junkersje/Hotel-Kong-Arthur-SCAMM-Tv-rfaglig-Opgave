/**
 * MVVM: Model Layer - RoomTypeModel
 * Repræsenterer de 8 officielle værelsestyper på Hotel Kong Arthur.
 */

export const DEFAULT_ROOM_TYPES = [
  { id: 1, name: 'Standard Single', capacity: 1, base_price_dkk: 1050 },
  { id: 2, name: 'Grand Lit', capacity: 2, base_price_dkk: 1250 },
  { id: 3, name: 'Standard Double', capacity: 2, base_price_dkk: 1400 },
  { id: 4, name: 'Superior Double', capacity: 2, base_price_dkk: 1700 },
  { id: 5, name: 'Junior Suite', capacity: 3, base_price_dkk: 2150 },
  { id: 6, name: 'Spa Executive', capacity: 2, base_price_dkk: 2400 },
  { id: 7, name: 'Suite', capacity: 4, base_price_dkk: 3000 },
  { id: 8, name: 'LOFT Suite', capacity: 4, base_price_dkk: 3500 }
];

export class RoomTypeModel {
  constructor(raw = {}) {
    this.id = Number(raw.id);
    this.name = raw.name || `Type #${this.id}`;
    this.capacity = Number(raw.capacity) || 2;
    this.description = raw.description || '';
    this.base_price_dkk =
      Number(raw.base_price_dkk) ||
      DEFAULT_ROOM_TYPES.find((rt) => rt.id === this.id)?.base_price_dkk ||
      1500;
  }
}

export default RoomTypeModel;
