import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/referral/code
 * Get user's referral code
 */
router.get('/code', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        // Mock referral code logic
        const code = `TWIN-${userId.substring(0, 5).toUpperCase()}`;

        res.json({
            code,
            url: `${process.env.WEB_APP_URL}/signup?ref=${code}`
        });

    } catch (error) {
        logger.error('Error fetching referral code:', error);
        res.status(500).json({ error: 'Failed to fetch referral code' });
    }
});

/**
 * GET /api/referral/stats
 * Get referral statistics
 */
router.get('/stats', authenticateUser, async (req, res) => {
    try {
        // Mock stats
        res.json({
            total_referrals: 0,
            pending_rewards: 0,
            total_earned: 0
        });

    } catch (error) {
        logger.error('Error fetching referral stats:', error);
        res.status(500).json({ error: 'Failed to fetch referral stats' });
    }
});

export default router;
