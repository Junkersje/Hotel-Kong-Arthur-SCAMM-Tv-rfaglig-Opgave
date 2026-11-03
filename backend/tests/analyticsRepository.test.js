import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const executedCalls = [];

const mockPool = {
  query: async (sql, params = []) => {
    executedCalls.push({ sql, params });

    // T035: getOccupancyRateByPeriod
    if (/occupancy_rate_percent/i.test(sql) && /LEAST/i.test(sql)) {
      return {
        rows: [
          {
            period_days: 90,
            total_capacity_room_nights: 19260,
            occupied_room_nights: 14500,
            occupancy_rate_percent: 75.29
          }
        ]
      };
    }

    // T035: getTotalOccupancySummary
    if (/MIN\(b\.arrival/i.test(sql) && /estimated_overall_occupancy_percent/i.test(sql)) {
      return {
        rows: [
          {
            earliest_booking: '2026-01-01',
            latest_booking: '2026-12-31',
            total_days_in_dataset: 365,
            total_occupied_room_nights: 55000,
            estimated_overall_occupancy_percent: 70.41
          }
        ]
      };
    }

    // T035: getMonthlyOccupancy
    if (/EXTRACT\(MONTH FROM b\.arrival\)/i.test(sql) && /monthly_capacity_room_nights/i.test(sql)) {
      return {
        rows: [
          {
            year: 2026,
            month: 7,
            total_bookings: 320,
            total_nights_booked: 5200,
            days_in_month: 31,
            monthly_capacity_room_nights: 6634,
            occupancy_rate_percent: 78.38
          }
        ]
      };
    }

    // T035: getOccupancyBySeason
    if (/season_capacity_room_nights/i.test(sql)) {
      return {
        rows: [
          {
            season: 'high',
            total_bookings: 950,
            total_nights_booked: 15500,
            season_capacity_room_nights: 19688,
            occupancy_rate_percent: 78.73
          },
          {
            season: 'mid',
            total_bookings: 1100,
            total_nights_booked: 21000,
            season_capacity_room_nights: 32742,
            occupancy_rate_percent: 64.14
          },
          {
            season: 'low',
            total_bookings: 600,
            total_nights_booked: 12000,
            season_capacity_room_nights: 25680,
            occupancy_rate_percent: 46.73
          }
        ]
      };
    }

    // T034: getTotalRoomRevenue
    if (/FROM booking/i.test(sql) && /WHERE b\.status != 'cancelled'/i.test(sql) && /total_room_revenue/i.test(sql)) {
      return {
        rows: [
          {
            total_room_revenue: 1545000.5,
            total_valid_bookings: 850
          }
        ]
      };
    }

    // T034: getRevenueByRoomTypeAndSeason
    if (/FROM room_type/i.test(sql) && /CASE/i.test(sql)) {
      return {
        rows: [
          { room_type_id: 1, room_type_name: 'Single', season: 'high', total_bookings: 80, total_revenue: 150000 }
        ]
      };
    }

    // T034: getRevenueByRoomType
    if (/FROM room_type/i.test(sql)) {
      return {
        rows: [
          { room_type_id: 1, room_type_name: 'Single', total_bookings: 200, total_revenue: 300000 },
          { room_type_id: 2, room_type_name: 'Double', total_bookings: 350, total_revenue: 700000 }
        ]
      };
    }

    // T034: getTotalBarRevenue
    if (/FROM sales/i.test(sql) && /product/i.test(sql) && /total_bar_revenue/i.test(sql)) {
      return {
        rows: [
          {
            total_bar_revenue: 450200.75,
            total_sales_transactions: 3200
          }
        ]
      };
    }

    // T034: getBarCategoryDistribution
    if (/FROM category/i.test(sql)) {
      return {
        rows: [
          { category: 'Cocktail', total_items_sold: 1200, total_category_revenue: 150000 },
          { category: 'Coffee', total_items_sold: 1800, total_category_revenue: 81000 }
        ]
      };
    }

    // T034: getRevenueByProduct
    if (/FROM product/i.test(sql)) {
      return {
        rows: [
          { product_id: 1, product_name: 'Espresso Martini', category: 'Cocktail', total_quantity_sold: 450, total_revenue: 54000 },
          { product_id: 2, product_name: 'Cafe Latte', category: 'Coffee', total_quantity_sold: 600, total_revenue: 27000 }
        ]
      };
    }

    return { rows: [] };
  }
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
  default: analyticsRepository,
  getTotalRoomRevenue,
  getRevenueByRoomType,
  getRevenueByRoomTypeAndSeason,
  getTotalBarRevenue,
  getRevenueByProduct,
  getBarCategoryDistribution,
  getOccupancyRateByPeriod,
  getTotalOccupancySummary,
  getMonthlyOccupancy,
  getOccupancyBySeason,
  getSeasonalOccupancy
} = await import('../src/repositories/analyticsRepository.js');

test('T034: getTotalRoomRevenue henter samlet værelsesomsætning ekskl. aflyste', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getTotalRoomRevenue();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM booking b/i);
  assert.match(executedCalls[0].sql, /WHERE b\.status != 'cancelled'/i);
  assert.match(executedCalls[0].sql, /COALESCE\(SUM\(b\.price\), 0\)::numeric AS total_room_revenue/i);
  assert.deepEqual(result, {
    total_room_revenue: 1545000.5,
    total_valid_bookings: 850
  });
});

test('T034: getRevenueByRoomType grupperer omsætning pr. værelsestype', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getRevenueByRoomType();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM room_type rt/i);
  assert.match(executedCalls[0].sql, /LEFT JOIN room r ON rt\.id = r\.room_type_id/i);
  assert.match(executedCalls[0].sql, /LEFT JOIN booking b ON r\.id = b\.room_id AND b\.status != 'cancelled'/i);
  assert.match(executedCalls[0].sql, /GROUP BY rt\.id, rt\.name/i);
  assert.equal(result.length, 2);
  assert.equal(result[1].room_type_name, 'Double');
});

test('T034: getRevenueByRoomTypeAndSeason grupperer omsætning efter sæson og værelsestype', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getRevenueByRoomTypeAndSeason();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /CASE/i);
  assert.match(executedCalls[0].sql, /WHEN EXTRACT\(MONTH FROM b\.arrival\)::int IN \(6, 7, 8\) THEN 'high'/i);
  assert.equal(result[0].season, 'high');
});

test('T034: getTotalBarRevenue henter samlet baromsætning fra sales og product', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getTotalBarRevenue();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM sales s/i);
  assert.match(executedCalls[0].sql, /JOIN product p ON s\.product_id = p\.id/i);
  assert.match(executedCalls[0].sql, /COALESCE\(SUM\(s\.quantity \* p\.unit_price\), 0\)::numeric AS total_bar_revenue/i);
  assert.deepEqual(result, {
    total_bar_revenue: 450200.75,
    total_sales_transactions: 3200
  });
});

test('T034: getRevenueByProduct henter salg og omsætning pr. drink/produkt', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getRevenueByProduct();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM product p/i);
  assert.match(executedCalls[0].sql, /LEFT JOIN category c ON p\.category_id = c\.id/i);
  assert.match(executedCalls[0].sql, /LEFT JOIN sales s ON p\.id = s\.product_id/i);
  assert.match(executedCalls[0].sql, /GROUP BY p\.id, p\.name, c\.name/i);
  assert.equal(result.length, 2);
  assert.equal(result[0].product_name, 'Espresso Martini');
});

test('T034: getBarCategoryDistribution henter fordeling mellem Cocktail og Coffee', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getBarCategoryDistribution();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM category c/i);
  assert.match(executedCalls[0].sql, /JOIN product p ON c\.id = p\.category_id/i);
  assert.match(executedCalls[0].sql, /JOIN sales s ON p\.id = s\.product_id/i);
  assert.match(executedCalls[0].sql, /GROUP BY c\.name/i);
  assert.equal(result.length, 2);
  assert.equal(result[0].category, 'Cocktail');
});

test('T034: Named exports fungerer ækvivalent til analyticsRepository-metoder', async () => {
  executedCalls.length = 0;
  const summary = await getTotalRoomRevenue();
  assert.equal(executedCalls.length, 1);
  assert.equal(summary.total_room_revenue, 1545000.5);

  executedCalls.length = 0;
  const barSummary = await getTotalBarRevenue();
  assert.equal(executedCalls.length, 1);
  assert.equal(barSummary.total_bar_revenue, 450200.75);

  executedCalls.length = 0;
  const dist = await getBarCategoryDistribution();
  assert.equal(executedCalls.length, 1);
  assert.equal(dist.length, 2);
});

test('T034 Acceptkriterie: Eksklusion af aflyste bookinger i SQL-klausuler', async () => {
  executedCalls.length = 0;
  await analyticsRepository.getTotalRoomRevenue();
  const roomRevSql = executedCalls[0].sql;
  assert.ok(
    /b\.status\s*!=\s*'cancelled'/i.test(roomRevSql),
    'getTotalRoomRevenue skal ekskludere aflyste bookinger med status != \'cancelled\''
  );

  executedCalls.length = 0;
  await analyticsRepository.getRevenueByRoomType();
  const roomTypeSql = executedCalls[0].sql;
  assert.ok(
    /b\.status\s*!=\s*'cancelled'/i.test(roomTypeSql),
    'getRevenueByRoomType skal ekskludere aflyste bookinger i JOIN-klausulen'
  );

  executedCalls.length = 0;
  await analyticsRepository.getRevenueByRoomTypeAndSeason();
  const seasonSql = executedCalls[0].sql;
  assert.ok(
    /b\.status\s*!=\s*'cancelled'/i.test(seasonSql),
    'getRevenueByRoomTypeAndSeason skal ekskludere aflyste bookinger i JOIN-klausulen'
  );
});

test('T034 Acceptkriterie: Korrekt COALESCE håndtering ved 0 bookinger eller 0 salg', async () => {
  const customDb = {
    query: async () => ({
      rows: [{ total_room_revenue: 0, total_valid_bookings: 0 }]
    })
  };

  analyticsRepository.db = customDb;
  const zeroResult = await analyticsRepository.getTotalRoomRevenue();
  assert.equal(zeroResult.total_room_revenue, 0);
  assert.equal(zeroResult.total_valid_bookings, 0);
  analyticsRepository.db = mockPool;
});

test('T035: getOccupancyRateByPeriod beregner belægningsgrad for en specifik periode', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getOccupancyRateByPeriod('2026-06-01', '2026-08-31');

  assert.equal(executedCalls.length, 1);
  const call = executedCalls[0];
  assert.match(call.sql, /FROM booking b/i);
  assert.match(call.sql, /b\.status != 'cancelled'/i);
  assert.match(call.sql, /LEAST\(b\.departure::date, \$2::date\)/i);
  assert.match(call.sql, /GREATEST\(b\.arrival::date, \$1::date\)/i);
  assert.match(call.sql, /b\.arrival::date < \$2::date/i);
  assert.match(call.sql, /b\.departure::date > \$1::date/i);
  assert.match(call.sql, /occupancy_rate_percent/i);
  assert.ok(call.params.includes(214), 'TOTAL_ROOMS = 214 skal indgå i parametrene');
  assert.equal(call.params[0], '2026-06-01');
  assert.equal(call.params[1], '2026-08-31');
  assert.equal(call.params[2], 214);
  assert.deepEqual(result, {
    period_days: 90,
    total_capacity_room_nights: 19260,
    occupied_room_nights: 14500,
    occupancy_rate_percent: 75.29
  });
});

test('T035: getTotalOccupancySummary henter overordnet belægningsresumé', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getTotalOccupancySummary();

  assert.equal(executedCalls.length, 1);
  const call = executedCalls[0];
  assert.match(call.sql, /FROM booking b/i);
  assert.match(call.sql, /status != 'cancelled'/i);
  assert.match(call.sql, /MIN\(b\.arrival::date\)/i);
  assert.match(call.sql, /MAX\(b\.departure::date\)/i);
  assert.match(call.sql, /estimated_overall_occupancy_percent/i);
  assert.deepEqual(call.params, [214]);
  assert.equal(result.total_days_in_dataset, 365);
  assert.equal(result.estimated_overall_occupancy_percent, 70.41);
});

test('T035: getMonthlyOccupancy grupperer månedlig belægningsgrad', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getMonthlyOccupancy();

  assert.equal(executedCalls.length, 1);
  const call = executedCalls[0];
  assert.match(call.sql, /FROM booking b/i);
  assert.match(call.sql, /EXTRACT\(YEAR FROM b\.arrival\)/i);
  assert.match(call.sql, /EXTRACT\(MONTH FROM b\.arrival\)/i);
  assert.match(call.sql, /DATE_TRUNC\('month', b\.arrival\)/i);
  assert.match(call.sql, /b\.departure::date - b\.arrival::date/i);
  assert.match(call.sql, /b\.status != 'cancelled'/i);
  assert.deepEqual(call.params, [214]);
  assert.equal(result.length, 1);
  assert.equal(result[0].occupancy_rate_percent, 78.38);

  // Test med specifikt år
  executedCalls.length = 0;
  await analyticsRepository.getMonthlyOccupancy(2026);
  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /AND EXTRACT\(YEAR FROM b\.arrival\)::int = \$2::int/i);
  assert.deepEqual(executedCalls[0].params, [214, 2026]);
});

test('T035: getOccupancyBySeason henter sæsonmæssig belægningsgrad', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getOccupancyBySeason();

  assert.equal(executedCalls.length, 1);
  const call = executedCalls[0];
  assert.match(call.sql, /season/i);
  assert.match(call.sql, /season_capacity_room_nights/i);
  assert.match(call.sql, /b\.departure::date - b\.arrival::date/i);
  assert.match(call.sql, /b\.status != 'cancelled'/i);
  assert.equal(result.length, 3);
  assert.equal(result[0].season, 'high');

  // getSeasonalOccupancy alias
  executedCalls.length = 0;
  const aliasResult = await analyticsRepository.getSeasonalOccupancy(2026);
  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /AND EXTRACT\(YEAR FROM b\.arrival\)::int = \$2::int/i);
  assert.equal(aliasResult.length, 3);
});

test('T035: Named exports fungerer for belægningsgrad-funktionerne', async () => {
  executedCalls.length = 0;
  const periodRes = await getOccupancyRateByPeriod('2026-06-01', '2026-08-31');
  assert.equal(executedCalls.length, 1);
  assert.equal(periodRes.occupancy_rate_percent, 75.29);

  executedCalls.length = 0;
  const summaryRes = await getTotalOccupancySummary();
  assert.equal(executedCalls.length, 1);
  assert.equal(summaryRes.estimated_overall_occupancy_percent, 70.41);

  executedCalls.length = 0;
  const monthlyRes = await getMonthlyOccupancy();
  assert.equal(executedCalls.length, 1);
  assert.equal(monthlyRes[0].occupancy_rate_percent, 78.38);

  executedCalls.length = 0;
  const seasonRes = await getOccupancyBySeason();
  assert.equal(executedCalls.length, 1);
  assert.equal(seasonRes[0].season, 'high');

  executedCalls.length = 0;
  const aliasRes = await getSeasonalOccupancy();
  assert.equal(executedCalls.length, 1);
  assert.equal(aliasRes[0].season, 'high');
});

test('T035 Acceptkriterie: Alle belægningsforespørgsler ekskluderer aflyste bookinger og bruger 214 værelser', async () => {
  executedCalls.length = 0;
  await analyticsRepository.getOccupancyRateByPeriod('2026-01-01', '2026-01-31');
  await analyticsRepository.getTotalOccupancySummary();
  await analyticsRepository.getMonthlyOccupancy();
  await analyticsRepository.getOccupancyBySeason();

  assert.equal(executedCalls.length, 4);
  for (const call of executedCalls) {
    assert.ok(
      /status\s*!=\s*'cancelled'/i.test(call.sql),
      `Forespørgsel skal have WHERE status != 'cancelled': ${call.sql}`
    );
    assert.ok(
      call.params.includes(214),
      `Forespørgsel skal anvende 214 værelser i params: ${call.params}`
    );
  }
});
