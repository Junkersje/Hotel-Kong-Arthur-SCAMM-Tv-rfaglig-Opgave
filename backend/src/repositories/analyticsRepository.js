import pool from '../config/database.js';

// Tilpas til jeres databasetilslutning/pool ift. jeres projekt
const db = pool;

/**
 * Repository for Data Analytics & Nøgletal (Data Access Layer)
 */
const analyticsRepository = {
  db,

  /**
   * Henter samlet værelsesomsætning for ikke-aflyste bookinger.
   */
  async getTotalRoomRevenue() {
    const sql = `
      SELECT 
        COALESCE(SUM(total_price), 0) AS total_room_revenue,
        COUNT(id) AS total_valid_bookings
      FROM BOOKING
      WHERE status != 'cancelled'
    `;
    const [rows] = await (this?.db || db).query(sql);
    return rows[0];
  },

  /**
   * Henter værelsesomsætning og overnatninger opdelt pr. værelsestype.
   */
  async getRevenueByRoomType() {
    const sql = `
      SELECT 
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        COUNT(b.id) AS total_bookings,
        COALESCE(SUM(b.total_price), 0) AS total_revenue
      FROM ROOM_TYPE rt
      LEFT JOIN BOOKING b ON rt.id = b.room_type_id AND b.status != 'cancelled'
      GROUP BY rt.id, rt.name
      ORDER BY total_revenue DESC
    `;
    const [rows] = await (this?.db || db).query(sql);
    return rows;
  },

  /**
   * Henter værelsesomsætning opdelt pr. værelsestype og sæson (baseret på check_in_date).
   */
  async getRevenueByRoomTypeAndSeason() {
    const sql = `
      SELECT 
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        CASE 
          WHEN MONTH(b.check_in_date) IN (6, 7, 8) THEN 'high'
          WHEN MONTH(b.check_in_date) IN (3, 4, 5, 9, 10) THEN 'mid'
          ELSE 'low'
        END AS season,
        COUNT(b.id) AS total_bookings,
        COALESCE(SUM(b.total_price), 0) AS total_revenue
      FROM ROOM_TYPE rt
      LEFT JOIN BOOKING b ON rt.id = b.room_type_id AND b.status != 'cancelled'
      GROUP BY rt.id, rt.name, season
      ORDER BY rt.id, total_revenue DESC
    `;
    const [rows] = await (this?.db || db).query(sql);
    return rows;
  },

  /**
   * Henter samlet baromsætning (Lobbybaren / Helene Christine).
   */
  async getTotalBarRevenue() {
    const sql = `
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_bar_revenue,
        COUNT(id) AS total_sales_transactions
      FROM SALE
    `;
    const [rows] = await (this?.db || db).query(sql);
    return rows[0];
  },

  /**
   * Henter omsætning og solgt antal pr. drink/produkt i baren.
   */
  async getRevenueByProduct() {
    const sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        COALESCE(SUM(sl.quantity), 0) AS total_quantity_sold,
        COALESCE(SUM(sl.subtotal), 0) AS total_revenue
      FROM PRODUCT p
      LEFT JOIN SALE_LINE sl ON p.id = sl.product_id
      GROUP BY p.id, p.name, p.category
      ORDER BY total_revenue DESC
    `;
    const [rows] = await (this?.db || db).query(sql);
    return rows;
  },

  /**
   * Henter salgsfordeling på kategorier (Cocktail vs Kaffe) til procentberegning.
   */
  async getBarCategoryDistribution() {
    const sql = `
      SELECT 
        p.category,
        COALESCE(SUM(sl.quantity), 0) AS total_items_sold,
        COALESCE(SUM(sl.subtotal), 0) AS total_category_revenue
      FROM PRODUCT p
      JOIN SALE_LINE sl ON p.id = sl.product_id
      GROUP BY p.category
    `;
    const [rows] = await (this?.db || db).query(sql);
    return rows;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = analyticsRepository;
}

export const getTotalRoomRevenue = analyticsRepository.getTotalRoomRevenue.bind(analyticsRepository);
export const getRevenueByRoomType = analyticsRepository.getRevenueByRoomType.bind(analyticsRepository);
export const getRevenueByRoomTypeAndSeason = analyticsRepository.getRevenueByRoomTypeAndSeason.bind(analyticsRepository);
export const getTotalBarRevenue = analyticsRepository.getTotalBarRevenue.bind(analyticsRepository);
export const getRevenueByProduct = analyticsRepository.getRevenueByProduct.bind(analyticsRepository);
export const getBarCategoryDistribution = analyticsRepository.getBarCategoryDistribution.bind(analyticsRepository);

export { analyticsRepository };
export default analyticsRepository;
