import express from 'express';
import analyticsService from '../services/analyticsService.js';
import analyticsRepository from '../repositories/analyticsRepository.js';

const router = express.Router();

/**
 * @route   GET /api/analytics/summary
 * @desc    Henter samlet økonomisk overblik (total, værelser, bar, procentdel og belægning)
 * @access  Public / Hotel Administrator
 */
router.get('/summary', async (req, res) => {
  try {
    const summary = await analyticsService.getSummary();
    return res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Fejl ved hentning af analytics summary:', error);
    return res.status(500).json({
      success: false,
      error: 'Kunne ikke hente analytics summary.',
      details: error.message,
    });
  }
});

/**
 * @route   GET /api/analytics/occupancy
 * @desc    Henter belægningsgrad (for specifik periode via ?startDate=&endDate= eller månedlig oversigt)
 * @access  Public / Hotel Administrator
 */
router.get('/occupancy', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Hvis der er angivet start- og slutdato, beregnes belægning for den konkrete periode
    if (startDate || endDate) {
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Både startDate og endDate skal angives (format: YYYY-MM-DD).',
        });
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
        return res.status(400).json({
          success: false,
          error: 'Ugyldigt datoformat. Brug YYYY-MM-DD.',
        });
      }

      if (new Date(endDate) <= new Date(startDate)) {
        return res.status(400).json({
          success: false,
          error: 'endDate skal være efter startDate.',
        });
      }

      const periodOccupancy = await analyticsRepository.getOccupancyRateByPeriod(startDate, endDate);
      return res.status(200).json({
        success: true,
        data: {
          period: { startDate, endDate },
          occupancy: periodOccupancy,
        },
      });
    }

    // Hvis ingen query-parametre er givet, returneres månedlig belægningsoversigt
    const monthlyOccupancy = await analyticsService.getMonthlyOccupancy();
    return res.status(200).json({
      success: true,
      data: monthlyOccupancy,
    });
  } catch (error) {
    console.error('Fejl ved hentning af belægningsgrad:', error);
    return res.status(500).json({
      success: false,
      error: 'Kunne ikke beregne belægningsgrad.',
      details: error.message,
    });
  }
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = router;
}

export default router;
