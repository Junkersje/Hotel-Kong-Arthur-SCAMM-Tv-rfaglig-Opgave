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
      c.first_name,
      c.last_name,
      (c.first_name || ' ' || c.last_name) AS costumer_name,
      c.email AS costumer_email,
      c.phone_number AS costumer_phone,
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
      b.star_rating,
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

/**
 * Henter et land ud fra navn eller opretter det hvis det ikke eksisterer (T018).
 * @param {string|number} country
 * @param {object} [client]
 * @returns {Promise<number|null>} country_id
 */
export async function findOrCreateCountry(country, client = null) {
  if (!country) return null;
  if (typeof country === 'number') return country;

  const countryName = String(country).trim();
  const selectSql = `SELECT id, name FROM country WHERE LOWER(name) = LOWER($1)`;
  const selectRows = client
    ? (await client.query(selectSql, [countryName])).rows
    : await query(selectSql, [countryName]);

  if (selectRows && selectRows.length > 0) {
    return selectRows[0].id;
  }

  const insertSql = `INSERT INTO country (name) VALUES ($1) RETURNING id, name`;
  const insertRows = client
    ? (await client.query(insertSql, [countryName])).rows
    : await query(insertSql, [countryName]);

  return insertRows?.[0]?.id ?? null;
}

/**
 * Finder en kunde på email i costumer-tabellen.
 * @param {string} email
 * @param {object} [client]
 * @returns {Promise<Object|null>}
 */
export async function findCustomerByEmail(email, client = null) {
  const sql = `SELECT id, first_name, last_name, email, phone_number, country_id FROM costumer WHERE LOWER(email) = LOWER($1)`;
  const rows = client
    ? (await client.query(sql, [String(email).trim()])).rows
    : await query(sql, [String(email).trim()]);
  return rows?.[0] || null;
}

/**
 * Opretter en ny kunde i costumer-tabellen med RETURNING id.
 * @param {Object} customerData
 * @param {object} [client]
 * @returns {Promise<number>} customerId
 */
export async function createCustomer({ firstName, lastName, email, phoneNumber, countryId }, client = null) {
  const sql = `
    INSERT INTO costumer (first_name, last_name, email, phone_number, country_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `;
  const params = [firstName, lastName, email, phoneNumber, countryId];
  const rows = client
    ? (await client.query(sql, params)).rows
    : await query(sql, params);
  return rows?.[0]?.id;
}

/**
 * Opdaterer en kundes oplysninger.
 * @param {number} customerId
 * @param {Object} customerData
 * @param {object} [client]
 */
export async function updateCustomer(customerId, { firstName, lastName, email, phoneNumber, countryId }, client = null) {
  if (email !== undefined) {
    const sql = `
      UPDATE costumer
      SET first_name = $1, last_name = $2, email = $3, phone_number = $4, country_id = $5
      WHERE id = $6
    `;
    const params = [firstName, lastName, email, phoneNumber, countryId, customerId];
    return client ? await client.query(sql, params) : await query(sql, params);
  } else {
    const sql = `
      UPDATE costumer 
      SET first_name = $1, last_name = $2, phone_number = COALESCE($3, phone_number), country_id = COALESCE($4, country_id)
      WHERE id = $5
    `;
    const params = [firstName, lastName, phoneNumber, countryId, customerId];
    return client ? await client.query(sql, params) : await query(sql, params);
  }
}

/**
 * Finder eksisterende kunde på email eller opretter en ny (T018).
 * @param {Object} customerData
 * @param {object} [client]
 * @returns {Promise<number>} customerId
 */
export async function findOrCreateCustomer({ firstName, lastName, email, phoneNumber, countryId }, client = null) {
  const existing = await findCustomerByEmail(email, client);
  if (existing) {
    await updateCustomer(existing.id, { firstName, lastName, phoneNumber, countryId }, client);
    return existing.id;
  }
  return await createCustomer({ firstName, lastName, email, phoneNumber, countryId }, client);
}

/**
 * Henter en booking ud fra ID med tilhørende kunde- og værelsesdata (T023).
 * Understøtter PostgreSQL rækkelåsning (FOR UPDATE OF b).
 * @param {number} id
 * @param {Object} [options]
 * @param {boolean} [options.lock=false]
 * @param {object} [client]
 * @returns {Promise<Object|null>}
 */
export async function getBookingById(id, { lock = false } = {}, client = null) {
  const sql = `
    SELECT b.*, c.first_name, c.last_name, c.email, c.phone_number, c.country_id,
           r.room_type_id AS current_room_type_id, r.name AS current_room_number
    FROM booking b
    JOIN costumer c ON b.costumer_id = c.id
    JOIN room r ON b.room_id = r.id
    WHERE b.id = $1
    ${lock ? 'FOR UPDATE OF b' : ''}
  `;
  const rows = client
    ? (await client.query(sql, [id])).rows
    : await query(sql, [id]);
  return rows?.[0] || null;
}

/**
 * Opretter en ny bookingpost i booking tabellen med RETURNING (T018).
 * @param {Object} data
 * @param {object} [client]
 * @returns {Promise<Object>}
 */
export async function insertBooking(data, client = null) {
  const sql = `
    INSERT INTO booking (
      costumer_id, order_date, room_id, arrival, departure, 
      season_id, occupants, price, status, star_rating, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id, order_date
  `;
  const params = [
    data.costumerId,
    data.orderDate,
    data.roomId,
    data.arrival,
    data.departure,
    data.seasonId,
    data.occupants,
    data.price,
    data.status || 'confirmed',
    data.starRating ?? 5,
    data.updatedAt || data.orderDate
  ];
  const rows = client
    ? (await client.query(sql, params)).rows
    : await query(sql, params);
  return rows?.[0] || null;
}

/**
 * Opdaterer en booking i booking tabellen (T023).
 * @param {number} bookingId
 * @param {Object} data
 * @param {object} [client]
 */
export async function updateBooking(bookingId, data, client = null) {
  const sql = `
    UPDATE booking
    SET room_id = $1, arrival = $2, departure = $3, occupants = $4, price = $5, status = $6, updated_at = $7
    WHERE id = $8
  `;
  const params = [
    data.roomId,
    data.arrival,
    data.departure,
    data.occupants,
    data.price,
    data.status,
    data.updatedAt,
    bookingId
  ];
  return client ? await client.query(sql, params) : await query(sql, params);
}

/**
 * Aflyser en booking (soft delete, T028) og returnerer opdateret række.
 * @param {number} bookingId
 * @param {object} [client]
 * @returns {Promise<Object|null>}
 */
export async function cancelBooking(bookingId, client = null) {
  const now = new Date();
  const sql = `
    UPDATE booking
    SET status = 'cancelled', updated_at = $1
    WHERE id = $2
    RETURNING id, costumer_id, room_id, arrival, departure, occupants, price, status, order_date, updated_at
  `;
  const rows = client
    ? (await client.query(sql, [now, bookingId])).rows
    : await query(sql, [now, bookingId]);
  return rows?.[0] || null;
}

export default {
  searchBookings,
  findOrCreateCountry,
  findCustomerByEmail,
  createCustomer,
  updateCustomer,
  findOrCreateCustomer,
  getBookingById,
  insertBooking,
  updateBooking,
  cancelBooking
};
