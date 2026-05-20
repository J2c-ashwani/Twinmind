import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
    getPendingProactiveMessages,
    markMessageSent,
} from '../services/proactiveMessageService.js';

const router = express.Router();

router.get('/messages', authenticateUser, async (req, res) => {
    try {
        const messages = await getPendingProactiveMessages(req.userId);
        res.json({ messages });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch proactive messages' });
    }
});

router.post('/messages/:id/read', authenticateUser, async (req, res) => {
    try {
        await markMessageSent(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update proactive message' });
    }
});

export default router;
