/**
 * OOP Domain Model: RoomType
 * Repræsenterer en værelsestype med kapacitet og basispris.
 */

export class RoomType {
  constructor({ id, name, description = '', capacity, basePriceDkk }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.capacity = parseInt(capacity, 10);
    this.basePriceDkk = parseFloat(basePriceDkk);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      capacity: this.capacity,
      base_price_dkk: this.basePriceDkk
    };
  }
}
