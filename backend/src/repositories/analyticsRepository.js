import * as dbModule from '../config/database.js';

// Tilpas til databasetilslutning/pool ift. PostgreSQL (node-postgres / pg)
function resolveDb(candidate) {
  if (!candidate) return null;
  if (typeof candidate.query === 'function') return candidate;
  if (candidate.default && typeof candidate.default.query === 'function') return candidate.default;
  if (candidate.pool && typeof candidate.pool.query === 'function') return candidate.pool;
  if (candidate.exports?.default && typeof candidate.exports.default.query === 'function') {
    return candidate.exports.default;
  }
  if (candidate.exports?.pool && typeof candidate.exports.pool.query === 'function') {
    return candidate.exports.pool;
  }
  return candidate;
}

const db = resolveDb(dbModule);

/**
 * Repository for Data Analytics & Nøgletal (PostgreSQL DAL)
 * 
 * Alle SQL-forespørgsler er tilpasset PostgreSQL-skemaet i database/schema.sql:
 * - booking: arrival, departure, price, room_id, costumer_id, status
 * - room & room_type: room(id, room_type_id), room_type(id, name, max_capacity)
 * - sales & product: sales(id, product_id, quantity, date), product(id, name, category_id, unit_price)
 * - category: category(id, name)
 * - costumer & country: costumer(id, country_id), country(id, name)
 */
const analyticsRepository = {
  db,

  /**
   * Sikker forespørgselsafvikler mod PostgreSQL.
   * Håndterer både standard pg Result { rows }, direkte arrays og legacy mocks.
   */
  async _query(sql, params = []) {
    const targetDb = resolveDb(this?.db) || resolveDb(dbModule);
    const result = await targetDb.query(sql, params);
    if (result && Array.isArray(result.rows)) {
      return result.rows;
    }
    if (Array.isArray(result)) {
      if (Array.isArray(result[0])) {
        return result[0];
      }
      return result;
    }
    return [];
  },

  /**
   * T034: Henter samlet værelsesomsætning for ikke-aflyste bookinger.
   */
  async getTotalRoomRevenue() {
    const sql = `
      SELECT 
        COALESCE(SUM(b.price), 0)::numeric AS total_room_revenue,
        COUNT(b.id)::int AS total_valid_bookings
      FROM booking b
      WHERE b.status != 'cancelled'
    `;
    const rows = await this._query(sql);
    return rows[0] || { total_room_revenue: 0, total_valid_bookings: 0 };
  },

  /**
   * T034: Henter værelsesomsætning og overnatninger opdelt pr. værelsestype.
   * Understøtter valgfri filtrering på årstal.
   * @param {number} [year] - Valgfrit årstal (f.eks. 2025 eller 2026)
   */
  async getRevenueByRoomType(year = null) {
    let sql = `
      SELECT 
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        rt.max_capacity,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.price), 0)::numeric AS total_revenue,
        COALESCE(SUM(b.departure::date - b.arrival::date), 0)::int AS total_nights_sold
      FROM room_type rt
      LEFT JOIN room r ON rt.id = r.room_type_id
      LEFT JOIN booking b ON r.id = b.room_id AND b.status != 'cancelled'
    `;
    const params = [];
    if (year) {
      sql += ` AND EXTRACT(YEAR FROM b.arrival)::int = $1::int`;
      params.push(year);
    }
    sql += `
      GROUP BY rt.id, rt.name, rt.max_capacity
      ORDER BY total_revenue DESC
    `;
    return await this._query(sql, params);
  },

  /**
   * US-14 & US-15: Henter værelsesomsætning opdelt pr. værelsestype, år og sæson.
   * Muliggør interaktiv Tableau-filtrering på år og sæson med ADR og ALOS.
   * @param {number} [year] - Valgfrit årstal
   */
  async getRoomTypeAnnualAnalytics(year = null) {
    let sql = `
      SELECT 
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        rt.max_capacity,
        COALESCE(EXTRACT(YEAR FROM b.arrival)::int, 2025) AS year,
        CASE 
          WHEN EXTRACT(MONTH FROM b.arrival)::int IN (6, 7, 8) THEN 'Højsæson'
          WHEN EXTRACT(MONTH FROM b.arrival)::int IN (3, 4, 5, 9, 10) THEN 'Mellemsæson'
          ELSE 'Lavsæson'
        END AS season,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.price), 0)::numeric AS total_revenue,
        COALESCE(SUM(b.departure::date - b.arrival::date), 0)::int AS total_nights_sold,
        ROUND(COALESCE(SUM(b.price) / NULLIF(SUM(b.departure::date - b.arrival::date), 0), 0), 2)::numeric AS adr,
        ROUND(COALESCE(AVG(b.departure::date - b.arrival::date), 0), 2)::numeric AS alos
      FROM room_type rt
      LEFT JOIN room r ON rt.id = r.room_type_id
      LEFT JOIN booking b ON r.id = b.room_id AND b.status != 'cancelled'
    `;
    const params = [];
    if (year) {
      sql += ` AND EXTRACT(YEAR FROM b.arrival)::int = $1::int`;
      params.push(year);
    }
    sql += `
      GROUP BY rt.id, rt.name, rt.max_capacity, EXTRACT(YEAR FROM b.arrival), season
      ORDER BY year DESC, total_revenue DESC
    `;
    return await this._query(sql, params);
  },

  /**
   * T034: Henter værelsesomsætning opdelt pr. værelsestype og sæson (baseret på arrival).
   */
  async getRevenueByRoomTypeAndSeason() {
    const sql = `
      SELECT 
        rt.id AS room_type_id,
        rt.name AS room_type_name,
        CASE 
          WHEN EXTRACT(MONTH FROM b.arrival)::int IN (6, 7, 8) THEN 'high'
          WHEN EXTRACT(MONTH FROM b.arrival)::int IN (3, 4, 5, 9, 10) THEN 'mid'
          ELSE 'low'
        END AS season,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.price), 0)::numeric AS total_revenue
      FROM room_type rt
      LEFT JOIN room r ON rt.id = r.room_type_id
      LEFT JOIN booking b ON r.id = b.room_id AND b.status != 'cancelled'
      GROUP BY rt.id, rt.name, season
      ORDER BY rt.id, total_revenue DESC
    `;
    return await this._query(sql);
  },

  /**
   * T034: Henter samlet baromsætning fra sales og product.
   */
  async getTotalBarRevenue() {
    const sql = `
      SELECT 
        COALESCE(SUM(s.quantity * p.unit_price), 0)::numeric AS total_bar_revenue,
        COUNT(DISTINCT s.id)::int AS total_sales_transactions
      FROM sales s
      JOIN product p ON s.product_id = p.id
    `;
    const rows = await this._query(sql);
    return rows[0] || { total_bar_revenue: 0, total_sales_transactions: 0 };
  },

  /**
   * T034: Henter omsætning og solgt antal pr. drink/produkt i baren.
   */
  async getRevenueByProduct() {
    const sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        c.name AS category,
        COALESCE(SUM(s.quantity), 0)::int AS total_quantity_sold,
        COALESCE(SUM(s.quantity * p.unit_price), 0)::numeric AS total_revenue
      FROM product p
      LEFT JOIN category c ON p.category_id = c.id
      LEFT JOIN sales s ON p.id = s.product_id
      GROUP BY p.id, p.name, c.name
      ORDER BY total_revenue DESC
    `;
    return await this._query(sql);
  },

  /**
   * T034: Henter salgsfordeling på kategorier (Cocktail vs. Kaffe).
   */
  async getBarCategoryDistribution() {
    const sql = `
      SELECT 
        c.name AS category,
        COALESCE(SUM(s.quantity), 0)::int AS total_items_sold,
        COALESCE(SUM(s.quantity * p.unit_price), 0)::numeric AS total_category_revenue
      FROM category c
      JOIN product p ON c.id = p.category_id
      LEFT JOIN sales s ON p.id = s.product_id
      GROUP BY c.name
    `;
    return await this._query(sql);
  },

  /**
   * T035 [US8]: Beregner belægningsgrad for en specifik periode.
   * Formel: (Optagne værelsesnætter / (214 * antal dage i perioden)) * 100
   * 
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
          LEAST(b.departure::date, $2::date) - GREATEST(b.arrival::date, $1::date)
        ), 0)::int AS occupied_room_nights,
        ROUND(
          (COALESCE(SUM(
            LEAST(b.departure::date, $2::date) - GREATEST(b.arrival::date, $1::date)
          ), 0)::numeric / NULLIF($3::int * ($2::date - $1::date), 0)) * 100, 2
        )::numeric AS occupancy_rate_percent
      FROM booking b
      WHERE b.status != 'cancelled'
        AND b.arrival::date < $2::date
        AND b.departure::date > $1::date
    `;

    const rows = await this._query(sql, [startDate, endDate, TOTAL_ROOMS]);
    return rows[0] || {
      period_days: 0,
      total_capacity_room_nights: 0,
      occupied_room_nights: 0,
      occupancy_rate_percent: 0
    };
  },

  /**
   * T035 [US8]: Henter overordnet belægningsgrad for hele datasættet.
   */
  async getTotalOccupancySummary() {
    const TOTAL_ROOMS = 214;

    const sql = `
      SELECT 
        MIN(b.arrival::date) AS earliest_booking,
        MAX(b.departure::date) AS latest_booking,
        (MAX(b.departure::date) - MIN(b.arrival::date))::int AS total_days_in_dataset,
        COALESCE(SUM(b.departure::date - b.arrival::date), 0)::int AS total_occupied_room_nights,
        ROUND(
          (COALESCE(SUM(b.departure::date - b.arrival::date), 0)::numeric / 
          NULLIF((MAX(b.departure::date) - MIN(b.arrival::date)) * $1::int, 0)) * 100, 2
        )::numeric AS estimated_overall_occupancy_percent
      FROM booking b
      WHERE b.status != 'cancelled'
    `;

    const rows = await this._query(sql, [TOTAL_ROOMS]);
    return rows[0] || {
      total_days_in_dataset: 0,
      total_occupied_room_nights: 0,
      estimated_overall_occupancy_percent: 0
    };
  },

  /**
   * T035 [US8]: Henter månedlig belægningsgrad for hotellet baseret på 214 værelser.
   * @param {number} [year] - Valgfrit årstal til filtrering
   */
  async getMonthlyOccupancy(year = null) {
    const TOTAL_ROOMS = 214;

    let sql = `
      SELECT 
        EXTRACT(YEAR FROM b.arrival)::int AS year,
        EXTRACT(MONTH FROM b.arrival)::int AS month,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.departure::date - b.arrival::date), 0)::int AS total_nights_booked,
        EXTRACT(DAY FROM (DATE_TRUNC('month', b.arrival) + interval '1 month - 1 day'))::int AS days_in_month,
        (EXTRACT(DAY FROM (DATE_TRUNC('month', b.arrival) + interval '1 month - 1 day')) * $1::int)::int AS monthly_capacity_room_nights,
        ROUND(
          (COALESCE(SUM(b.departure::date - b.arrival::date), 0)::numeric / 
          NULLIF(EXTRACT(DAY FROM (DATE_TRUNC('month', b.arrival) + interval '1 month - 1 day')) * $1::int, 0)) * 100, 2
        )::numeric AS occupancy_rate_percent
      FROM booking b
      WHERE b.status != 'cancelled'
    `;

    const params = [TOTAL_ROOMS];

    if (year) {
      sql += ` AND EXTRACT(YEAR FROM b.arrival)::int = $2::int`;
      params.push(year);
    }

    sql += `
      GROUP BY 
        EXTRACT(YEAR FROM b.arrival), 
        EXTRACT(MONTH FROM b.arrival), 
        DATE_TRUNC('month', b.arrival)
      ORDER BY year DESC, month DESC
    `;

    return await this._query(sql, params);
  },

  /**
   * T035 [US8]: Henter sæsonmæssig belægningsgrad opdelt pr. sæson (low, mid, high).
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
            WHEN EXTRACT(MONTH FROM b.arrival)::int IN (6, 7, 8) THEN 'high'
            WHEN EXTRACT(MONTH FROM b.arrival)::int IN (3, 4, 5, 9, 10) THEN 'mid'
            ELSE 'low'
          END AS season,
          CASE 
            WHEN EXTRACT(MONTH FROM b.arrival)::int IN (6, 7, 8) THEN 92
            WHEN EXTRACT(MONTH FROM b.arrival)::int IN (3, 4, 5, 9, 10) THEN 153
            ELSE 120
          END AS season_days,
          COUNT(b.id)::int AS total_bookings,
          COALESCE(SUM(b.departure::date - b.arrival::date), 0)::int AS total_nights_booked
        FROM booking b
        WHERE b.status != 'cancelled'
    `;

    const params = [TOTAL_ROOMS];

    if (year) {
      sql += ` AND EXTRACT(YEAR FROM b.arrival)::int = $2::int`;
      params.push(year);
    }

    sql += `
        GROUP BY 
          CASE 
            WHEN EXTRACT(MONTH FROM b.arrival)::int IN (6, 7, 8) THEN 'high'
            WHEN EXTRACT(MONTH FROM b.arrival)::int IN (3, 4, 5, 9, 10) THEN 'mid'
            ELSE 'low'
          END,
          CASE 
            WHEN EXTRACT(MONTH FROM b.arrival)::int IN (6, 7, 8) THEN 92
            WHEN EXTRACT(MONTH FROM b.arrival)::int IN (3, 4, 5, 9, 10) THEN 153
            ELSE 120
          END
      ) s
      ORDER BY CASE s.season WHEN 'high' THEN 1 WHEN 'mid' THEN 2 WHEN 'low' THEN 3 ELSE 4 END
    `;

    return await this._query(sql, params);
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
        EXTRACT(YEAR FROM b.arrival)::int AS year,
        EXTRACT(MONTH FROM b.arrival)::int AS month,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.departure::date - b.arrival::date), 0)::int AS total_nights_sold,
        COALESCE(SUM(b.price), 0)::numeric AS total_revenue
      FROM booking b
      WHERE b.status != 'cancelled'
    `;

    const params = [];

    if (year) {
      sql += ` AND EXTRACT(YEAR FROM b.arrival)::int = $1::int`;
      params.push(year);
    }

    sql += `
      GROUP BY EXTRACT(YEAR FROM b.arrival), EXTRACT(MONTH FROM b.arrival)
      ORDER BY year DESC, month DESC
    `;

    return await this._query(sql, params);
  },

  /**
   * T041 [P] [US15]: Henter gennemsnitlig opholdslængde (ALOS) pr. land.
   */
  async getALOSByCountry() {
    const sql = `
      SELECT 
        COALESCE(cntry.name, 'Ukendt') AS country,
        COUNT(b.id)::int AS total_bookings,
        COALESCE(SUM(b.departure::date - b.arrival::date), 0)::int AS total_nights,
        ROUND(
          COALESCE(AVG(b.departure::date - b.arrival::date), 0), 2
        )::numeric AS average_length_of_stay
      FROM booking b
      LEFT JOIN costumer c ON b.costumer_id = c.id
      LEFT JOIN country cntry ON c.country_id = cntry.id
      WHERE b.status != 'cancelled'
      GROUP BY COALESCE(cntry.name, 'Ukendt')
      ORDER BY average_length_of_stay DESC, total_nights DESC
    `;
    return await this._query(sql);
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
        COALESCE(SUM(b.departure::date - b.arrival::date), 0)::int AS total_nights,
        ROUND(
          COALESCE(AVG(b.departure::date - b.arrival::date), 0), 2
        )::numeric AS average_length_of_stay
      FROM room_type rt
      LEFT JOIN room r ON rt.id = r.room_type_id
      LEFT JOIN booking b ON r.id = b.room_id AND b.status != 'cancelled'
      GROUP BY rt.id, rt.name
      ORDER BY average_length_of_stay DESC
    `;
    return await this._query(sql);
  }
};

// Understøt CommonJS hvis modulet indlæses via require
if (typeof module !== 'undefined' && module.exports) {
  module.exports = analyticsRepository;
}

// Named exports til test og modulær anvendelse
export const getTotalRoomRevenue = analyticsRepository.getTotalRoomRevenue.bind(analyticsRepository);
export const getRevenueByRoomType = analyticsRepository.getRevenueByRoomType.bind(analyticsRepository);
export const getRoomTypeAnnualAnalytics = analyticsRepository.getRoomTypeAnnualAnalytics.bind(analyticsRepository);
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
