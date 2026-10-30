/**
 * Data Access Layer: RoomRepository (OOP Class)
 * Single Responsibility: SQL-forespørgsler vedrørende værelser og værelsestyper.
 */

import { query } from './db.js';
import { Room } from '../models/Room.js';
import { RoomType } from '../models/RoomType.js';

export class RoomRepository {
  /**
   * Henter alle 8 officielle værelsestyper.
   * @returns {Promise<RoomType[]>}
   */
  async getAllTypes() {
    const sql = `
      SELECT id, name, description, capacity, base_price_dkk
      FROM room_types
      ORDER BY id ASC
    `;
    const rows = await query(sql);
    return rows.map(r => new RoomType({
      id: r.id,
      name: r.name,
      description: r.description,
      capacity: r.capacity,
      basePriceDkk: r.base_price_dkk
    }));
  }

  /**
   * Henter en specifik værelsestype.
   * @param {number} id
   * @returns {Promise<RoomType|null>}
   */
  async getTypeById(id) {
    const sql = `
      SELECT id, name, description, capacity, base_price_dkk
      FROM room_types
      WHERE id = ?
    `;
    const rows = await query(sql, [id]);
    if (rows.length === 0) return null;
    const r = rows[0];
    return new RoomType({
      id: r.id,
      name: r.name,
      description: r.description,
      capacity: r.capacity,
      basePriceDkk: r.base_price_dkk
    });
  }

  /**
   * Henter alle 214 værelser med tilhørende værelsestype.
   * @returns {Promise<Room[]>}
   */
  async getAll() {
    const sql = `
      SELECT r.id, r.room_number, r.room_type_id, r.floor, r.is_active,
             rt.name as type_name, rt.capacity, rt.base_price_dkk
      FROM rooms r
      JOIN room_types rt ON r.room_type_id = rt.id
      ORDER BY r.floor ASC, r.room_number ASC
    `;
    const rows = await query(sql);
    return rows.map(r => new Room({
      id: r.id,
      roomNumber: r.room_number,
      roomTypeId: r.room_type_id,
      floor: r.floor,
      isActive: r.is_active,
      roomType: new RoomType({
        id: r.room_type_id,
        name: r.type_name,
        capacity: r.capacity,
        basePriceDkk: r.base_price_dkk
      })
    }));
  }
}

export default new RoomRepository();
