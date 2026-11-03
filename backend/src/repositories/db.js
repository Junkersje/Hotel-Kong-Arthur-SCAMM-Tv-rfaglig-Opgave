import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool, types } = pg;

types.setTypeParser(types.builtins.INT8, (value) => Number.parseInt(value, 10));
types.setTypeParser(types.builtins.NUMERIC, (value) => Number.parseFloat(value));

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'hotel_admin',
  password: process.env.DB_PASSWORD || 'secret_password_here',
  database: process.env.DB_NAME || 'hotel_kong_arthur',
  max: 10
});

/**
 * Standard parameterized query runner.
 * @param {string} sql
 * @param {Array<any>} [params]
 * @returns {Promise<Array<any>>}
 */
export async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

/**
 * Atomisk transaktionshjælper.
 * Reserverer automatisk en connection fra poolen, udfører callback,
 * committer ved succes og ruller sikkert tilbage ved fejl.
 * @param {Function} callback (connection) => Promise<any>
 * @returns {Promise<any>}
 */
export async function withTransaction(callback) {
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    const result = await callback(connection);
    await connection.query('COMMIT');
    return result;
  } catch (error) {
    await connection.query('ROLLBACK');
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
