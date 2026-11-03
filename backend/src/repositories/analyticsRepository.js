import pool from '../config/database.js';

// Tilpas til databasetilslutning/pool ift. PostgreSQL (node-postgres / pg)
const db = pool;

/**
 * Repository for Data Analytics & Nøgletal (PostgreSQL DAL)
 */
const analyticsRepository = {
  db,

  /**
   * Henter samlet værelsesomsætning for ikke-aflyste bookinger.
   */
  async getTotalRoomRevenue() {
    const sql = `
      SELECT 
        COALESCE(SUM(total_price), 0)::numeric AS total_room_revenue,
        COUNT(id)::int AS total_valid_bookings
      FROM BOOKING
      WHERE status != 'cancelled'
    `;
    const { rows } = await (this?.db || db).query(sql);
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
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.total_price), 0)::numeric AS total_revenue,
        COALESCE(SUM(b.check_out_date - b.check_in_date), 0)::int AS total_nights_sold
      FROM ROOM_TYPE rt
      LEFT JOIN BOOKING b ON rt.id = b.room_type_id AND b.status != 'cancelled'
      GROUP BY rt.id, rt.name
      ORDER BY total_revenue DESC
    `;
    const { rows } = await (this?.db || db).query(sql);
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
          WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (6, 7, 8) THEN 'high'
          WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (3, 4, 5, 9, 10) THEN 'mid'
          ELSE 'low'
        END AS season,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.total_price), 0)::numeric AS total_revenue
      FROM ROOM_TYPE rt
      LEFT JOIN BOOKING b ON rt.id = b.room_type_id AND b.status != 'cancelled'
      GROUP BY rt.id, rt.name, season
      ORDER BY rt.id, total_revenue DESC
    `;
    const { rows } = await (this?.db || db).query(sql);
    return rows;
  },

  /**
   * Henter samlet baromsætning.
   */
  async getTotalBarRevenue() {
    const sql = `
      SELECT 
        COALESCE(SUM(total_amount), 0)::numeric AS total_bar_revenue,
        COUNT(id)::int AS total_sales_transactions
      FROM SALE
    `;
    const { rows } = await (this?.db || db).query(sql);
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
        COALESCE(SUM(sl.quantity), 0)::int AS total_quantity_sold,
        COALESCE(SUM(sl.subtotal), 0)::numeric AS total_revenue
      FROM PRODUCT p
      LEFT JOIN SALE_LINE sl ON p.id = sl.product_id
      GROUP BY p.id, p.name, p.category
      ORDER BY total_revenue DESC
    `;
    const { rows } = await (this?.db || db).query(sql);
    return rows;
  },

  /**
   * Henter salgsfordeling på kategorier (Cocktail vs. Kaffe).
   */
  async getBarCategoryDistribution() {
    const sql = `
      SELECT 
        p.category,
        COALESCE(SUM(sl.quantity), 0)::int AS total_items_sold,
        COALESCE(SUM(sl.subtotal), 0)::numeric AS total_category_revenue
      FROM PRODUCT p
      JOIN SALE_LINE sl ON p.id = sl.product_id
      GROUP BY p.category
    `;
    const { rows } = await (this?.db || db).query(sql);
    return rows;
  },

  /**
   * Beregner belægningsgrad for en specifik periode.
   * @param {string} startDate - Format 'YYYY-MM-DD'
   * @param {string} endDate - Format 'YYYY-MM-DD'
   */
  async getOccupancyRateByPeriod(startDate, endDate) {
    const TOTAL_ROOMS = 214;
    
    const sql = `
      SELECT 
        ($2::date - $1::date)::int AS period_days,
        ($3::int * ($2::date - $1::date))::int AS total_capacity_room_nights,
        COALESCE(SUM(
          LEAST(b.check_out_date, $2::date) - GREATEST(b.check_in_date, $1::date)
        ), 0)::int AS occupied_room_nights,
        ROUND(
          (COALESCE(SUM(
            LEAST(b.check_out_date, $2::date) - GREATEST(b.check_in_date, $1::date)
          ), 0)::numeric / NULLIF($3::int * ($2::date - $1::date), 0)) * 100, 2
        )::numeric AS occupancy_rate_percent
      FROM BOOKING b
      WHERE b.status != 'cancelled'
        AND b.check_in_date < $2::date
        AND b.check_out_date > $1::date
    `;

    const { rows } = await (this?.db || db).query(sql, [startDate, endDate, TOTAL_ROOMS]);
    return rows[0];
  },

  /**
   * Henter overordnet belægningsgrad for hele datasættet.
   */
  async getTotalOccupancySummary() {
    const TOTAL_ROOMS = 214;

    const sql = `
      SELECT 
        MIN(check_in_date) AS earliest_booking,
        MAX(check_out_date) AS latest_booking,
        (MAX(check_out_date) - MIN(check_in_date))::int AS total_days_in_dataset,
        COALESCE(SUM(check_out_date - check_in_date), 0)::int AS total_occupied_room_nights,
        ROUND(
          (COALESCE(SUM(check_out_date - check_in_date), 0)::numeric / 
          NULLIF(COUNT(DISTINCT check_in_date) * $1::int, 0)) * 100, 2
        )::numeric AS estimated_overall_occupancy_percent
      FROM BOOKING
      WHERE status != 'cancelled'
    `;

    const { rows } = await (this?.db || db).query(sql, [TOTAL_ROOMS]);
    return rows[0];
  },

  /**
   * Henter månedlig belægningsgrad for hotellet.
   * @param {number} [year] - Valgfrit årstal til filtrering
   */
  async getMonthlyOccupancy(year = null) {
    const TOTAL_ROOMS = 214;

    let sql = `
      SELECT 
        EXTRACT(YEAR FROM b.check_in_date)::int AS year,
        EXTRACT(MONTH FROM b.check_in_date)::int AS month,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.check_out_date - b.check_in_date), 0)::int AS total_nights_booked,
        EXTRACT(DAY FROM (DATE_TRUNC('month', b.check_in_date) + interval '1 month - 1 day'))::int AS days_in_month,
        (EXTRACT(DAY FROM (DATE_TRUNC('month', b.check_in_date) + interval '1 month - 1 day')) * $1::int)::int AS monthly_capacity_room_nights,
        ROUND(
          (COALESCE(SUM(b.check_out_date - b.check_in_date), 0)::numeric / 
          NULLIF(EXTRACT(DAY FROM (DATE_TRUNC('month', b.check_in_date) + interval '1 month - 1 day')) * $1::int, 0)) * 100, 2
        )::numeric AS occupancy_rate_percent
      FROM BOOKING b
      WHERE b.status != 'cancelled'
    `;

    const params = [TOTAL_ROOMS];

    if (year) {
      sql += ` AND EXTRACT(YEAR FROM b.check_in_date)::int = $2::int`;
      params.push(year);
    }

    sql += `
      GROUP BY 
        EXTRACT(YEAR FROM b.check_in_date), 
        EXTRACT(MONTH FROM b.check_in_date), 
        DATE_TRUNC('month', b.check_in_date)
      ORDER BY year DESC, month DESC
    `;

    const { rows } = await (this?.db || db).query(sql, params);
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
        (s.season_days * $1::int)::int AS season_capacity_room_nights,
        ROUND(
          (s.total_nights_booked::numeric / NULLIF(s.season_days * $1::int, 0)) * 100, 2
        )::numeric AS occupancy_rate_percent
      FROM (
        SELECT 
          CASE 
            WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (6, 7, 8) THEN 'high'
            WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (3, 4, 5, 9, 10) THEN 'mid'
            ELSE 'low'
          END AS season,
          CASE 
            WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (6, 7, 8) THEN 92
            WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (3, 4, 5, 9, 10) THEN 153
            ELSE 120
          END AS season_days,
          COUNT(b.id)::int AS total_bookings,
          COALESCE(SUM(b.check_out_date - b.check_in_date), 0)::int AS total_nights_booked
        FROM BOOKING b
        WHERE b.status != 'cancelled'
    `;

    const params = [TOTAL_ROOMS];

    if (year) {
      sql += ` AND EXTRACT(YEAR FROM b.check_in_date)::int = $2::int`;
      params.push(year);
    }

    sql += `
        GROUP BY 
          CASE 
            WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (6, 7, 8) THEN 'high'
            WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (3, 4, 5, 9, 10) THEN 'mid'
            ELSE 'low'
          END,
          CASE 
            WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (6, 7, 8) THEN 92
            WHEN EXTRACT(MONTH FROM b.check_in_date)::int IN (3, 4, 5, 9, 10) THEN 153
            ELSE 120
          END
      ) s
      ORDER BY CASE s.season WHEN 'high' THEN 1 WHEN 'mid' THEN 2 WHEN 'low' THEN 3 ELSE 4 END
    `;

    const { rows } = await (this?.db || db).query(sql, params);
    return rows;
  },

  /**
   * Alias for getOccupancyBySeason
   */
  async getSeasonalOccupancy(year = null) {
    return this.getOccupancyBySeason(year);
  },

  /**
   * Henter månedlig værelsesomsætning og solgte værelsesnætter til ADR-analyse.
   * @param {number} [year] - Valgfrit årstal til filtrering
   */
  async getMonthlyRevenue(year = null) {
    let sql = `
      SELECT 
        EXTRACT(YEAR FROM b.check_in_date)::int AS year,
        EXTRACT(MONTH FROM b.check_in_date)::int AS month,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.check_out_date - b.check_in_date), 0)::int AS total_nights_sold,
        COALESCE(SUM(b.total_price), 0)::numeric AS total_revenue
      FROM BOOKING b
      WHERE b.status != 'cancelled'
    `;

    const params = [];

    if (year) {
      sql += ` AND EXTRACT(YEAR FROM b.check_in_date)::int = $1::int`;
      params.push(year);
    }

    sql += `
      GROUP BY EXTRACT(YEAR FROM b.check_in_date), EXTRACT(MONTH FROM b.check_in_date)
      ORDER BY year DESC, month DESC
    `;

    const { rows } = await (this?.db || db).query(sql, params);
    return rows;
  },

  /**
   * T041 [P] [US15]: Henter gennemsnitlig opholdslængde (ALOS) pr. land.
   */
  async getALOSByCountry() {
    const sql = `
      SELECT 
        COALESCE(cntry.name, 'Ukendt') AS country,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.check_out_date - b.check_in_date), 0)::int AS total_nights,
        ROUND(
          COALESCE(AVG(b.check_out_date - b.check_in_date), 0), 2
        )::numeric AS average_length_of_stay
      FROM BOOKING b
      JOIN COSTUMER c ON b.costumer_id = c.id
      LEFT JOIN COUNTRY cntry ON c.country_id = cntry.id
      WHERE b.status != 'cancelled'
      GROUP BY cntry.name
      ORDER BY average_length_of_stay DESC, total_nights DESC
    `;
    const { rows } = await (this?.db || db).query(sql);
    return rows;
  },

  /**
   * T041 [P] [US15]: Henter gennemsnitlig opholdslængde (ALOS) pr. værelsestype.
   */
  async getALOSByRoomType() {
    const sql = `
      SELECT 
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.check_out_date - b.check_in_date), 0)::int AS total_nights,
        ROUND(
          COALESCE(AVG(b.check_out_date - b.check_in_date), 0), 2
        )::numeric AS average_length_of_stay
      FROM ROOM_TYPE rt
      LEFT JOIN BOOKING b ON rt.id = b.room_type_id AND b.status != 'cancelled'
      GROUP BY rt.id, rt.name
      ORDER BY average_length_of_stay DESC
    `;
    const { rows } = await (this?.db || db).query(sql);
    return rows;
  }
};

// Understøt CommonJS hvis modulet indlæses via require
if (typeof module !== 'undefined' && module.exports) {
  module.exports = analyticsRepository;
}

// Named exports til test og modulær anvendelse
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
export const getMonthlyRevenue = analyticsRepository.getMonthlyRevenue.bind(analyticsRepository);
export const getALOSByCountry = analyticsRepository.getALOSByCountry.bind(analyticsRepository);
export const getALOSByRoomType = analyticsRepository.getALOSByRoomType.bind(analyticsRepository);

export { analyticsRepository };
export default analyticsRepository;
