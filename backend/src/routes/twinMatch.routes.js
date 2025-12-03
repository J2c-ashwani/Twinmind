import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
    comparePersonalities,
    getComparison,
    findUserForMatch
} from '../services/twinMatchService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/twin-match/compare
 * Compare personalities with another user
 */
router.post('/compare', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { identifier } = req.body; // Email or referral code

        // Find the other user
        const otherUser = await findUserForMatch(identifier);

        if (!otherUser) {
            return res.status(404).json({ error: 'User not found or does not have a personality profile' });
        }

        if (otherUser.user_id === userId) {
            return res.status(400).json({ error: 'Cannot compare with yourself' });
        }

        // Compare personalities
        const comparison = await comparePersonalities(userId, otherUser.user_id);

        res.json(comparison);
    } catch (error) {
        logger.error('Error creating comparison:', error);
        res.status(500).json({ error: error.message || 'Failed to create comparison' });
    }
});

/**
 * GET /api/twin-match/:id
 * Get comparison by ID
 */
router.get('/:id', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const comparison = await getComparison(id);

        res.json(comparison);
    } catch (error) {
        logger.error('Error getting comparison:', error);
        res.status(500).json({ error: 'Failed to get comparison' });
    }
});

/**
 * POST /api/twin-match/find
 * Find user by email or code (preview before comparing)
 */
router.post('/find', authenticateUser, async (req, res) => {
    try {
        const { identifier } = req.body;
        const user = await findUserForMatch(identifier);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        logger.error('Error finding user:', error);
        res.status(500).json({ error: 'Failed to find user' });
    }
});

export default router;
