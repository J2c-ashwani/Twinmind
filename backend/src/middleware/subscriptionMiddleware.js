import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

/**
 * Subscription middleware to check user's plan and enforce limits
 */

export async function checkSubscription(req, res, next) {
    try {
        const userId = req.userId;

        // Get user's subscription
        const { data: subscription, error } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        // Attach subscription to request
        req.subscription = subscription || { plan_type: 'free', status: 'active' };
        req.isPro = subscription?.plan_type === 'pro';

        next();

    } catch (error) {
        logger.error('Subscription check error:', error);
        res.status(500).json({ error: 'Failed to check subscription' });
    }
}

/**
 * Require pro subscription
 */
export async function requirePro(req, res, next) {
    if (!req.isPro) {
        return res.status(403).json({
            error: 'This feature requires a Pro subscription',
            upgrade: true
        });
    }
    next();
}

/**
 * Check usage limits for free tier
 */
export async function checkUsageLimits(req, res, next) {
    try {
        const userId = req.userId;

        // Pro users have no limits
        if (req.isPro) {
            return next();
        }

        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        // Check message count for today
        const { count, error } = await supabaseAdmin
            .from('chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('sender', 'user')
            .gte('created_at', dayStart.toISOString())
            .lte('created_at', dayEnd.toISOString());

        if (error) throw error;

        const messageLimit = parseInt(process.env.FREE_TIER_DAILY_MESSAGES) || 10;

        if (count >= messageLimit) {
            return res.status(429).json({
                error: `Free tier limit reached (${messageLimit} messages/day)`,
                current: count,
                limit: messageLimit,
                upgrade: true,
                resetTime: dayEnd.toISOString()
            });
        }

        // Attach usage info to request
        req.usage = {
            messages: count,
            limit: messageLimit,
            remaining: messageLimit - count
        };

        next();

    } catch (error) {
        logger.error('Usage check error:', error);
        res.status(500).json({ error: 'Failed to check usage limits' });
    }
}

/**
 * Track usage for a user — writes to usage_tracking table
 * Designed as a time-bucketed counter: one row per (user, action_type, day)
 * Used for: analytics dashboard, per-user behaviour metrics, admin reporting
 */
export async function trackUsage(userId, actionType = 'chat_message') {
    try {
        const now = new Date();
        // Day bucket: period covers the full calendar day (UTC)
        const periodStart = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0
        ));
        const periodEnd = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59
        ));

        // Upsert: find existing row for today and increment, or create a new one
        const { data: existing } = await supabaseAdmin
            .from('usage_tracking')
            .select('id, count')
            .eq('user_id', userId)
            .eq('action_type', actionType)
            .eq('period_start', periodStart.toISOString())
            .maybeSingle();

        if (existing) {
            await supabaseAdmin
                .from('usage_tracking')
                .update({ count: existing.count + 1 })
                .eq('id', existing.id);
        } else {
            await supabaseAdmin
                .from('usage_tracking')
                .insert({
                    user_id: userId,
                    action_type: actionType,
                    count: 1,
                    period_start: periodStart.toISOString(),
                    period_end: periodEnd.toISOString(),
                });
        }

        return true;
    } catch (error) {
        // Non-critical — log and continue
        logger.error('Error tracking usage:', error.message);
        return false;
    }
}


/**
 * Get monthly usage stats
 */
export async function getMonthlyUsage(userId) {
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        const { count, error } = await supabaseAdmin
            .from('chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('sender', 'user')
            .gte('created_at', monthStart.toISOString())
            .lte('created_at', monthEnd.toISOString());

        if (error) throw error;

        const limit = parseInt(process.env.FREE_TIER_MONTHLY_MESSAGES) || 50;

        return {
            messages_used: count,
            limit: limit,
            remaining: Math.max(0, limit - count),
            reset_date: monthEnd.toISOString()
        };

    } catch (error) {
        logger.error('Error getting monthly usage:', error);
        return { messages_used: 0, limit: 50, remaining: 50 };
    }
}

export default {
    checkSubscription,
    requirePro,
    checkUsageLimits,
    trackUsage,
    getMonthlyUsage
};
