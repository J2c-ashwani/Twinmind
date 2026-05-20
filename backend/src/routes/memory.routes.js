import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { getMemoryCount } from '../services/memoryEngine.js';
import {
    createMemory,
    getMemoryTimeline,
    toggleMemoryFavorite,
} from '../services/memoryJournalService.js';
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
 * GET /api/memory
 * Get user memories with optional filters
 */
router.get('/', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const memories = await getMemoryTimeline(userId, {
            type: req.query.type,
            limit: parseInt(req.query.limit) || 50,
        });
        res.json(memories);
    } catch (error) {
        logger.error('Error fetching memories:', error);
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});

/**
 * GET /api/memory/memories
 * Backwards-compatible list endpoint used by Android
 */
router.get('/memories', authenticateUser, async (req, res) => {
    try {
        const memories = await getMemoryTimeline(req.userId, {
            limit: parseInt(req.query.limit) || 50,
        });
        res.json(memories);
    } catch (error) {
        logger.error('Error fetching memories:', error);
        res.status(500).json({ error: 'Failed to fetch memories' });
    }
});

/**
 * POST /api/memory
 * Create a memory manually
 */
router.post('/', authenticateUser, async (req, res) => {
    try {
        const { type, title, description, significance, tags, conversationId, messageId } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'title and description are required' });
        }

        const memory = await createMemory(req.userId, {
            type: type || 'conversation',
            title,
            description,
            significance: Number(significance) || 5,
            tags: Array.isArray(tags) ? tags : [],
            conversationId,
            messageId,
        });

        res.status(201).json({ memory });
    } catch (error) {
        logger.error('Error creating memory:', error);
        res.status(500).json({ error: 'Failed to create memory' });
    }
});

/**
 * POST /api/memory/:id/favorite
 * Toggle favorite status
 */
router.post('/:id/favorite', authenticateUser, async (req, res) => {
    try {
        const memory = await toggleMemoryFavorite(req.userId, req.params.id);
        res.json({ success: true, memory });
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
        const limit = parseInt(req.query.limit) || 50;
        const timeline = await getMemoryTimeline(req.userId, {
            type: req.query.type,
            limit,
        });
        res.json({ memories: timeline });
    } catch (error) {
        logger.error('Error fetching memory timeline:', error);
        res.status(500).json({ error: 'Failed to fetch memory timeline' });
    }
});

export default router;
