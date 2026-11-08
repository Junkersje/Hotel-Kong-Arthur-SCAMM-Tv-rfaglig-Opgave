import analyticsRepository from '../repositories/analyticsRepository.js';
import seasonService from './seasonService.js';

/**
 * Hjælpefunktion til ADR-beregning med division med nul-beskyttelse (T042).
 * ADR = Værelsesomsætning / Solgte værelsesnætter
 *
 * @param {number|string} roomRevenue - Samlet værelsesomsætning
 * @param {number|string} soldRoomNights - Antal solgte værelsesnætter
 * @returns {number} Beregnet ADR afrundet til 2 decimaler (eller 0 ved 0 solgte nætter)
 */
function calculateADR(roomRevenue, soldRoomNights) {
  const revenue = Number(roomRevenue) || 0;
  const nights = Number(soldRoomNights) || 0;

  // Division med nul-beskyttelse
  if (nights <= 0 || revenue <= 0) {
    return 0;
  }

  return Number((revenue / nights).toFixed(2));
}

/**
 * Service-lag for Analytics og Forretningsnøgletal (Business Logic Layer)
 */

/**
 * Fordeler en bookings overnatninger og omsætning proportionelt over de måneder,
 * som opholdet dækker (Problem D: ophold hen over månedsskifter).
 *
 * @param {string|Date} checkInDate 
 * @param {string|Date} checkOutDate 
 * @param {number} [totalPrice=0]
 * @returns {Array<{ year: number, month: number, nights: number, revenue: number }>}
 */
function allocateBookingByMonth(checkInDate, checkOutDate, totalPrice = 0) {
  const start = new Date(checkInDate);
  const end = new Date(checkOutDate);
  const price = Number(totalPrice) || 0;

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
    return [];
  }

  const msPerDay = 86400000;
  const totalNights = Math.max(1, Math.round((end - start) / msPerDay));
  const monthCounts = {};

  const current = new Date(start);
  while (current < end) {
    const y = current.getUTCFullYear();
    const m = current.getUTCMonth() + 1;
    const key = y + '-' + m;
    if (!monthCounts[key]) {
      monthCounts[key] = { year: y, month: m, nights: 0 };
    }
    monthCounts[key].nights += 1;
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return Object.values(monthCounts).map(item => ({
    year: item.year,
    month: item.month,
    nights: item.nights,
    revenue: Number(((price * item.nights) / totalNights).toFixed(2))
  }));
}

const analyticsService = {
  allocateBookingByMonth,
  analyticsRepository,
  seasonService,
  calculateADR,

  /**
   * T036 [US5]: Samler total omsætning, værelsesomsætning, baromsætning,
   * bar-procentdel og belægningsgrad i én samlet rapport.
   * 
   * @returns {Promise<Object>} Hovednøgletal for hotellet
   */
  async getSummary() {
    const repo = this?.analyticsRepository || analyticsRepository;

    // 1. Hent rådata parallelt fra Dataadgangslaget (analyticsRepository)
    const [roomData, barData, occupancyData] = await Promise.all([
      repo.getTotalRoomRevenue(),
      repo.getTotalBarRevenue(),
      repo.getTotalOccupancySummary(),
    ]);

    const roomRevenue = Number(roomData?.total_room_revenue || 0);
    const barRevenue = Number(barData?.total_bar_revenue || 0);
    const totalRevenue = Number((roomRevenue + barRevenue).toFixed(2));
    const occupiedNights = Number(occupancyData?.total_occupied_room_nights || 0);

    // T042: Beregn ADR med division med nul-beskyttelse
    const adr = calculateADR(roomRevenue, occupiedNights);

    // 2. Beregn barens procentdel af den samlede omsætning
    let barRevenuePercentage = 0;
    if (totalRevenue > 0) {
      barRevenuePercentage = Number(((barRevenue / totalRevenue) * 100).toFixed(2));
    }

    let roomRevenuePercentage = 0;
    if (totalRevenue > 0) {
      roomRevenuePercentage = Number(((roomRevenue / totalRevenue) * 100).toFixed(2));
    }

    // 3. Saml og returner det fulde overbliksobjekt
    return {
      financials: {
        totalRevenue,
        roomRevenue,
        barRevenue,
        roomRevenuePercentage,
        barRevenuePercentage,
        adr,
        averageDailyRate: adr,
        currency: 'DKK',
      },
      occupancy: {
        occupiedRoomNights: occupiedNights,
        estimatedOverallOccupancyPercent: Number(occupancyData?.estimated_overall_occupancy_percent || 0),
        totalRoomsCapacity: 214,
      },
      bookingsCount: Number(roomData?.total_valid_bookings || 0),
      barTransactionsCount: Number(barData?.total_sales_transactions || 0),
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Henter værelsesomsætning fordelt på værelsestyper (valgfrit filtreret på år).
   * @param {number} [year] - Valgfrit årstal (f.eks. 2025 eller 2026)
   */
  async getRoomTypeBreakdown(year = null) {
    const repo = this?.analyticsRepository || analyticsRepository;
    return await repo.getRevenueByRoomType(year);
  },

  /**
   * US-14 & US-15: Henter detaljeret værelsesomsætning opdelt på år og sæson.
   * @param {number} [year] - Valgfrit årstal
   */
  async getRoomTypeAnnualAnalytics(year = null) {
    const repo = this?.analyticsRepository || analyticsRepository;
    if (typeof repo.getRoomTypeAnnualAnalytics === 'function') {
      return await repo.getRoomTypeAnnualAnalytics(year);
    }
    return await repo.getRevenueByRoomType(year);
  },

  /**
   * Henter månedlig belægningsgrad til overblik og grafer.
   */
  async getMonthlyOccupancy() {
    const repo = this?.analyticsRepository || analyticsRepository;
    return await repo.getMonthlyOccupancy();
  },

  /**
   * Henter cocktailbarens produktsalg og fordeling (Helene Christine).
   */
  async getBarPerformance() {
    const repo = this?.analyticsRepository || analyticsRepository;
    const [products, categories] = await Promise.all([
      repo.getRevenueByProduct(),
      repo.getBarCategoryDistribution(),
    ]);

    // Beregn samlet antal solgte enheder i baren til procentfordeling
    const totalItems = (categories || []).reduce((sum, item) => sum + Number(item.total_items_sold || 0), 0);

    const categoryDistribution = (categories || []).map(cat => ({
      category: cat.category,
      totalItemsSold: Number(cat.total_items_sold),
      totalRevenue: Number(cat.total_category_revenue),
      percentageOfTotalSales: totalItems > 0 
        ? Number(((Number(cat.total_items_sold) / totalItems) * 100).toFixed(2))
        : 0
    }));

    return {
      products,
      categoryDistribution,
      totalItemsSold: totalItems
    };
  },

  /**
   * T041 [P] [US15]: Henter gennemsnitlig opholdslængde fordelt på lande og værelsestyper.
   */
  async getStayLengthAnalytics() {
    const repo = this?.analyticsRepository || analyticsRepository;
    const [byCountry, byRoomType] = await Promise.all([
      repo.getALOSByCountry(),
      repo.getALOSByRoomType()
    ]);

    return {
      byCountry: (byCountry || []).map(item => ({
        country: item.country,
        totalBookings: Number(item.total_bookings),
        totalNights: Number(item.total_nights),
        alos: Number(item.average_length_of_stay)
      })),
      byRoomType: (byRoomType || []).map(item => ({
        roomTypeId: item.room_type_id,
        roomTypeName: item.room_type_name,
        totalBookings: Number(item.total_bookings),
        totalNights: Number(item.total_nights),
        alos: Number(item.average_length_of_stay)
      }))
    };
  },

  /**
   * T042 [P] [US16]: Henter detaljeret ADR-analyse på tværs af hotellet og værelsestyper samt måned.
   * @param {number} [year] - Valgfrit årstal til filtrering af månedlig ADR
   */
  async getADRAnalytics(year = null) {
    const repo = this?.analyticsRepository || analyticsRepository;
    const promises = [
      this.getSummary(),
      repo.getRevenueByRoomType(),
    ];

    const hasMonthlyMethod = typeof repo.getMonthlyRevenue === 'function';
    if (hasMonthlyMethod) {
      promises.push(repo.getMonthlyRevenue(year));
    }

    const [summary, roomTypeData, monthlyData] = await Promise.all(promises);

    const roomTypesADR = (roomTypeData || []).map((rt) => {
      const rev = Number(rt.total_revenue || 0);
      const nights = Number(rt.total_nights_sold || rt.total_bookings || 0);
      return {
        roomTypeId: rt.room_type_id,
        roomTypeName: rt.room_type_name,
        revenue: rev,
        soldNights: nights,
        adr: calculateADR(rev, nights),
      };
    });

    const result = {
      overallADR: summary.financials.adr,
      totalRoomRevenue: summary.financials.roomRevenue,
      totalSoldNights: summary.occupancy.occupiedRoomNights,
      byRoomType: roomTypesADR,
    };

    if (monthlyData) {
      result.byMonth = monthlyData.map((m) => {
        const rev = Number(m.total_revenue || 0);
        const nights = Number(m.total_nights_sold || m.total_nights_booked || 0);
        return {
          year: m.year,
          month: m.month,
          revenue: rev,
          soldNights: nights,
          adr: calculateADR(rev, nights),
        };
      });
    }

    return result;
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = analyticsService;
}

export const getSummary = analyticsService.getSummary.bind(analyticsService);
export const getRoomTypeBreakdown = analyticsService.getRoomTypeBreakdown.bind(analyticsService);
export const getMonthlyOccupancy = analyticsService.getMonthlyOccupancy.bind(analyticsService);
export const getBarPerformance = analyticsService.getBarPerformance.bind(analyticsService);
export const getStayLengthAnalytics = analyticsService.getStayLengthAnalytics.bind(analyticsService);
// calculateADR export
export { calculateADR };
export const getADRAnalytics = analyticsService.getADRAnalytics.bind(analyticsService);
export { allocateBookingByMonth };

export { analyticsService };
export default analyticsService;
