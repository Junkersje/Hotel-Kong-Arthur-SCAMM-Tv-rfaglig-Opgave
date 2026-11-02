import { pool, query, withTransaction } from '../repositories/db.js';

if (typeof module !== 'undefined' && module.exports) {
  module.exports = pool;
}

export { pool, query, withTransaction };
export default pool;
