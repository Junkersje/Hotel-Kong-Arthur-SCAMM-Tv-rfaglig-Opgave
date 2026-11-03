
import { query } from './db.js';

export async function searchBookings({
  q = '',
  status = '',
  startDate = '',
  endDate = '',
  limit = 20,
  offset = 0
} = {}) {
  const conditions = [];
  const params = [];

  if (String(q).trim()) {
    const like = `%${String(q).trim()}%`;
    params.push(like);

    conditions.push(`(
      CAST(b.id AS TEXT) ILIKE $${params.length}
      OR g.name ILIKE $${params.length}
      OR g.email ILIKE $${params.length}
    )`);
  }

  if (status) {
    params.push(status);
    conditions.push(`b.status = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`b.check_in_date >= $${params.length}::date`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`b.check_in_date <= $${params.length}::date`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));
  const safeOffset = Math.max(0, Number.parseInt(offset, 10) || 0);

  params.push(safeLimit);
  const limitParam = params.length;

  params.push(safeOffset);
  const offsetParam = params.length;

  const sql = `
    SELECT
      b.id,
      b.guest_id,
      g.name AS guest_name,
      g.email AS guest_email,
      g.country AS guest_country,
      b.room_number,
      b.room_type_id,
      rt.name AS room_type_name,
      b.check_in_date,
      b.check_out_date,
      b.num_guests,
      b.total_price,
      b.status,
      b.created_at
    FROM booking b
    JOIN guest g ON b.guest_id = g.id
    JOIN room_type rt ON b.room_type_id = rt.id
    ${whereClause}
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT $${limitParam} OFFSET $${offsetParam}
  `;

  return await query(sql, params);
}
