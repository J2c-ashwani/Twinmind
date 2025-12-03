import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { getYearInPixels, generateInsights } from '../services/growthStoryService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/growth-story/calendar/:year
 * Get year in pixels mood calendar
 */
router.get('/calendar/:year?', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const year = req.params.year ? parseInt(req.params.year) : new Date().getFullYear();

        const calendar = await getYearInPixels(userId, year);
        res.json(calendar);
    } catch (error) {
        logger.error('Error getting calendar:', error);
        res.status(500).json({ error: 'Failed to get calendar' });
    }
});

/**
 * GET /api/growth-story/insights/:period
 * Get AI insights for period (year, month, 90days)
 */
router.get('/insights/:period?', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const period = req.params.period || 'year';

        const insights = await generateInsights(userId, period);

        if (!insights) {
            return res.json({ insights: null, message: 'Not enough data yet. Keep tracking!' });
        }

        res.json(insights);
    } catch (error) {
        logger.error('Error generating insights:', error);
        res.status(500).json({ error: 'Failed to generate insights' });
    }
});

export default router;
