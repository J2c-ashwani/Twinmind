import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
    getGamificationStatus,
    purchaseStreakFreeze,
    getFreezeStatus
} from '../services/gamificationService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/gamification/status
 * Get overall gamification status
 */
router.get('/status', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const status = await getGamificationStatus(userId);
        res.json(status);
    } catch (error) {
        logger.error('Error fetching gamification status:', error);
        res.status(500).json({ error: 'Failed to fetch gamification status' });
    }
});

/**
 * GET /api/gamification/achievements
 * Get user achievements
 */
router.get('/achievements', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const status = await getGamificationStatus(userId);
        res.json(status.achievements);
    } catch (error) {
        logger.error('Error fetching achievements:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

/**
 * GET /api/gamification/streaks
 * Get user streaks
 */
router.get('/streaks', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const status = await getGamificationStatus(userId);
        res.json(status.streaks);
    } catch (error) {
        logger.error('Error fetching streaks:', error);
        res.status(500).json({ error: 'Failed to fetch streaks' });
    }
});

/**
 * GET /api/gamification/level
 * Get user level
 */
router.get('/level', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const status = await getGamificationStatus(userId);
        res.json(status.level);
    } catch (error) {
        logger.error('Error fetching level:', error);
        res.status(500).json({ error: 'Failed to fetch level' });
    }
});

/**
 * GET /api/gamification/freeze/status
 * Get streak freeze token status
 */
router.get('/freeze/status', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const status = await getFreezeStatus(userId);
        res.json(status);
    } catch (error) {
        logger.error('Error getting freeze status:', error);
        res.status(500).json({ error: 'Failed to get freeze status' });
    }
});

/**
 * POST /api/gamification/freeze/purchase
 * Purchase streak freeze with XP or premium
 */
router.post('/freeze/purchase', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { purchaseType } = req.body; // 'xp' or 'premium'

        const result = await purchaseStreakFreeze(userId, purchaseType || 'xp');
        res.json(result);
    } catch (error) {
        logger.error('Error purchasing freeze:', error);
        res.status(400).json({ error: error.message || 'Failed to purchase freeze' });
    }
});

export default router;
