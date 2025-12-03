import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { getMemoryCount } from '../services/memoryEngine.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/memory/count
 * Get memory count for user
 */
router.get('/count', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const count = await getMemoryCount(userId);

        res.json({ count });

    } catch (error) {
        logger.error('Error fetching memory count:', error);
        res.status(500).json({ error: 'Failed to fetch memory count' });
    }
});

/**
 * GET /api/memory/memories
 * Get user memories
 */
router.get('/memories', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        // Mock data for now until memory engine is fully implemented
        const memories = [
            { id: '1', title: 'First Chat', content: 'We talked about your goals.', date: new Date().toISOString(), isFavorite: true },
            { id: '2', title: 'Breakthrough', content: 'You realized something important about work.', date: new Date(Date.now() - 86400000).toISOString(), isFavorite: false }
        ];
        res.json(memories);
    } catch (error) {
        logger.error('Error fetching memories:', error);
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});

/**
 * POST /api/memory/:id/favorite
 * Toggle favorite status
 */
router.post('/:id/favorite', authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        // Mock success
        res.json({ success: true, message: 'Favorite toggled' });
    } catch (error) {
        logger.error('Error toggling favorite:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

/**
 * GET /api/memory/timeline
 * Get timeline of memories
 */
router.get('/timeline', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const limit = parseInt(req.query.limit) || 50;

        // Mock timeline data until memory engine is fully implemented
        const timeline = [
            {
                id: '1',
                type: 'milestone',
                title: 'First Conversation',
                description: 'Started your journey with TwinMind',
                date: new Date(Date.now() - 7 * 86400000).toISOString(),
                significance: 5,
                isFavorite: true
            },
            {
                id: '2',
                type: 'insight',
                title: 'Career Breakthrough',
                description: 'Gained clarity on professional goals',
                date: new Date(Date.now() - 3 * 86400000).toISOString(),
                significance: 4,
                isFavorite: false
            },
            {
                id: '3',
                type: 'reflection',
                title: 'Self-Discovery',
                description: 'Learned something new about yourself',
                date: new Date(Date.now() - 1 * 86400000).toISOString(),
                significance: 3,
                isFavorite: false
            }
        ];

        res.json({ memories: timeline.slice(0, limit) });
    } catch (error) {
        logger.error('Error fetching memory timeline:', error);
        res.status(500).json({ error: 'Failed to fetch memory timeline' });
    }
});

export default router;
