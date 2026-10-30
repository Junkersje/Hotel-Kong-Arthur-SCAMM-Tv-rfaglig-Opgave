import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'hotel_admin',
  password: process.env.DB_PASSWORD || 'secret_password_here',
  database: process.env.DB_NAME || 'hotel_kong_arthur',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true
});

/**
 * Standard parameterized query runner.
 * @param {string} sql
 * @param {Array<any>} [params]
 * @returns {Promise<Array<any>>}
 */
export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

/**
 * Atomisk transaktionshjælper.
 * Reserverer automatisk en connection fra poolen, udfører callback,
 * committer ved succes og ruller sikkert tilbage ved fejl.
 * @param {Function} callback (connection) => Promise<any>
 * @returns {Promise<any>}
 */
export async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export default {
  pool,
  query,
  withTransaction
};
