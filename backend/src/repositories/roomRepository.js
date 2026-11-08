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

/**
 * Finder og låser et ledigt værelse for en given værelsestype i perioden (T018/T023).
 * Anvender PostgreSQL FOR UPDATE OF r til at forhindre race conditions / overbooking.
 *
 * @param {Object} options
 * @param {number} options.roomTypeId
 * @param {string} options.checkIn
 * @param {string} options.checkOut
 * @param {number} [options.excludeBookingId]
 * @param {number} [options.preferRoomId]
 * @param {object} [client] - Valgfri dedikeret PostgreSQL transaktionsklient
 * @returns {Promise<Object|null>}
 */
export async function findAndLockAvailableRoom(
  { roomTypeId, checkIn, checkOut, excludeBookingId = null, preferRoomId = null },
  client = null
) {
  let sql;
  let params;

  if (excludeBookingId != null) {
    sql = `
      SELECT r.id, r.name, rt.name AS room_type_name
      FROM room r
      JOIN room_type rt ON r.room_type_id = rt.id
      WHERE r.room_type_id = $1
        AND r.id NOT IN (
          SELECT b.room_id
          FROM booking b
          WHERE b.id != $4
            AND b.status NOT IN ('cancelled', 'canceled')
            AND b.arrival < $3::timestamp
            AND b.departure > $2::timestamp
        )
      ORDER BY CASE WHEN r.id = $5 THEN 0 ELSE 1 END, r.id ASC
      LIMIT 1
      FOR UPDATE OF r
    `;
    params = [roomTypeId, checkIn, checkOut, excludeBookingId, preferRoomId ?? -1];
  } else {
    sql = `
      SELECT r.id, r.name, rt.name AS room_type_name
      FROM room r
      JOIN room_type rt ON r.room_type_id = rt.id
      WHERE r.room_type_id = $1
        AND r.id NOT IN (
          SELECT b.room_id
          FROM booking b
          WHERE b.status NOT IN ('cancelled', 'canceled')
            AND b.arrival < $3::timestamp
            AND b.departure > $2::timestamp
        )
      ORDER BY r.id ASC
      LIMIT 1
      FOR UPDATE OF r
    `;
    params = [roomTypeId, checkIn, checkOut];
  }

  const rows = client ? (await client.query(sql, params)).rows : await query(sql, params);
  return rows?.[0] || null;
}

/**
 * Henter sæson-ID ud fra sæsonnavn (low, mid, high).
 * @param {string} seasonName
 * @param {object} [client]
 * @returns {Promise<Object|null>}
 */
export async function getSeasonByName(seasonName, client = null) {
  const sql = `SELECT id FROM season WHERE LOWER(name) = LOWER($1) LIMIT 1`;
  const rows = client ? (await client.query(sql, [seasonName])).rows : await query(sql, [seasonName]);
  return rows?.[0] || null;
}

/**
 * Henter dagspris for en værelsestype og sæson fra room_price tabellen.
 * @param {number} roomTypeId
 * @param {number} seasonId
 * @param {object} [client]
 * @returns {Promise<Object|null>}
 */
export async function getRoomPrice(roomTypeId, seasonId, client = null) {
  const sql = `SELECT price_pr_night FROM room_price WHERE room_type_id = $1 AND season_id = $2`;
  const rows = client ? (await client.query(sql, [roomTypeId, seasonId])).rows : await query(sql, [roomTypeId, seasonId]);
  return rows?.[0] || null;
}

export default {
  getAllTypes,
  getAll,
  getAvailableRooms,
  findAndLockAvailableRoom,
  getSeasonByName,
  getRoomPrice
};
