import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { logger } from '../config/logger.js';
import {
    getOrCreateReferralCode,
    getReferralStats,
    recordReferral,
} from '../services/referralService.js';

const router = express.Router();

/**
 * GET /api/referral/code
 * Get user's referral code
 */
router.get('/code', authenticateUser, async (req, res) => {
    try {
        const referral = await getOrCreateReferralCode(req.userId);
        res.json(referral);

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
        const stats = await getReferralStats(req.userId);
        res.json(stats);

    } catch (error) {
        logger.error('Error fetching referral stats:', error);
        res.status(500).json({ error: 'Failed to fetch referral stats' });
    }
});

/**
 * POST /api/referral/submit
 * Attribute the current user to a referral code
 */
router.post('/submit', authenticateUser, async (req, res) => {
    try {
        const { code } = req.body || {};
        if (!code) {
            return res.status(400).json({ error: 'Referral code is required' });
        }

        const referral = await recordReferral({
            code,
            referredUserId: req.userId,
        });

        res.json({ success: true, referral });
    } catch (error) {
        logger.error('Error submitting referral:', error);
        res.status(500).json({ error: 'Failed to submit referral' });
    }
});

export default router;
