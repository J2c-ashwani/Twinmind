import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { logger } from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';

import insightsService from '../services/insightsService.js';
import { getEvolutionTimeline } from '../services/relationshipEvolutionService.js';

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
 * GET /api/insights/monthly
 * Get last 30 days of daily insight data.
 */
router.get('/monthly', authenticateUser, async (req, res) => {
    try {
        const start = new Date();
        start.setDate(start.getDate() - 30);

        const { data, error } = await supabaseAdmin
            .from('daily_insights')
            .select('*')
            .eq('user_id', req.userId)
            .gte('date', start.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (error) throw error;

        res.json({
            days: data || [],
            count: data?.length || 0,
        });
    } catch (error) {
        logger.error('Error fetching monthly insights:', error);
        res.status(500).json({ error: 'Failed to fetch monthly insights' });
    }
});

/**
 * GET /api/insights/evolution
 * Get relationship growth metrics for charts.
 */
router.get('/evolution', authenticateUser, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const timeline = await getEvolutionTimeline(req.userId, days);
        res.json({ timeline, days });
    } catch (error) {
        logger.error('Error fetching evolution insights:', error);
        res.status(500).json({ error: 'Failed to fetch evolution insights' });
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
