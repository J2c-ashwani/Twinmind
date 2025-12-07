import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import reminderService from '../services/reminderService.js';

const router = express.Router();

// Get notifications
router.get('/', verifyToken, async (req, res) => {
    try {
        const notifications = await reminderService.getUserNotifications(req.user.userId);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark as read
router.post('/:id/read', verifyToken, async (req, res) => {
    try {
        await reminderService.markAsRead(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Update device token
router.post('/device-token', verifyToken, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ error: 'Token is required' });
        }
        await reminderService.updateDeviceToken(req.user.userId, token);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update device token:', error);
        res.status(500).json({ error: 'Failed to update device token' });
    }
});

export default router;
