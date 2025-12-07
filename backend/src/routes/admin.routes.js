import express from 'express';
import { supabase } from '../config/supabase.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = async (req, res, next) => {
    try {
        const { data: profile } = await supabase
            .from('personality_profiles')
            .select('*')
            .eq('user_id', req.user.userId)
            .single();

        // Check against environment variable and metadata
        const adminEmail = process.env.ADMIN_EMAIL;
        const isUserAdmin = (adminEmail && req.user.email === adminEmail) ||
            profile?.metadata?.role === 'admin';

        if (!isUserAdmin) {
            console.warn(`Admin access denied for: ${req.user.email}`);
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }

        next();
    } catch (error) {
        res.status(500).json({ error: 'Admin verification failed' });
    }
};

// Get platform statistics
router.get('/stats', verifyToken, isAdmin, async (req, res) => {
    try {
        // Get total users
        const { count: userCount } = await supabase
            .from('personality_profiles')
            .select('*', { count: 'exact', head: true });

        // Get active users (last 24h)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: activeCount } = await supabase
            .from('personality_profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', yesterday);

        // Get total messages
        const { count: messageCount } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true });

        // Get total conversations
        const { count: conversationCount } = await supabase
            .from('conversations')
            .select('*', { count: 'exact', head: true });

        res.json({
            totalUsers: userCount || 0,
            activeUsers: activeCount || 0,
            totalMessages: messageCount || 0,
            totalConversations: conversationCount || 0
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Get recent users
router.get('/users/recent', verifyToken, isAdmin, async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('personality_profiles')
            .select('user_id, created_at, updated_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        res.json({ users });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Get system health
router.get('/health', verifyToken, isAdmin, async (req, res) => {
    try {
        // Check database connection
        const { error: dbError } = await supabase.from('personality_profiles').select('count').limit(1);

        res.json({
            status: 'healthy',
            database: dbError ? 'error' : 'connected',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(500).json({ error: 'System health check failed' });
    }
});

export default router;
