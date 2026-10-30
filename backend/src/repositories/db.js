import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'hotel_user',
  password: process.env.DB_PASSWORD || 'hotel_pass',
  database: process.env.DB_NAME || 'hotel_kong_arthur',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: 'Z'
});

/**
 * Udfører en parameteriseret SQL-forespørgsel mod connection poolen.
 * @param {string} sql - SQL-forespørgsel med placeholders (?)
 * @param {Array} params - Parametre til forespørgslen
 * @returns {Promise<Array>} Resultatrækker
 */
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

/**
 * Udfører et callback inden for en atomar MySQL-transaktion.
 * Ruller automatisk tilbage ved fejl og frigiver altid forbindelsen.
 * @param {Function} callback - Async funktion der modtager connection: (conn) => Promise<any>
 * @returns {Promise<any>} Resultat fra callback
 */
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export default {
  pool,
  query,
  withTransaction
};
