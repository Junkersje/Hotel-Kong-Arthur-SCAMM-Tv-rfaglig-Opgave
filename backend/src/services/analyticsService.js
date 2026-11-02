import analyticsRepository from '../repositories/analyticsRepository.js';
import seasonService from './seasonService.js';

/**
 * Service-lag for Analytics og Forretningsnøgletal (Business Logic Layer)
 */
const analyticsService = {
  analyticsRepository,
  seasonService,

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
        currency: 'DKK',
      },
      occupancy: {
        occupiedRoomNights: Number(occupancyData?.total_occupied_room_nights || 0),
        estimatedOverallOccupancyPercent: Number(occupancyData?.estimated_overall_occupancy_percent || 0),
        totalRoomsCapacity: 214,
      },
      bookingsCount: Number(roomData?.total_valid_bookings || 0),
      barTransactionsCount: Number(barData?.total_sales_transactions || 0),
      generatedAt: new Date().toISOString(),
    };
  },

  /**
   * Henter værelsesomsætning fordelt på værelsestyper.
   */
  async getRoomTypeBreakdown() {
    const repo = this?.analyticsRepository || analyticsRepository;
    return await repo.getRevenueByRoomType();
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
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = analyticsService;
}

export const getSummary = analyticsService.getSummary.bind(analyticsService);
export const getRoomTypeBreakdown = analyticsService.getRoomTypeBreakdown.bind(analyticsService);
export const getMonthlyOccupancy = analyticsService.getMonthlyOccupancy.bind(analyticsService);
export const getBarPerformance = analyticsService.getBarPerformance.bind(analyticsService);

export { analyticsService };
export default analyticsService;
