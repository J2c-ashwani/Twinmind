import express from 'express';
import { authenticateUser } from '../middleware/authMiddleware.js';
import {
    getAllAnalytics,
    getUserMetrics,
    getRevenueMetrics,
    getFeatureUsageStats,
    getSystemHealth
} from '../services/adminAnalyticsService.js';
import logger from '../config/logger.js';

const router = express.Router();

// Admin authentication middleware
const authenticateAdmin = async (req, res, next) => {
    try {
        // First check if user is authenticated
        await authenticateUser(req, res, () => { });

        // Then check if user is admin (you should set this in env)
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@twinmind.app';

        // Get user email from Supabase
        const { supabase } = req;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user || user.email !== adminEmail) {
            return res.status(403).json({ error: 'Admin access only' });
        }

        next();
    } catch (error) {
        logger.error('Admin auth error:', error);
        res.status(401).json({ error: 'Unauthorized' });
    }
};

/**
 * GET /api/admin/analytics
 * Get all analytics data
 */
router.get('/analytics', authenticateAdmin, async (req, res) => {
    try {
        const analytics = await getAllAnalytics();
        res.json(analytics);
    } catch (error) {
        logger.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
});

/**
 * GET /api/admin/analytics/users
 * Get user metrics
 */
router.get('/analytics/users', authenticateAdmin, async (req, res) => {
    try {
        const users = await getUserMetrics();
        res.json(users);
    } catch (error) {
        logger.error('Error getting user metrics:', error);
        res.status(500).json({ error: 'Failed to get user metrics' });
    }
});

/**
 * GET /api/admin/analytics/revenue
 * Get revenue metrics
 */
router.get('/analytics/revenue', authenticateAdmin, async (req, res) => {
    try {
        const revenue = await getRevenueMetrics();
        res.json(revenue);
    } catch (error) {
        logger.error('Error getting revenue metrics:', error);
        res.status(500).json({ error: 'Failed to get revenue metrics' });
    }
});

/**
 * GET /api/admin/analytics/features
 * Get feature usage stats
 */
router.get('/analytics/features', authenticateAdmin, async (req, res) => {
    try {
        const features = await getFeatureUsageStats();
        res.json(features);
    } catch (error) {
        logger.error('Error getting feature stats:', error);
        res.status(500).json({ error: 'Failed to get feature stats' });
    }
});

/**
 * GET /api/admin/analytics/system
 * Get system health
 */
router.get('/analytics/system', authenticateAdmin, async (req, res) => {
    try {
        const system = await getSystemHealth();
        res.json(system);
    } catch (error) {
        logger.error('Error getting system health:', error);
        res.status(500).json({ error: 'Failed to get system health' });
    }
});

export default router;
