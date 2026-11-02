import { query } from './db.js';

export async function getAllTypes() {
    const sql = `
        SELECT id, name, capacity, description
        FROM ROOM_TYPE
        ORDER BY capacity ASC, id ASC
    `;

    const roomTypes = await query(sql);

    return roomTypes;
}  

export async function getAll() {
    const sql = `
        SELECT
            r.room_number,
            r.room_type_id,
            r.floor,
            r.status,
            rt.name AS room_type_name,
            rt.capacity,
            rt.description
        FROM ROOM r
        JOIN ROOM_TYPE rt ON r.room_type_id = rt.id
        ORDER BY r.room_number ASC
    `;

    const rooms = await query(sql);

    return rooms;
}

export async function getAvailableRooms(roomTypeId, checkIn, checkOut) {
    const sql = `
        SELECT
            r.room_number,
            r.room_type_id,
            r.floor,
            r.status,
            rt.name AS room_type_name
        FROM ROOM r
        JOIN ROOM_TYPE rt ON r.room_type_id = rt.id
        WHERE r.room_type_id = $1
          AND r.status = 'available'
          AND NOT EXISTS (
              SELECT 1
              FROM BOOKING b
              WHERE b.room_number = r.room_number
                AND b.status IN ('confirmed', 'checked_in')
                AND b.check_in_date < $2
                AND b.check_out_date > $3
          )
        ORDER BY r.room_number ASC
    `;

    return await query(sql, [roomTypeId, checkOut, checkIn]);
}