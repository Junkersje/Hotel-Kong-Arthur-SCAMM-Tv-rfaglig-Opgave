import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const mockPool = {
  query: async () => [[], []]
};

mock.module('../src/config/database.js', {
  defaultExport: mockPool,
  namedExports: {
    pool: mockPool
  }
});

mock.module('../src/repositories/db.js', {
  defaultExport: { pool: mockPool },
  namedExports: {
    pool: mockPool
  }
});

const {
  default: analyticsService,
  getSummary,
  getRoomTypeBreakdown,
  getMonthlyOccupancy,
  getBarPerformance,
  calculateADR,
  getADRAnalytics
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

test('T042: calculateADR beregner dagspris korrekt og runder til 2 decimaler', () => {
  // 1.400.000 DKK / 1.000 nætter = 1.400,00 DKK
  assert.equal(calculateADR(1400000, 1000), 1400);
  assert.equal(calculateADR('1400000', '1000'), 1400);

  // Afrunding til 2 decimaler: 1000 / 3 = 333.3333... -> 333.33
  assert.equal(calculateADR(1000, 3), 333.33);

  // 123456.78 / 500 = 246.91356 -> 246.91
  assert.equal(calculateADR(123456.78, 500), 246.91);
});

test('T042: calculateADR beskytter mod division med 0 og ugyldige værdier', () => {
  assert.equal(calculateADR(1400000, 0), 0);
  assert.equal(calculateADR(0, 1000), 0);
  assert.equal(calculateADR(0, 0), 0);
  assert.equal(calculateADR(-5000, 10), 0);
  assert.equal(calculateADR(5000, -10), 0);
  assert.equal(calculateADR(null, undefined), 0);
  assert.equal(calculateADR('ugyldig', 'ugyldig'), 0);
});

test('T042: getSummary inkluderer adr og averageDailyRate under financials', async () => {
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

  // 800000 / 12000 = 66.666... -> 66.67
  assert.equal(summary.financials.adr, 66.67);
  assert.equal(summary.financials.averageDailyRate, 66.67);
});

test('T042: getSummary sætter adr til 0 ved 0 solgte overnatninger', async () => {
  const mockRepo = {
    getTotalRoomRevenue: async () => ({
      total_room_revenue: 50000,
      total_valid_bookings: 10
    }),
    getTotalBarRevenue: async () => ({
      total_bar_revenue: 5000,
      total_sales_transactions: 20
    }),
    getTotalOccupancySummary: async () => ({
      total_occupied_room_nights: 0,
      estimated_overall_occupancy_percent: 0
    })
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const summary = await service.getSummary();

  assert.equal(summary.financials.adr, 0);
  assert.equal(summary.financials.averageDailyRate, 0);
});

test('T042: getADRAnalytics beregner samlet ADR og ADR opdelt pr. værelsestype', async () => {
  const mockRoomTypeData = [
    {
      room_type_id: 1,
      room_type_name: 'Single',
      total_bookings: 50,
      total_nights_sold: 100,
      total_revenue: 120000
    },
    {
      room_type_id: 2,
      room_type_name: 'Suite',
      total_bookings: 20,
      total_nights_sold: 40,
      total_revenue: 100000
    },
    {
      room_type_id: 3,
      room_type_name: 'Budget Room',
      total_bookings: 0,
      total_nights_sold: 0,
      total_revenue: 0
    }
  ];

  const mockRepo = {
    getTotalRoomRevenue: async () => ({ total_room_revenue: 220000, total_valid_bookings: 70 }),
    getTotalBarRevenue: async () => ({ total_bar_revenue: 0, total_sales_transactions: 0 }),
    getTotalOccupancySummary: async () => ({ total_occupied_room_nights: 140, estimated_overall_occupancy_percent: 50 }),
    getRevenueByRoomType: async () => mockRoomTypeData
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const adrResult = await service.getADRAnalytics();

  // 220000 / 140 = 1571.4285... -> 1571.43
  assert.equal(adrResult.overallADR, 1571.43);
  assert.equal(adrResult.totalRoomRevenue, 220000);
  assert.equal(adrResult.totalSoldNights, 140);
  assert.equal(adrResult.byRoomType.length, 3);

  // Single: 120000 / 100 = 1200
  assert.equal(adrResult.byRoomType[0].roomTypeName, 'Single');
  assert.equal(adrResult.byRoomType[0].soldNights, 100);
  assert.equal(adrResult.byRoomType[0].adr, 1200);

  // Suite: 100000 / 40 = 2500
  assert.equal(adrResult.byRoomType[1].roomTypeName, 'Suite');
  assert.equal(adrResult.byRoomType[1].soldNights, 40);
  assert.equal(adrResult.byRoomType[1].adr, 2500);

  // Budget Room: 0 / 0 = 0 (nul-beskyttelse)
  assert.equal(adrResult.byRoomType[2].roomTypeName, 'Budget Room');
  assert.equal(adrResult.byRoomType[2].soldNights, 0);
  assert.equal(adrResult.byRoomType[2].adr, 0);
});

test('T042: getADRAnalytics inkluderer månedlig fordeling hvis tilgængelig', async () => {
  const mockRepo = {
    getTotalRoomRevenue: async () => ({ total_room_revenue: 100000, total_valid_bookings: 50 }),
    getTotalBarRevenue: async () => ({ total_bar_revenue: 0, total_sales_transactions: 0 }),
    getTotalOccupancySummary: async () => ({ total_occupied_room_nights: 100, estimated_overall_occupancy_percent: 50 }),
    getRevenueByRoomType: async () => [
      { room_type_id: 1, room_type_name: 'Single', total_nights_sold: 100, total_revenue: 100000 }
    ],
    getMonthlyRevenue: async () => [
      { year: 2026, month: 7, total_nights_sold: 60, total_revenue: 66000 },
      { year: 2026, month: 8, total_nights_sold: 40, total_revenue: 34000 }
    ]
  };

  const service = { ...analyticsService, analyticsRepository: mockRepo };
  const adrResult = await service.getADRAnalytics();

  assert.ok(Array.isArray(adrResult.byMonth));
  assert.equal(adrResult.byMonth.length, 2);
  assert.equal(adrResult.byMonth[0].month, 7);
  assert.equal(adrResult.byMonth[0].adr, 1100); // 66000 / 60
  assert.equal(adrResult.byMonth[1].month, 8);
  assert.equal(adrResult.byMonth[1].adr, 850);  // 34000 / 40
});

test('T042: Named exports for calculateADR og getADRAnalytics fungerer', () => {
  assert.equal(typeof calculateADR, 'function');
  assert.equal(typeof getADRAnalytics, 'function');
});
