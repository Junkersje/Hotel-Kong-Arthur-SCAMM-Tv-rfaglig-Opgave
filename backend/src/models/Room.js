/**
 * OOP Domain Model: Room
 * Repræsenterer et fysisk værelse på Hotel Kong Arthur.
 */

export class Room {
  constructor({ id, roomNumber, roomTypeId, floor, isActive = true, roomType = null }) {
    this.id = id;
    this.roomNumber = roomNumber;
    this.roomTypeId = roomTypeId;
    this.floor = parseInt(floor, 10);
    this.isActive = Boolean(isActive);
    this.roomType = roomType;
  }

  toJSON() {
    return {
      id: this.id,
      room_number: this.roomNumber,
      room_type_id: this.roomTypeId,
      floor: this.floor,
      is_active: this.isActive,
      room_type: this.roomType ? (this.roomType.toJSON ? this.roomType.toJSON() : this.roomType) : undefined
    };
  }
}
