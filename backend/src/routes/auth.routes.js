import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';
import { recordReferral } from '../services/referralService.js';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { deleteSelectedUserData, deleteUserAccount } from '../services/accountDeletionService.js';
import { validateUuidParam, sanitizeString } from '../middleware/validationMiddleware.js';
import { pickAllowlistedFields } from '../utils/security.js';

const router = express.Router();
const ALLOWED_PROFILE_UPDATE_FIELDS = ['full_name', 'country', 'avatar_url'];

/**
 * POST /api/auth/signup
 * Create a new user account (Supabase handles this via client SDK)
 * This endpoint is primarily for additional setup after Supabase signup
 */
router.post('/signup', async (req, res) => {
    try {
        const { userId, fullName, email, country, referralCode, attribution } = req.body;
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
                full_name: fullName || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
                email: email || user.email,
                country: country || null
            }, { onConflict: 'id' })
            .select()
            .single();

        if (error) throw error;

        // Create default free subscription if missing (do not overwrite an existing Pro row)
        const { error: subscriptionError } = await supabaseAdmin
            .from('subscriptions')
            .upsert({
                user_id: userId,
                plan_type: 'free',
                status: 'active'
            }, { onConflict: 'user_id', ignoreDuplicates: true });

        if (subscriptionError) throw subscriptionError;

        const effectiveReferralCode = referralCode || user.user_metadata?.referral_code;
        if (effectiveReferralCode) {
            await recordReferral({ code: effectiveReferralCode, referredUserId: userId });
        }

        const effectiveAttribution = attribution || user.user_metadata?.attribution;
        if (effectiveAttribution && typeof effectiveAttribution === 'object') {
            const { data: existingAttr } = await supabaseAdmin
                .from('metric_events')
                .select('id')
                .eq('user_id', userId)
                .eq('event_type', 'signup_attributed')
                .limit(1)
                .maybeSingle();

            if (!existingAttr) {
                await supabaseAdmin.from('metric_events').insert({
                    user_id: userId,
                    event_type: 'signup_attributed',
                    metric_type: 'acquisition',
                    metadata: effectiveAttribution,
                });
            }
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
router.get('/profile/:userId', authenticateUser, validateUuidParam('userId'), async (req, res) => {
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
 * Update user profile with explicit field allowlist
 */
router.put('/profile/:userId', authenticateUser, validateUuidParam('userId'), async (req, res) => {
    try {
        const { userId } = req.params;

        if (req.userId !== userId) {
            return res.status(403).json({ error: 'Cannot update another user profile' });
        }

        const { updates: rawUpdates, rejectedKeys } = pickAllowlistedFields(req.body, ALLOWED_PROFILE_UPDATE_FIELDS);
        if (rejectedKeys.length > 0) {
            return res.status(400).json({
                error: `Disallowed profile fields: ${rejectedKeys.join(', ')}`
            });
        }

        const updates = {};
        if ('full_name' in rawUpdates) {
            if (typeof rawUpdates.full_name !== 'string') {
                return res.status(400).json({ error: 'full_name must be a string' });
            }
            const cleanName = sanitizeString(rawUpdates.full_name).trim();
            if (!cleanName || cleanName.length > 120) {
                return res.status(400).json({ error: 'full_name must be between 1 and 120 characters' });
            }
            updates.full_name = cleanName;
        }

        if ('country' in rawUpdates) {
            if (rawUpdates.country === null || rawUpdates.country === '') {
                updates.country = null;
            } else if (typeof rawUpdates.country === 'string') {
                const cleanCountry = sanitizeString(rawUpdates.country).trim();
                if (cleanCountry.length > 100) {
                    return res.status(400).json({ error: 'country must be 100 characters or fewer' });
                }
                updates.country = cleanCountry;
            } else {
                return res.status(400).json({ error: 'country must be a string or null' });
            }
        }

        if ('avatar_url' in rawUpdates) {
            if (rawUpdates.avatar_url === null || rawUpdates.avatar_url === '') {
                updates.avatar_url = null;
            } else if (typeof rawUpdates.avatar_url === 'string') {
                const trimmedUrl = rawUpdates.avatar_url.trim();
                let parsedUrl;
                try {
                    parsedUrl = new URL(trimmedUrl);
                } catch {
                    return res.status(400).json({ error: 'avatar_url must be a valid URL' });
                }
                if (parsedUrl.protocol !== 'https:' || trimmedUrl.length > 1000) {
                    return res.status(400).json({ error: 'avatar_url must be a valid https:// URL' });
                }
                updates.avatar_url = trimmedUrl;
            } else {
                return res.status(400).json({ error: 'avatar_url must be a string or null' });
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid editable profile fields provided' });
        }

        updates.updated_at = new Date().toISOString();

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

/**
 * DELETE /api/auth/data
 * Delete selected user data categories without deleting the user account
 */
router.delete('/data', authenticateUser, async (req, res) => {
    try {
        const categories = req.body?.categories;
        const result = await deleteSelectedUserData({
            userId: req.userId,
            categories,
        });
        res.json(result);
    } catch (error) {
        if (error.code === 'INVALID_DATA_CATEGORIES') {
            return res.status(400).json({ error: error.message });
        }
        logger.error('Error deleting selected user data:', error);
        res.status(500).json({ error: 'Failed to delete selected user data' });
    }
});

/**
 * DELETE /api/auth/account
 * Permanently delete the authenticated user's account and associated data
 */
router.delete('/account', authenticateUser, async (req, res) => {
    try {
        const result = await deleteUserAccount({
            userId: req.userId,
        });
        res.json(result);
    } catch (error) {
        logger.error('Error deleting user account:', error);
        res.status(500).json({ error: 'Failed to delete user account' });
    }
});

export default router;
