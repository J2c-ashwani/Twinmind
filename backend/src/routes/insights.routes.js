import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/insights/weekly
 * Get weekly insights
 */
router.get('/weekly', authenticateUser, async (req, res) => {
    try {
        // Mock data for now
        res.json({
            summary: "You've been very consistent this week!",
            mood_trend: "upward",
            top_emotions: ["happy", "motivated"],
            topics: ["work", "personal growth"]
        });
    } catch (error) {
        logger.error('Error fetching weekly insights:', error);
        res.status(500).json({ error: 'Failed to fetch weekly insights' });
    }
});

/**
 * GET /api/insights/monthly
 * Get monthly insights
 */
router.get('/monthly', authenticateUser, async (req, res) => {
    try {
        // Mock data for now
        res.json({
            summary: "Great progress this month.",
            mood_trend: "stable",
            top_emotions: ["content", "focused"],
            topics: ["relationships", "career"]
        });
    } catch (error) {
        logger.error('Error fetching monthly insights:', error);
        res.status(500).json({ error: 'Failed to fetch monthly insights' });
    }
});

/**
 * GET /api/insights/evolution
 * Get evolution timeline
 */
router.get('/evolution', authenticateUser, async (req, res) => {
    try {
        // Mock data for now
        res.json({
            timeline: [
                { date: "2023-10-01", event: "Started journey" },
                { date: "2023-10-15", event: "First breakthrough" }
            ]
        });
    } catch (error) {
        logger.error('Error fetching evolution timeline:', error);
        res.status(500).json({ error: 'Failed to fetch evolution timeline' });
    }
});

export default router;
