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
    const search = String(q).trim();
    const like = `%${search}%`;
    const firstSearchParameter = params.length + 1;

    conditions.push(`(
      CAST(b.id AS TEXT) ILIKE $${firstSearchParameter}
      OR (c.first_name || ' ' || c.last_name) ILIKE $${firstSearchParameter + 1}
      OR c.email ILIKE $${firstSearchParameter + 2}
    )`);

    params.push(like, like, like);
  }

  if (status) {
    params.push(status);
    conditions.push(`b.status = $${params.length}`);
  }

  if (startDate) {
    params.push(startDate);
    conditions.push(`b.arrival >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(
      `b.arrival < ($${params.length}::date + INTERVAL '1 day')`
    );
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const safeLimit = Math.min(
    100,
    Math.max(1, Number.parseInt(limit, 10) || 20)
  );

  const safeOffset = Math.max(
    0,
    Number.parseInt(offset, 10) || 0
  );

  const sql = `
    SELECT
      b.id,
      b.costumer_id,
      (c.first_name || ' ' || c.last_name) AS costumer_name,
      c.email AS costumer_email,
      COALESCE(cntry.name, 'Ukendt') AS costumer_country,
      b.room_id,
      r.name AS room_number,
      r.room_type_id,
      rt.name AS room_type_name,
      b.arrival AS check_in_date,
      b.departure AS check_out_date,
      b.occupants,
      b.price AS total_price,
      b.status,
      b.order_date AS created_at
    FROM booking b
    JOIN costumer c ON b.costumer_id = c.id
    LEFT JOIN country cntry ON c.country_id = cntry.id
    JOIN room r ON b.room_id = r.id
    JOIN room_type rt ON r.room_type_id = rt.id
    ${whereClause}
    ORDER BY b.order_date DESC, b.id DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;

  return await query(sql, params);
}
