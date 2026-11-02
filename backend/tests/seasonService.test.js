import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SEASONS,
  SEASON_LABELS_DK,
  MONTH_TO_SEASON,
  parseToUTCDate,
  getSeasonByMonth,
  getSeasonForDate,
  getSeasonLabelDK,
  calculateNightsBySeason,
  allocateBookingBySeason,
} from '../src/services/seasonService.js';

test('T033: Sæsondefinitioner og labels', () => {
  assert.equal(SEASONS.LOW, 'low');
  assert.equal(SEASONS.MID, 'mid');
  assert.equal(SEASONS.HIGH, 'high');

  assert.equal(getSeasonLabelDK(SEASONS.LOW), 'Lavsæson');
  assert.equal(getSeasonLabelDK(SEASONS.MID), 'Mellemsæson');
  assert.equal(getSeasonLabelDK(SEASONS.HIGH), 'Højsæson');
  assert.equal(getSeasonLabelDK('invalid'), 'Ukendt sæson');
});

test('T033: Måneders sæsontilhørsforhold', () => {
  // Lavsæson: nov (11), dec (12), jan (1), feb (2)
  assert.equal(getSeasonByMonth(1), SEASONS.LOW);
  assert.equal(getSeasonByMonth(2), SEASONS.LOW);
  assert.equal(getSeasonByMonth(11), SEASONS.LOW);
  assert.equal(getSeasonByMonth(12), SEASONS.LOW);

  // Mellemsæson: mar (3), apr (4), maj (5), sep (9), okt (10)
  assert.equal(getSeasonByMonth(3), SEASONS.MID);
  assert.equal(getSeasonByMonth(4), SEASONS.MID);
  assert.equal(getSeasonByMonth(5), SEASONS.MID);
  assert.equal(getSeasonByMonth(9), SEASONS.MID);
  assert.equal(getSeasonByMonth(10), SEASONS.MID);

  // Højsæson: jun (6), jul (7), aug (8)
  assert.equal(getSeasonByMonth(6), SEASONS.HIGH);
  assert.equal(getSeasonByMonth(7), SEASONS.HIGH);
  assert.equal(getSeasonByMonth(8), SEASONS.HIGH);

  assert.throws(() => getSeasonByMonth(0), /Ugyldigt månedsnummer/);
  assert.throws(() => getSeasonByMonth(13), /Ugyldigt månedsnummer/);
});

test('T033: getSeasonForDate og datoparsing', () => {
  assert.equal(getSeasonForDate('2026-01-15'), SEASONS.LOW);
  assert.equal(getSeasonForDate('2026-04-10'), SEASONS.MID);
  assert.equal(getSeasonForDate('2026-07-20'), SEASONS.HIGH);
  assert.equal(getSeasonForDate(new Date(2026, 6, 20)), SEASONS.HIGH);

  assert.throws(() => parseToUTCDate(''), /Dato mangler/);
  assert.throws(() => parseToUTCDate('invalid-date'), /Ugyldigt datoformat/);
});

test('T033: calculateNightsBySeason for ophold inden for én sæson', () => {
  const stats = calculateNightsBySeason('2026-07-01', '2026-07-05');
  assert.deepEqual(stats, {
    low: 0,
    mid: 0,
    high: 4,
    totalNights: 4,
    primarySeason: SEASONS.HIGH,
    isCrossSeason: false,
  });
});

test('T033: calculateNightsBySeason for ophold hen over sæsonskift', () => {
  // 30. og 31. maj (mid, 2 nætter) + 1. og 2. juni (high, 2 nætter) -> afrejse 3. juni
  const stats = calculateNightsBySeason('2026-05-30', '2026-06-03');
  assert.equal(stats.mid, 2);
  assert.equal(stats.high, 2);
  assert.equal(stats.low, 0);
  assert.equal(stats.totalNights, 4);
  assert.equal(stats.isCrossSeason, true);

  // Validering af check-out efter check-in
  assert.throws(() => calculateNightsBySeason('2026-07-05', '2026-07-01'), /Afrejsedato skal være efter ankomstdato/);
});

test('T033: allocateBookingBySeason fordeler omsætning og håndterer afrunding', () => {
  const result = allocateBookingBySeason('2026-05-30', '2026-06-03', 4000);
  assert.equal(result.nights.totalNights, 4);
  assert.equal(result.nights.mid, 2);
  assert.equal(result.nights.high, 2);
  assert.equal(result.revenue.mid, 2000);
  assert.equal(result.revenue.high, 2000);
  assert.equal(result.revenue.totalRevenue, 4000);
  assert.equal(result.revenue.pricePerNight, 1000);
  assert.equal(result.isCrossSeason, true);

  // Validering af negativ pris
  assert.throws(() => allocateBookingBySeason('2026-07-01', '2026-07-03', -500), /Totalpris kan ikke være negativ/);
});
