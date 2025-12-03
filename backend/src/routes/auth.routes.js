import express from 'express';
import { supabase } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = express.Router();

/**
 * POST /api/auth/signup
 * Create a new user account (Supabase handles this via client SDK)
 * This endpoint is primarily for additional setup after Supabase signup
 */
router.post('/signup', async (req, res) => {
    try {
        const { userId, fullName, email, country } = req.body;

        // Create user profile in our users table
        const { data, error } = await supabase
            .from('users')
            .insert({
                id: userId,
                full_name: fullName,
                email: email,
                country: country || null
            })
            .select()
            .single();

        if (error) throw error;

        // Create default free subscription
        await supabase
            .from('subscriptions')
            .insert({
                user_id: userId,
                plan_type: 'free',
                status: 'active'
            });

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
router.get('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabase
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
router.put('/profile/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
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
