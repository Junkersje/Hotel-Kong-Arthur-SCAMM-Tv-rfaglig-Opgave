/**
 * MVVM: Model Layer - RoomTypeModel
 * Repræsenterer de 8 officielle værelsestyper på Hotel Kong Arthur.
 */

export const DEFAULT_ROOM_TYPES = [
  { id: 1, name: 'Standard Single', capacity: 1, base_price_dkk: 1050, base_price_indicative: '900–1.200 DKK' },
  { id: 2, name: 'Grand Lit', capacity: 2, base_price_dkk: 1250, base_price_indicative: '1.100–1.400 DKK' },
  { id: 3, name: 'Standard Double', capacity: 2, base_price_dkk: 1400, base_price_indicative: '1.200–1.600 DKK' },
  { id: 4, name: 'Superior Double', capacity: 3, base_price_dkk: 1700, base_price_indicative: '1.400–2.000 DKK' },
  { id: 5, name: 'Junior Suite', capacity: 4, base_price_dkk: 2150, base_price_indicative: '1.800–2.500 DKK' },
  { id: 6, name: 'Spa Executive', capacity: 2, base_price_dkk: 2400, base_price_indicative: '2.000–2.800 DKK' },
  { id: 7, name: 'Suite', capacity: 4, base_price_dkk: 3000, base_price_indicative: '2.500–3.500 DKK' },
  { id: 8, name: 'LOFT Suite', capacity: 4, base_price_dkk: 3500, base_price_indicative: '3.000–4.000 DKK' }
];

export class RoomTypeModel {
  constructor(raw = {}) {
    this.id = Number(raw.id);
    const defaultType = DEFAULT_ROOM_TYPES.find((rt) => rt.id === this.id);
    this.name = raw.name || defaultType?.name || `Type #${this.id}`;
    this.capacity = Math.max(Number(raw.capacity) || 0, defaultType?.capacity || 2);
    this.description = raw.description || '';
    this.base_price_indicative =
      raw.base_price_indicative || defaultType?.base_price_indicative || '900–4.000 DKK';
    this.base_price_dkk =
      Number(raw.base_price_dkk) || defaultType?.base_price_dkk || 1500;
  }
}

export default RoomTypeModel;
