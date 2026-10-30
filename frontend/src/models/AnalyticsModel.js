/**
 * MVVM: Model Layer - AnalyticsModel
 * Repræsenterer analytiske nøgletalsmodeller og forretningsberegninger.
 */

export const SEASONS = {
  LOW: 'Lavsæson',
  MID: 'Mellemsæson',
  HIGH: 'Højsæson'
};

/**
 * Beregner belægningsgrad ud fra optagne nætter og dage i perioden.
 * Formel: (Optagne nætter / (214 * antal dage)) * 100
 * @param {number} bookedNights
 * @param {number} daysInPeriod
 * @returns {number} Procent med 1 decimal
 */
export function calculateOccupancyRate(bookedNights, daysInPeriod) {
  if (!daysInPeriod || daysInPeriod <= 0) return 0;
  const totalCapacity = 214 * daysInPeriod;
  const rate = (bookedNights / totalCapacity) * 100;
  return Math.min(100, Math.max(0, Math.round(rate * 10) / 10));
}

/**
 * Beregner Average Daily Rate (ADR).
 * Formel: Værelsesomsætning / Solgte værelsesnætter
 * @param {number} roomRevenue
 * @param {number} soldNights
 * @returns {number}
 */
export function calculateADR(roomRevenue, soldNights) {
  if (!soldNights || soldNights <= 0) return 0;
  return Math.round((roomRevenue / soldNights) * 100) / 100;
}
