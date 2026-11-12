import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const quotaLocks = new Map();

function getUtcDayBounds(now = new Date()) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
    return { start, end };
}

function withUserQuotaLock(lockKey, task) {
    const prev = quotaLocks.get(lockKey) || Promise.resolve();
    const next = prev.then(task, task);
    const settled = next.finally(() => {
        if (quotaLocks.get(lockKey) === settled) {
            quotaLocks.delete(lockKey);
        }
    });
    quotaLocks.set(lockKey, settled);
    return next;
}

/**
 * Canonical entitlement evaluator.
 * Checks plan_type, status, AND current_period_end expiry so expired/revoked
 * subscriptions cannot keep Pro privileges even before reconciliation runs.
 */
export function isEffectivePro(subscription, now = new Date()) {
    if (!subscription || subscription.plan_type !== 'pro') {
        return false;
    }

    const status = String(subscription.status || '').toLowerCase();
    const hasValidExpiry = Boolean(subscription.current_period_end);
    const expiryDate = hasValidExpiry ? new Date(subscription.current_period_end) : null;
    const isExpired = Boolean(expiryDate && !Number.isNaN(expiryDate.getTime()) && expiryDate <= now);

    if (isExpired) {
        return false;
    }

    if (status === 'active' || status === 'trial') {
        return true;
    }

    if ((status === 'cancelled' || status === 'canceled') && expiryDate && expiryDate > now) {
        return true;
    }

    return false;
}

/**
 * Subscription middleware to check user's plan and enforce expiry
 */
export async function checkSubscription(req, res, next) {
    try {
        const userId = req.userId;

        const { data: subscription, error } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        const effectivePro = isEffectivePro(subscription);
        const rawExpired = Boolean(
            subscription?.plan_type === 'pro' &&
            subscription?.current_period_end &&
            new Date(subscription.current_period_end) <= new Date()
        );

        req.subscription = subscription
            ? {
                  ...subscription,
                  effective_status: rawExpired ? 'expired' : subscription.status,
              }
            : { plan_type: 'free', status: 'active', effective_status: 'active' };
        req.isPro = effectivePro;

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
            upgrade: true,
        });
    }
    next();
}

/**
 * Atomically check and reserve one daily quota unit from usage_tracking.
 * Independent of deletable chat_history rows and resilient to concurrent bursts.
 */
export async function reserveDailyQuota(userId, actionType, dailyLimit, now = new Date()) {
    const { start, end } = getUtcDayBounds(now);
    const lockKey = `${userId}:${actionType}:${start.toISOString()}`;

    return withUserQuotaLock(lockKey, async () => {
        // Attempt database-side atomic reservation RPC if deployed
        try {
            const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('reserve_daily_quota', {
                p_user_id: userId,
                p_action_type: actionType,
                p_daily_limit: dailyLimit,
                p_period_start: start.toISOString(),
                p_period_end: end.toISOString(),
            });

            if (!rpcError && rpcResult && typeof rpcResult.allowed === 'boolean') {
                return {
                    allowed: rpcResult.allowed,
                    current: rpcResult.current ?? 0,
                    limit: dailyLimit,
                    remaining: Math.max(0, dailyLimit - (rpcResult.current ?? 0)),
                    resetTime: end.toISOString(),
                };
            }
        } catch {
            // Fall through cleanly if RPC is not deployed yet
        }

        const { data: existing, error: fetchError } = await supabaseAdmin
            .from('usage_tracking')
            .select('id, count')
            .eq('user_id', userId)
            .eq('action_type', actionType)
            .eq('period_start', start.toISOString())
            .maybeSingle();

        if (fetchError) throw fetchError;

        const currentCount = existing?.count || 0;
        if (currentCount >= dailyLimit) {
            return {
                allowed: false,
                current: currentCount,
                limit: dailyLimit,
                remaining: 0,
                resetTime: end.toISOString(),
            };
        }

        const nextCount = currentCount + 1;
        if (existing) {
            const { error: updateErr } = await supabaseAdmin
                .from('usage_tracking')
                .update({ count: nextCount })
                .eq('id', existing.id)
                .eq('count', currentCount);

            if (updateErr) throw updateErr;
        } else {
            const { error: insertErr } = await supabaseAdmin
                .from('usage_tracking')
                .insert({
                    user_id: userId,
                    action_type: actionType,
                    count: 1,
                    period_start: start.toISOString(),
                    period_end: end.toISOString(),
                });

            if (insertErr) throw insertErr;
        }

        return {
            allowed: true,
            current: nextCount,
            limit: dailyLimit,
            remaining: Math.max(0, dailyLimit - nextCount),
            resetTime: end.toISOString(),
        };
    });
}

/**
 * Release a reserved quota unit if upstream processing failed before delivering output
 */
export async function releaseDailyQuota(userId, actionType, now = new Date()) {
    const { start } = getUtcDayBounds(now);
    const lockKey = `${userId}:${actionType}:${start.toISOString()}`;

    return withUserQuotaLock(lockKey, async () => {
        try {
            const { data: existing } = await supabaseAdmin
                .from('usage_tracking')
                .select('id, count')
                .eq('user_id', userId)
                .eq('action_type', actionType)
                .eq('period_start', start.toISOString())
                .maybeSingle();

            if (existing && existing.count > 0) {
                await supabaseAdmin
                    .from('usage_tracking')
                    .update({ count: existing.count - 1 })
                    .eq('id', existing.id);
            }
        } catch (err) {
            logger.warn(`Failed to release ${actionType} quota for ${userId}:`, err.message);
        }
    });
}

function createQuotaMiddleware(actionType, envLimitKey, defaultLimit, label) {
    return async function enforceQuota(req, res, next) {
        try {
            const userId = req.userId;

            if (req.isPro) {
                return next();
            }

            const limit = parseInt(process.env[envLimitKey], 10) || defaultLimit;
            const quota = await reserveDailyQuota(userId, actionType, limit);

            if (!quota.allowed) {
                return res.status(429).json({
                    error: `Free tier limit reached (${limit} ${label}/day)`,
                    current: quota.current,
                    limit: quota.limit,
                    upgrade: true,
                    resetTime: quota.resetTime,
                });
            }

            req.usage = {
                actionType,
                messages: quota.current,
                limit: quota.limit,
                remaining: quota.remaining,
                resetTime: quota.resetTime,
            };
            req.reservedQuota = { userId, actionType };

            next();
        } catch (error) {
            logger.error(`Usage check error (${actionType}):`, error);
            res.status(500).json({ error: 'Failed to check usage limits' });
        }
    };
}

/**
 * Free tier limit: 10 text messages/day across all 4 modes
 */
export const checkUsageLimits = createQuotaMiddleware(
    'chat_message',
    'FREE_TIER_DAILY_MESSAGES',
    10,
    'messages'
);

/**
 * Free tier limit: 3 voice messages/day across all 4 modes
 */
export const checkVoiceLimits = createQuotaMiddleware(
    'voice_message',
    'FREE_TIER_DAILY_VOICE_MESSAGES',
    3,
    'voice messages'
);

/**
 * Track usage for a user — writes to usage_tracking table
 */
export async function trackUsage(userId, actionType = 'chat_message') {
    try {
        const now = new Date();
        const { start: periodStart, end: periodEnd } = getUtcDayBounds(now);

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
        logger.error('Error tracking usage:', error.message);
        return false;
    }
}

/**
 * Get current daily usage stats (unified across text and voice)
 */
export async function getMonthlyUsage(userId) {
    try {
        const now = new Date();
        const { start: dayStart, end: dayEnd } = getUtcDayBounds(now);

        const { data: row, error } = await supabaseAdmin
            .from('usage_tracking')
            .select('count')
            .eq('user_id', userId)
            .eq('action_type', 'chat_message')
            .eq('period_start', dayStart.toISOString())
            .maybeSingle();

        if (error) throw error;

        const used = row?.count || 0;
        const limit = parseInt(process.env.FREE_TIER_DAILY_MESSAGES, 10) || 10;

        return {
            messages_used: used,
            limit,
            remaining: Math.max(0, limit - used),
            period: 'daily',
            reset_date: dayEnd.toISOString(),
        };
    } catch (error) {
        logger.error('Error getting usage:', error);
        return { messages_used: 0, limit: 10, remaining: 10, period: 'daily' };
    }
}

export default {
    isEffectivePro,
    checkSubscription,
    requirePro,
    reserveDailyQuota,
    releaseDailyQuota,
    checkUsageLimits,
    checkVoiceLimits,
    trackUsage,
    getMonthlyUsage,
};
