import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
    getWeeklyCard,
    getCardHistory,
    generateMotivationCard,
    markCardShared
} from '../services/motivationCardService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/motivation-cards/weekly
 * Get current week's motivation card
 */
router.get('/weekly', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const card = await getWeeklyCard(userId);

        if (!card) {
            return res.json({ card: null, message: 'No card available yet. Keep chatting!' });
        }

        res.json({ card });
    } catch (error) {
        logger.error('Error getting weekly card:', error);
        res.status(500).json({ error: 'Failed to get card' });
    }
});

/**
 * GET /api/motivation-cards/history
 * Get past motivation cards
 */
router.get('/history', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { limit } = req.query;

        const cards = await getCardHistory(userId, limit ? parseInt(limit) : 10);
        res.json({ cards });
    } catch (error) {
        logger.error('Error getting card history:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

/**
 * POST /api/motivation-cards/generate
 * Manually generate card for current week
 */
router.post('/generate', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const card = await generateMotivationCard(userId);

        if (!card) {
            return res.status(400).json({ error: 'Not enough conversation data to generate card' });
        }

        res.json({ card });
    } catch (error) {
        logger.error('Error generating card:', error);
        res.status(500).json({ error: error.message || 'Failed to generate card' });
    }
});

/**
 * POST /api/motivation-cards/:id/share
 * Mark card as shared
 */
router.post('/:id/share', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { platform } = req.body;

        await markCardShared(id, platform);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error marking card shared:', error);
        res.status(500).json({ error: 'Failed to mark as shared' });
    }
});

export default router;
