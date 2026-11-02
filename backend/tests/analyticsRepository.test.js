import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const executedCalls = [];

const mockPool = {
  query: async (sql, params = []) => {
    executedCalls.push({ sql, params });
    if (/FROM BOOKING/i.test(sql) && /WHERE status != 'cancelled'/i.test(sql)) {
      return [
        [
          {
            total_room_revenue: 1545000.5,
            total_valid_bookings: 850
          }
        ],
        []
      ];
    }
    if (/FROM ROOM_TYPE rt/i.test(sql) && /CASE/i.test(sql)) {
      return [
        [
          { room_type_id: 1, room_type_name: 'Single', season: 'high', total_bookings: 80, total_revenue: 150000 }
        ],
        []
      ];
    }
    if (/FROM ROOM_TYPE rt/i.test(sql)) {
      return [
        [
          { room_type_id: 1, room_type_name: 'Single', total_bookings: 200, total_revenue: 300000 },
          { room_type_id: 2, room_type_name: 'Double', total_bookings: 350, total_revenue: 700000 }
        ],
        []
      ];
    }
    if (/FROM SALE\b/i.test(sql)) {
      return [
        [
          {
            total_bar_revenue: 450200.75,
            total_sales_transactions: 3200
          }
        ],
        []
      ];
    }
    if (/FROM PRODUCT p/i.test(sql) && /GROUP BY p\.category/i.test(sql)) {
      return [
        [
          { category: 'Cocktail', total_items_sold: 1200, total_category_revenue: 150000 },
          { category: 'Coffee', total_items_sold: 1800, total_category_revenue: 81000 }
        ],
        []
      ];
    }
    if (/FROM PRODUCT p/i.test(sql) && /GROUP BY p\.id/i.test(sql)) {
      return [
        [
          { product_id: 1, product_name: 'Espresso Martini', category: 'Cocktail', total_quantity_sold: 450, total_revenue: 54000 },
          { product_id: 2, product_name: 'Cafe Latte', category: 'Coffee', total_quantity_sold: 600, total_revenue: 27000 }
        ],
        []
      ];
    }
    return [[], []];
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
  getBarCategoryDistribution
} = await import('../src/repositories/analyticsRepository.js');

test('T034: getTotalRoomRevenue henter samlet værelsesomsætning ekskl. aflyste', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getTotalRoomRevenue();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM BOOKING/i);
  assert.match(executedCalls[0].sql, /WHERE status != 'cancelled'/i);
  assert.match(executedCalls[0].sql, /COALESCE\(SUM\(total_price\), 0\) AS total_room_revenue/i);
  assert.deepEqual(result, {
    total_room_revenue: 1545000.5,
    total_valid_bookings: 850
  });
});

test('T034: getRevenueByRoomType grupperer omsætning pr. værelsestype', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getRevenueByRoomType();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM ROOM_TYPE rt/i);
  assert.match(executedCalls[0].sql, /LEFT JOIN BOOKING b ON rt\.id = b\.room_type_id AND b\.status != 'cancelled'/i);
  assert.match(executedCalls[0].sql, /GROUP BY rt\.id, rt\.name/i);
  assert.equal(result.length, 2);
  assert.equal(result[1].room_type_name, 'Double');
});

test('T034: getRevenueByRoomTypeAndSeason grupperer omsætning efter sæson og værelsestype', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getRevenueByRoomTypeAndSeason();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /CASE/i);
  assert.match(executedCalls[0].sql, /WHEN MONTH\(b\.check_in_date\) IN \(6, 7, 8\) THEN 'high'/i);
  assert.equal(result[0].season, 'high');
});

test('T034: getTotalBarRevenue henter samlet baromsætning fra SALE', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getTotalBarRevenue();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM SALE/i);
  assert.match(executedCalls[0].sql, /COALESCE\(SUM\(total_amount\), 0\) AS total_bar_revenue/i);
  assert.deepEqual(result, {
    total_bar_revenue: 450200.75,
    total_sales_transactions: 3200
  });
});

test('T034: getRevenueByProduct henter salg og omsætning pr. drink/produkt', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getRevenueByProduct();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM PRODUCT p/i);
  assert.match(executedCalls[0].sql, /LEFT JOIN SALE_LINE sl ON p\.id = sl\.product_id/i);
  assert.match(executedCalls[0].sql, /GROUP BY p\.id, p\.name, p\.category/i);
  assert.equal(result.length, 2);
  assert.equal(result[0].product_name, 'Espresso Martini');
});

test('T034: getBarCategoryDistribution henter fordeling mellem Cocktail og Coffee', async () => {
  executedCalls.length = 0;
  const result = await analyticsRepository.getBarCategoryDistribution();

  assert.equal(executedCalls.length, 1);
  assert.match(executedCalls[0].sql, /FROM PRODUCT p/i);
  assert.match(executedCalls[0].sql, /JOIN SALE_LINE sl ON p\.id = sl\.product_id/i);
  assert.match(executedCalls[0].sql, /GROUP BY p\.category/i);
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
    /WHERE\s+status\s*!=\s*'cancelled'/i.test(roomRevSql),
    'getTotalRoomRevenue skal ekskludere aflyste bookinger med WHERE status != \'cancelled\''
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
    query: async () => [
      [{ total_room_revenue: 0, total_valid_bookings: 0 }],
      []
    ]
  };

  analyticsRepository.db = customDb;
  const zeroResult = await analyticsRepository.getTotalRoomRevenue();
  assert.equal(zeroResult.total_room_revenue, 0);
  assert.equal(zeroResult.total_valid_bookings, 0);
  analyticsRepository.db = mockPool;
});

