
import { getAllTypes } from '../repositories/roomRepository.js';

/**
 * Henter og formaterer hotellets værelsestyper.
 * Data kommer fra roomRepository (T013).
 */
export async function getRoomTypes() {
  const roomTypes = await getAllTypes();

  return roomTypes.map((roomType) => ({
    id: roomType.id,
    name: roomType.name,
    capacity: roomType.capacity,
    description: roomType.description
  }));
}

export default { getRoomTypes };
