import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { recordReferral } from '../services/referralService.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Create a new user account (Supabase handles this via client SDK)
 * This endpoint is primarily for additional setup after Supabase signup
 */
router.post('/signup', async (req, res) => {
    try {
        const { userId, fullName, email, country, referralCode } = req.body;
        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Authentication required to complete signup' });
        }

        const token = authHeader.split(' ')[1];
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user || user.id !== userId) {
            return res.status(401).json({ error: 'Invalid signup session' });
        }

        // Create user profile in our users table
        const { data, error } = await supabaseAdmin
            .from('users')
            .upsert({
                id: userId,
                full_name: fullName,
                email: email || user.email,
                country: country || null
            }, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw error;

        // Create default free subscription
        const { error: subscriptionError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id: userId,
                plan_type: 'free',
                status: 'active'
            }, { onConflict: 'user_id' });

        if (subscriptionError) throw subscriptionError;

        if (referralCode) {
            await recordReferral({ code: referralCode, referredUserId: userId });
        }

        res.json({ success: true, user: data });

    } catch (error) {
        logger.error('Error in signup:', error);
        res.status(500).json({ error: 'Failed to complete signup' });
    }
});

/**
 * GET /api/auth/profile
 * Get user profile (requires authentication via Supabase RLS)
 */
router.get('/profile/:userId', authenticateUser, async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.userId !== userId) {
            return res.status(403).json({ error: 'Cannot view another user profile' });
        }

        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw error;

        res.json({ user: data });

    } catch (error) {
        logger.error('Error fetching profile:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

/**
 * PUT /api/auth/profile/:userId
 * Update user profile
 */
router.put('/profile/:userId', authenticateUser, async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        if (req.userId !== userId) {
            return res.status(403).json({ error: 'Cannot update another user profile' });
        }

        const { data, error } = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;

        res.json({ user: data });

    } catch (error) {
        logger.error('Error updating profile:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

export default router;
