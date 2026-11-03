import { query } from './db.js';

/**
 * T014: Søg efter hotelreservationer.
 * Understøtter søgetekst, status, datointerval og pagination.
 */
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

  // Søg efter booking-ID, costumers navn eller email.
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

  // Filtrér efter bookingstatus.
  if (status) {
    params.push(status);
    conditions.push(`b.status = $${params.length}`);
  }

  // Filtrér efter check-in-dato.
  if (startDate) {
    params.push(startDate);
    conditions.push(`b.check_in_date >= $${params.length}`);
  }

  if (endDate) {
    params.push(endDate);
    conditions.push(`b.check_in_date <= $${params.length}`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  // Begræns antallet af resultater.
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
      b.room_number,
      b.room_type_id,
      rt.name AS room_type_name,
      b.check_in_date,
      b.check_out_date,
      b.occupants,
      b.total_price,
      b.status,
      b.created_at
    FROM BOOKING b
    JOIN COSTUMER c ON b.costumer_id = c.id
    LEFT JOIN COUNTRY cntry ON c.country_id = cntry.id
    JOIN ROOM r ON b.room_number = r.room_number
    JOIN ROOM_TYPE rt ON b.room_type_id = rt.id
    ${whereClause}
    ORDER BY b.created_at DESC, b.id DESC
    LIMIT ${safeLimit} OFFSET ${safeOffset}
  `;

  return await query(sql, params);
}
