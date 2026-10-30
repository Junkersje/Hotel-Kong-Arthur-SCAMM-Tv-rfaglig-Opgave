/**
 * Business Logic Layer: SeasonService (OOP Class)
 * Single Responsibility: Beregning af sæsontilhørsforhold for hotellets 3 officielle sæsoner.
 */

import { SEASONS } from '../constants/hotelConstants.js';

export class SeasonService {
  /**
   * Returnerer sæson for en given dato i henhold til de godkendte 4-måneders blokke:
   * - Lavsæson: Nov, Dec, Jan, Feb
   * - Mellemsæson: Mar, Apr, Maj samt Sep, Okt
   * - Højsæson: Jun, Jul, Aug
   * @param {Date|string} dateInput
   * @returns {string} SEASONS enum
   */
  getSeasonForDate(dateInput) {
    const d = new Date(dateInput);
    const month = d.getMonth() + 1; // 1-12

    if (month === 11 || month === 12 || month === 1 || month === 2) {
      return SEASONS.LOW;
    } else if (month === 6 || month === 7 || month === 8) {
      return SEASONS.HIGH;
    } else {
      return SEASONS.MID;
    }
  }

  /**
   * Fordeler overnatninger på de 3 sæsoner for en periode.
   * @param {string} checkIn
   * @param {string} checkOut
   * @returns {{ [season]: number }}
   */
  calculateNightsPerSeason(checkIn, checkOut) {
    const distribution = {
      [SEASONS.LOW]: 0,
      [SEASONS.MID]: 0,
      [SEASONS.HIGH]: 0
    };

    const current = new Date(checkIn);
    const end = new Date(checkOut);

    while (current < end) {
      const season = this.getSeasonForDate(current);
      distribution[season]++;
      current.setDate(current.getDate() + 1);
    }

    return distribution;
  }
}

export default new SeasonService();
