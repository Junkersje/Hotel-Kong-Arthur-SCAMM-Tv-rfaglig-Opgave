import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const mockPool = {
  query: async () => [[], []]
};

mock.module('../src/config/database.js', {
  exports: {
    default: mockPool,
    pool: mockPool
  }
});

mock.module('../src/repositories/db.js', {
  exports: {
    default: { pool: mockPool },
    pool: mockPool
  }
});

const {
  default: analyticsService,
  getSummary,
  getRoomTypeBreakdown,
  getMonthlyOccupancy,
  getBarPerformance
} = await import('../src/services/analyticsService.js');

test('T036: getSummary samler total omsætning, værelsesomsætning, baromsætning og belægning', async () => {
  const mockRepo = {
    getTotalRoomRevenue: async () => ({
      total_room_revenue: 800000,
      total_valid_bookings: 500
    }),
    getTotalBarRevenue: async () => ({
      total_bar_revenue: 200000,
      total_sales_transactions: 1500
    }),
    getTotalOccupancySummary: async () => ({
      total_occupied_room_nights: 12000,
      estimated_overall_occupancy_percent: 72.45
    })
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const summary = await service.getSummary();

  assert.equal(summary.financials.totalRevenue, 1000000);
  assert.equal(summary.financials.roomRevenue, 800000);
  assert.equal(summary.financials.barRevenue, 200000);
  assert.equal(summary.financials.roomRevenuePercentage, 80);
  assert.equal(summary.financials.barRevenuePercentage, 20);
  assert.equal(summary.financials.currency, 'DKK');

  assert.equal(summary.occupancy.occupiedRoomNights, 12000);
  assert.equal(summary.occupancy.estimatedOverallOccupancyPercent, 72.45);
  assert.equal(summary.occupancy.totalRoomsCapacity, 214);

  assert.equal(summary.bookingsCount, 500);
  assert.equal(summary.barTransactionsCount, 1500);
  assert.ok(summary.generatedAt);
  assert.doesNotThrow(() => new Date(summary.generatedAt));
});

test('T036: getSummary håndterer afrunding af procenter og totaler til 2 decimaler', async () => {
  const mockRepo = {
    getTotalRoomRevenue: async () => ({
      total_room_revenue: 123456.78,
      total_valid_bookings: 100
    }),
    getTotalBarRevenue: async () => ({
      total_bar_revenue: 23456.78,
      total_sales_transactions: 250
    }),
    getTotalOccupancySummary: async () => ({
      total_occupied_room_nights: 4321,
      estimated_overall_occupancy_percent: 68.33
    })
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const summary = await service.getSummary();

  // 123456.78 + 23456.78 = 146913.56
  assert.equal(summary.financials.totalRevenue, 146913.56);
  assert.equal(summary.financials.roomRevenue, 123456.78);
  assert.equal(summary.financials.barRevenue, 23456.78);
  // bar: (23456.78 / 146913.56) * 100 = 15.96638... -> 15.97
  assert.equal(summary.financials.barRevenuePercentage, 15.97);
  // room: (123456.78 / 146913.56) * 100 = 84.0336... -> 84.03
  assert.equal(summary.financials.roomRevenuePercentage, 84.03);
});

test('T036: getSummary håndterer division med nul og null/tomme værdier uden fejl', async () => {
  const mockRepo = {
    getTotalRoomRevenue: async () => null,
    getTotalBarRevenue: async () => ({ total_bar_revenue: 0 }),
    getTotalOccupancySummary: async () => ({})
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const summary = await service.getSummary();

  assert.equal(summary.financials.totalRevenue, 0);
  assert.equal(summary.financials.roomRevenue, 0);
  assert.equal(summary.financials.barRevenue, 0);
  assert.equal(summary.financials.roomRevenuePercentage, 0);
  assert.equal(summary.financials.barRevenuePercentage, 0);

  assert.equal(summary.occupancy.occupiedRoomNights, 0);
  assert.equal(summary.occupancy.estimatedOverallOccupancyPercent, 0);
  assert.equal(summary.occupancy.totalRoomsCapacity, 214);

  assert.equal(summary.bookingsCount, 0);
  assert.equal(summary.barTransactionsCount, 0);
});

test('T036: getRoomTypeBreakdown delegerer til analyticsRepository', async () => {
  const mockBreakdown = [
    { room_type_id: 1, room_type_name: 'Single', total_bookings: 100, total_revenue: 200000 }
  ];
  const mockRepo = {
    getRevenueByRoomType: async () => mockBreakdown
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const result = await service.getRoomTypeBreakdown();

  assert.deepEqual(result, mockBreakdown);
});

test('T036: getMonthlyOccupancy delegerer til analyticsRepository', async () => {
  const mockMonthly = [
    { year: 2026, month: 7, occupancy_rate_percent: 85.5 }
  ];
  const mockRepo = {
    getMonthlyOccupancy: async () => mockMonthly
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const result = await service.getMonthlyOccupancy();

  assert.deepEqual(result, mockMonthly);
});

test('T036: getBarPerformance beregner kategorifordeling og procenter', async () => {
  const mockProducts = [
    { product_id: 1, product_name: 'Espresso Martini', category: 'Cocktail', total_quantity_sold: 50, total_revenue: 6000 },
    { product_id: 2, product_name: 'Cappuccino', category: 'Coffee', total_quantity_sold: 150, total_revenue: 6750 }
  ];
  const mockCategories = [
    { category: 'Cocktail', total_items_sold: 50, total_category_revenue: 6000 },
    { category: 'Coffee', total_items_sold: 150, total_category_revenue: 6750 }
  ];
  const mockRepo = {
    getRevenueByProduct: async () => mockProducts,
    getBarCategoryDistribution: async () => mockCategories
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const result = await service.getBarPerformance();

  assert.equal(result.totalItemsSold, 200);
  assert.equal(result.products.length, 2);
  assert.equal(result.categoryDistribution.length, 2);

  // Cocktail: 50 / 200 * 100 = 25%
  assert.equal(result.categoryDistribution[0].category, 'Cocktail');
  assert.equal(result.categoryDistribution[0].totalItemsSold, 50);
  assert.equal(result.categoryDistribution[0].totalRevenue, 6000);
  assert.equal(result.categoryDistribution[0].percentageOfTotalSales, 25);

  // Coffee: 150 / 200 * 100 = 75%
  assert.equal(result.categoryDistribution[1].category, 'Coffee');
  assert.equal(result.categoryDistribution[1].totalItemsSold, 150);
  assert.equal(result.categoryDistribution[1].totalRevenue, 6750);
  assert.equal(result.categoryDistribution[1].percentageOfTotalSales, 75);
});

test('T036: getBarPerformance håndterer tomme kategorier uden division med 0', async () => {
  const mockRepo = {
    getRevenueByProduct: async () => [],
    getBarCategoryDistribution: async () => []
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const result = await service.getBarPerformance();

  assert.equal(result.totalItemsSold, 0);
  assert.deepEqual(result.products, []);
  assert.deepEqual(result.categoryDistribution, []);
});

test('T036: Named exports fungerer og er bundet til analyticsService', () => {
  assert.equal(typeof getSummary, 'function');
  assert.equal(typeof getRoomTypeBreakdown, 'function');
  assert.equal(typeof getMonthlyOccupancy, 'function');
  assert.equal(typeof getBarPerformance, 'function');
});
