import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { logger } from '../config/logger.js';

import insightsService from '../services/insightsService.js';

const router = express.Router();

/**
 * GET /api/insights/weekly
 * Get weekly insights
 */
router.get('/weekly', authenticateUser, async (req, res) => {
    try {
        const insights = await insightsService.getWeeklyInsights(req.user.userId);
        res.json(insights);
    } catch (error) {
        logger.error('Error fetching weekly insights:', error);
        res.status(500).json({ error: 'Failed to fetch weekly insights' });
    }
});

/**
 * POST /api/insights/generate
 * Manually trigger insight generation (for testing)
 */
router.post('/generate', authenticateUser, async (req, res) => {
    try {
        const insight = await insightsService.generateDailyInsight(req.user.userId);
        res.json(insight || { message: 'Not enough activity to generate insight' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate insight' });
    }
});

export default router;
