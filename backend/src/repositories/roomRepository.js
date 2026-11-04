import { query } from './db.js';

export async function getAllTypes() {
    const sql = `
        SELECT
            id,
            name,
            max_capacity AS capacity
        FROM ROOM_TYPE
        ORDER BY max_capacity ASC, id ASC
    `;

  const roomTypes = await query(sql);
  return roomTypes;
}

export async function getAll() {
    const sql = `
        SELECT
            r.id,
            r.name AS room_number,
            r.room_type_id,
            rt.name AS room_type_name,
            rt.max_capacity AS capacity
        FROM ROOM r
        JOIN ROOM_TYPE rt ON r.room_type_id = rt.id
        ORDER BY r.name ASC, r.id ASC
    `;

    const rooms = await query(sql);

    return rooms;
}

export async function getAvailableRooms(roomTypeId, checkIn, checkOut) {
  const sql = `
    SELECT
      r.id,
      r.name AS room_number,
      r.name,
      r.room_type_id,
      rt.name AS room_type_name,
      rt.max_capacity AS capacity
    FROM room r
    JOIN room_type rt ON r.room_type_id = rt.id
    WHERE r.room_type_id = $1
      AND NOT EXISTS (
        SELECT 1
        FROM booking b
        WHERE b.room_id = r.id
          AND b.status != 'cancelled'
          AND b.arrival < $2::timestamp
          AND b.departure > $3::timestamp
      )
    ORDER BY r.name ASC, r.id ASC
  `;

  return await query(sql, [roomTypeId, checkOut, checkIn]);
}

export default {
  getAllTypes,
  getAll,
  getAvailableRooms
};
