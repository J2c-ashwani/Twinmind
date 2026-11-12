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
        const updated = await reminderService.markAsRead(req.params.id, req.user.userId);
        if (!updated) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Delete notification
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const deleted = await reminderService.deleteNotification(req.params.id, req.user.userId);
        if (!deleted) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete notification' });
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

// Deregister device token on sign-out
router.delete('/device-token', verifyToken, async (req, res) => {
    try {
        const token = req.body?.token || req.query?.token || null;
        await reminderService.deregisterDeviceToken(req.user.userId, token);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to deregister device token:', error);
        res.status(500).json({ error: 'Failed to deregister device token' });
    }
});

router.post('/subscribe', verifyToken, async (req, res) => {
    try {
        const subscription = req.body;
        if (!subscription?.endpoint) {
            return res.status(400).json({ error: 'Valid web push subscription is required' });
        }
        await reminderService.updateWebPushSubscription(req.user.userId, subscription);
        res.json({ success: true });
    } catch (error) {
        console.error('Failed to update web push subscription:', error);
        res.status(500).json({ error: 'Failed to update web push subscription' });
    }
});

export default router;
