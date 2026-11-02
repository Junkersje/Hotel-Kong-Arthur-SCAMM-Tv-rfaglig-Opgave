const SEASONS = {
  LOW: 'low',
  MID: 'mid',
  HIGH: 'high',
};

const SEASON_LABELS_DK = {
  low: 'Lavsæson',
  mid: 'Mellemsæson',
  high: 'Højsæson',
};

const MONTH_TO_SEASON = {
  1: SEASONS.LOW,
  2: SEASONS.LOW,
  3: SEASONS.MID,
  4: SEASONS.MID,
  5: SEASONS.MID,
  6: SEASONS.HIGH,
  7: SEASONS.HIGH,
  8: SEASONS.HIGH,
  9: SEASONS.MID,
  10: SEASONS.MID,
  11: SEASONS.LOW,
  12: SEASONS.LOW,
};

function parseToUTCDate(dateInput) {
  if (!dateInput) {
    throw new Error('Dato mangler.');
  }
  if (dateInput instanceof Date) {
    if (isNaN(dateInput.getTime())) {
      throw new Error('Ugyldigt Date-objekt.');
    }
    return new Date(Date.UTC(
      dateInput.getFullYear(),
      dateInput.getMonth(),
      dateInput.getDate()
    ));
  }
  if (typeof dateInput === 'string') {
    const datePart = dateInput.split('T')[0].trim();
    const parts = datePart.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      if (
        utcDate.getUTCFullYear() === year &&
        utcDate.getUTCMonth() === month - 1 &&
        utcDate.getUTCDate() === day
      ) {
        return utcDate;
      }
    }
  }
  throw new Error(`Ugyldigt datoformat: "${dateInput}". Forventede 'YYYY-MM-DD'.`);
}

function getSeasonByMonth(monthNumber) {
  const season = MONTH_TO_SEASON[Number(monthNumber)];
  if (!season) {
    throw new Error(`Ugyldigt månedsnummer: ${monthNumber}. Skal være mellem 1 og 12.`);
  }
  return season;
}

function getSeasonForDate(dateInput) {
  const utcDate = parseToUTCDate(dateInput);
  const monthNumber = utcDate.getUTCMonth() + 1;
  return getSeasonByMonth(monthNumber);
}

function getSeasonLabelDK(seasonCode) {
  return SEASON_LABELS_DK[seasonCode] || 'Ukendt sæson';
}

function calculateNightsBySeason(checkInDate, checkOutDate) {
  const startUTC = parseToUTCDate(checkInDate);
  const endUTC = parseToUTCDate(checkOutDate);

  if (endUTC <= startUTC) {
    throw new Error('Afrejsedato skal være efter ankomstdato.');
  }

  const counts = { low: 0, mid: 0, high: 0 };
  const currentNight = new Date(startUTC.getTime());
  let totalNights = 0;

  while (currentNight < endUTC) {
    const month = currentNight.getUTCMonth() + 1;
    const season = MONTH_TO_SEASON[month];
    counts[season] += 1;
    totalNights += 1;
    currentNight.setUTCDate(currentNight.getUTCDate() + 1);
  }

  const checkInSeason = getSeasonForDate(startUTC);
  let primarySeason = checkInSeason;
  let maxNights = counts[checkInSeason];

  for (const s of [SEASONS.LOW, SEASONS.MID, SEASONS.HIGH]) {
    if (counts[s] > maxNights) {
      maxNights = counts[s];
      primarySeason = s;
    }
  }

  const activeSeasons = Object.values(counts).filter((n) => n > 0).length;

  return {
    low: counts.low,
    mid: counts.mid,
    high: counts.high,
    totalNights,
    primarySeason,
    isCrossSeason: activeSeasons > 1,
  };
}

function allocateBookingBySeason(checkInDate, checkOutDate, totalPrice = 0) {
  const nightStats = calculateNightsBySeason(checkInDate, checkOutDate);
  const numericPrice = Number(totalPrice) || 0;

  if (numericPrice < 0) {
    throw new Error('Totalpris kan ikke være negativ.');
  }

  const { low, mid, high, totalNights, primarySeason, isCrossSeason } = nightStats;
  const pricePerNight = Number((numericPrice / totalNights).toFixed(2));

  let revLow = Number(((numericPrice * low) / totalNights).toFixed(2));
  let revMid = Number(((numericPrice * mid) / totalNights).toFixed(2));
  let revHigh = Number(((numericPrice * high) / totalNights).toFixed(2));

  const calculatedSum = Number((revLow + revMid + revHigh).toFixed(2));
  const targetSum = Number(numericPrice.toFixed(2));
  const roundingDiff = Number((targetSum - calculatedSum).toFixed(2));

  if (roundingDiff !== 0) {
    if (primarySeason === SEASONS.LOW) revLow = Number((revLow + roundingDiff).toFixed(2));
    else if (primarySeason === SEASONS.MID) revMid = Number((revMid + roundingDiff).toFixed(2));
    else revHigh = Number((revHigh + roundingDiff).toFixed(2));
  }

  return {
    nights: { low, mid, high, totalNights },
    revenue: {
      low: revLow,
      mid: revMid,
      high: revHigh,
      totalRevenue: targetSum,
      pricePerNight,
    },
    primarySeason,
    isCrossSeason,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SEASONS,
    SEASON_LABELS_DK,
    MONTH_TO_SEASON,
    parseToUTCDate,
    getSeasonByMonth,
    getSeasonForDate,
    getSeasonLabelDK,
    calculateNightsBySeason,
    allocateBookingBySeason,
  };
}

export {
  SEASONS,
  SEASON_LABELS_DK,
  MONTH_TO_SEASON,
  parseToUTCDate,
  getSeasonByMonth,
  getSeasonForDate,
  getSeasonLabelDK,
  calculateNightsBySeason,
  allocateBookingBySeason,
};

export default {
  SEASONS,
  SEASON_LABELS_DK,
  MONTH_TO_SEASON,
  parseToUTCDate,
  getSeasonByMonth,
  getSeasonForDate,
  getSeasonLabelDK,
  calculateNightsBySeason,
  allocateBookingBySeason,
};
