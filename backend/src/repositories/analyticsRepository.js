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
  },

  /**
   * BEREGNING AF BELÆGNINGSGRAD (T035)
   * Hotel Kong Arthur har i alt 214 værelser.
   */

  /**
   * Beregner belægningsgrad for en specifik valgt periode (start_date til end_date).
   * @param {string} startDate - Format 'YYYY-MM-DD'
   * @param {string} endDate - Format 'YYYY-MM-DD'
   */
  async getOccupancyRateByPeriod(startDate, endDate) {
    const TOTAL_ROOMS = 214;
    
    const sql = `
      SELECT 
        DATEDIFF(?, ?) AS period_days,
        ? * DATEDIFF(?, ?) AS total_capacity_room_nights,
        COALESCE(SUM(
          DATEDIFF(
            LEAST(b.check_out_date, ?),
            GREATEST(b.check_in_date, ?)
          )
        ), 0) AS occupied_room_nights,
        ROUND(
          (COALESCE(SUM(
            DATEDIFF(
              LEAST(b.check_out_date, ?),
              GREATEST(b.check_in_date, ?)
            )
          ), 0) / (? * DATEDIFF(?, ?))) * 100, 2
        ) AS occupancy_rate_percent
      FROM BOOKING b
      WHERE b.status != 'cancelled'
        AND b.check_in_date < ?
        AND b.check_out_date > ?
    `;

    const params = [
      endDate, startDate,             // period_days
      TOTAL_ROOMS, endDate, startDate,// total_capacity_room_nights
      endDate, startDate,             // occupied_room_nights LEAST/GREATEST
      endDate, startDate,             // percentage LEAST/GREATEST
      TOTAL_ROOMS, endDate, startDate,// percentage capacity denominator
      endDate, startDate              // WHERE overlap condition
    ];

    const [rows] = await (this?.db || db).query(sql, params);
    return rows[0];
  },

  /**
   * Henter samlet antal optagne nætter og overordnet belægningsgrad for hele databasens historik.
   */
  async getTotalOccupancySummary() {
    const TOTAL_ROOMS = 214;

    const sql = `
      SELECT 
        MIN(check_in_date) AS earliest_booking,
        MAX(check_out_date) AS latest_booking,
        DATEDIFF(MAX(check_out_date), MIN(check_in_date)) AS total_days_in_dataset,
        COALESCE(SUM(DATEDIFF(check_out_date, check_in_date)), 0) AS total_occupied_room_nights,
        ROUND(
          (COALESCE(SUM(DATEDIFF(check_out_date, check_in_date)), 0) / 
          (COUNT(DISTINCT DATE(check_in_date)) * ?)) * 100, 2
        ) AS estimated_overall_occupancy_percent
      FROM BOOKING
      WHERE status != 'cancelled'
    `;

    const [rows] = await (this?.db || db).query(sql, [TOTAL_ROOMS]);
    return rows[0];
  },

  /**
   * Henter månedlig belægningsgrad til brug for overblik og Tableau/API.
   * @param {number} [year] - Valgfrit årstal til filtrering
   */
  async getMonthlyOccupancy(year = null) {
    const TOTAL_ROOMS = 214;

    let sql = `
      SELECT 
        YEAR(b.check_in_date) AS year,
        MONTH(b.check_in_date) AS month,
        COUNT(b.id) AS total_bookings,
        COALESCE(SUM(DATEDIFF(b.check_out_date, b.check_in_date)), 0) AS total_nights_booked,
        DAY(LAST_DAY(b.check_in_date)) AS days_in_month,
        (DAY(LAST_DAY(b.check_in_date)) * ?) AS monthly_capacity_room_nights,
        ROUND(
          (COALESCE(SUM(DATEDIFF(b.check_out_date, b.check_in_date)), 0) / 
          (DAY(LAST_DAY(b.check_in_date)) * ?)) * 100, 2
        ) AS occupancy_rate_percent
      FROM BOOKING b
      WHERE b.status != 'cancelled'
    `;

    const params = [TOTAL_ROOMS, TOTAL_ROOMS];

    if (year) {
      sql += ` AND YEAR(b.check_in_date) = ?`;
      params.push(year);
    }

    sql += `
      GROUP BY YEAR(b.check_in_date), MONTH(b.check_in_date), DAY(LAST_DAY(b.check_in_date))
      ORDER BY year DESC, month DESC
    `;

    const [rows] = await (this?.db || db).query(sql, params);
    return rows;
  },

  /**
   * Henter sæsonmæssig belægningsgrad opdelt pr. sæson (low, mid, high).
   * @param {number} [year] - Valgfrit årstal til filtrering
   */
  async getOccupancyBySeason(year = null) {
    const TOTAL_ROOMS = 214;

    let sql = `
      SELECT 
        s.season,
        s.total_bookings,
        s.total_nights_booked,
        (s.season_days * ?) AS season_capacity_room_nights,
        ROUND(
          (s.total_nights_booked / (s.season_days * ?)) * 100, 2
        ) AS occupancy_rate_percent
      FROM (
        SELECT 
          CASE 
            WHEN MONTH(b.check_in_date) IN (6, 7, 8) THEN 'high'
            WHEN MONTH(b.check_in_date) IN (3, 4, 5, 9, 10) THEN 'mid'
            ELSE 'low'
          END AS season,
          CASE 
            WHEN MONTH(b.check_in_date) IN (6, 7, 8) THEN 92
            WHEN MONTH(b.check_in_date) IN (3, 4, 5, 9, 10) THEN 153
            ELSE 120
          END AS season_days,
          COUNT(b.id) AS total_bookings,
          COALESCE(SUM(DATEDIFF(b.check_out_date, b.check_in_date)), 0) AS total_nights_booked
        FROM BOOKING b
        WHERE b.status != 'cancelled'
    `;

    const params = [TOTAL_ROOMS, TOTAL_ROOMS];

    if (year) {
      sql += ` AND YEAR(b.check_in_date) = ?`;
      params.push(year);
    }

    sql += `
        GROUP BY 
          CASE 
            WHEN MONTH(b.check_in_date) IN (6, 7, 8) THEN 'high'
            WHEN MONTH(b.check_in_date) IN (3, 4, 5, 9, 10) THEN 'mid'
            ELSE 'low'
          END,
          CASE 
            WHEN MONTH(b.check_in_date) IN (6, 7, 8) THEN 92
            WHEN MONTH(b.check_in_date) IN (3, 4, 5, 9, 10) THEN 153
            ELSE 120
          END
      ) s
      ORDER BY FIELD(s.season, 'high', 'mid', 'low')
    `;

    const [rows] = await (this?.db || db).query(sql, params);
    return rows;
  },

  /**
   * Alias for getOccupancyBySeason
   */
  async getSeasonalOccupancy(year = null) {
    return this.getOccupancyBySeason(year);
  },

  /**
   * T041 [P] [US15]: Gennemsnitlig opholdslængde (ALOS) opdelt pr. land.
   */
  async getALOSByCountry() {
    const sql = `
      SELECT 
        g.country,
        COUNT(b.id) AS total_bookings,
        COALESCE(SUM(DATEDIFF(b.check_out_date, b.check_in_date)), 0) AS total_nights,
        ROUND(
          COALESCE(AVG(DATEDIFF(b.check_out_date, b.check_in_date)), 0), 2
        ) AS average_length_of_stay
      FROM BOOKING b
      JOIN GUEST g ON b.guest_id = g.id
      WHERE b.status != 'cancelled'
      GROUP BY g.country
      ORDER BY average_length_of_stay DESC, total_nights DESC
    `;
    const [rows] = await (this?.db || db).query(sql);
    return rows;
  },

  /**
   * T041 [P] [US15]: Gennemsnitlig opholdslængde (ALOS) opdelt pr. værelsestype.
   */
  async getALOSByRoomType() {
    const sql = `
      SELECT 
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        COUNT(b.id) AS total_bookings,
        COALESCE(SUM(DATEDIFF(b.check_out_date, b.check_in_date)), 0) AS total_nights,
        ROUND(
          COALESCE(AVG(DATEDIFF(b.check_out_date, b.check_in_date)), 0), 2
        ) AS average_length_of_stay
      FROM ROOM_TYPE rt
      LEFT JOIN BOOKING b ON rt.id = b.room_type_id AND b.status != 'cancelled'
      GROUP BY rt.id, rt.name
      ORDER BY average_length_of_stay DESC
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
export const getOccupancyRateByPeriod = analyticsRepository.getOccupancyRateByPeriod.bind(analyticsRepository);
export const getTotalOccupancySummary = analyticsRepository.getTotalOccupancySummary.bind(analyticsRepository);
export const getMonthlyOccupancy = analyticsRepository.getMonthlyOccupancy.bind(analyticsRepository);
export const getOccupancyBySeason = analyticsRepository.getOccupancyBySeason.bind(analyticsRepository);
export const getSeasonalOccupancy = analyticsRepository.getSeasonalOccupancy.bind(analyticsRepository);
export const getALOSByCountry = analyticsRepository.getALOSByCountry.bind(analyticsRepository);
export const getALOSByRoomType = analyticsRepository.getALOSByRoomType.bind(analyticsRepository);

export { analyticsRepository };
export default analyticsRepository;
