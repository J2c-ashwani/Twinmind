import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import { isEffectivePro } from '../middleware/subscriptionMiddleware.js';

/**
 * Admin Analytics Service
 * Provides analytics and metrics for admin dashboard
 */

/**
 * Get user metrics
 */
export async function getUserMetrics() {
    try {
        const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const sevenDaysIso = sevenDaysAgoDate.toISOString();
        const sevenDaysDate = sevenDaysIso.split('T')[0];

        const [
            { count: totalUsers, error: totalErr },
            { count: activeUsers, error: activeErr },
            { data: proRows, error: proErr },
            { count: newUsers, error: newErr },
        ] = await Promise.all([
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('user_engagement').select('*', { count: 'exact', head: true }).gte('last_active_date', sevenDaysDate),
            supabaseAdmin.from('subscriptions').select('plan_type, status, current_period_end').eq('plan_type', 'pro'),
            supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysIso),
        ]);

        if (totalErr) throw totalErr;
        if (activeErr) throw activeErr;
        if (proErr) throw proErr;
        if (newErr) throw newErr;

        const premiumUsers = (proRows || []).filter((s) => isEffectivePro(s)).length;
        const total = totalUsers || 0;
        const freeUsers = Math.max(0, total - premiumUsers);
        const conversionRate = total > 0 ? ((premiumUsers / total) * 100).toFixed(2) : 0;

        return {
            totalUsers: total,
            activeUsers: activeUsers || 0,
            premiumUsers,
            freeUsers,
            conversionRate: parseFloat(conversionRate),
            newUsers: newUsers || 0
        };
    } catch (error) {
        logger.error('Error getting user metrics:', error);
        throw error;
    }
}

/**
 * Get revenue metrics using live subscription state and configured base USD pricing
 */
export async function getRevenueMetrics() {
    try {
        const monthlyPriceUsd = Number(process.env.PRO_MONTHLY_PRICE_USD || 4.99);
        const yearlyMonthlyEquivUsd = Number(process.env.PRO_YEARLY_PRICE_USD || 49.99) / 12;

        const { data: subscriptions, error: subErr } = await supabaseAdmin
            .from('subscriptions')
            .select('plan_type, status, current_period_end, google_play_product_id, created_at')
            .eq('plan_type', 'pro');

        if (subErr) throw subErr;

        const activeSubs = (subscriptions || []).filter((s) => isEffectivePro(s));
        const mrr = activeSubs.reduce((sum, sub) => {
            const isYearly = String(sub.google_play_product_id || '').toLowerCase().includes('year');
            return sum + (isYearly ? yearlyMonthlyEquivUsd : monthlyPriceUsd);
        }, 0);

        const lastMonthStart = new Date();
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        lastMonthStart.setDate(1);
        const newSubsThisMonth = activeSubs.filter(
            (s) => s.created_at && new Date(s.created_at) >= lastMonthStart
        ).length;

        return {
            mrr: Number(mrr.toFixed(2)),
            activeSubscriptions: activeSubs.length,
            newSubscriptionsThisMonth: newSubsThisMonth,
            currency: 'USD',
            mrrBasis: 'estimated_from_plan_pricing',
        };
    } catch (error) {
        logger.error('Error getting revenue metrics:', error);
        throw error;
    }
}

/**
 * Get feature usage stats
 */
export async function getFeatureUsageStats() {
    try {
        const [
            { data: streakData, error: streakErr },
            { count: activeCircles, error: circleErr },
            { data: circleMembers, error: memberErr },
            { count: totalMatches, error: matchErr },
            { data: sharedMatchRows, error: shareErr },
            { count: totalCards, error: cardErr },
            { count: sharedCards, error: cardShareErr },
        ] = await Promise.all([
            supabaseAdmin.from('user_streaks').select('current_streak, freeze_tokens'),
            supabaseAdmin.from('growth_circles').select('*', { count: 'exact', head: true }).eq('is_active', true),
            supabaseAdmin.from('circle_members').select('circle_id'),
            supabaseAdmin.from('twin_matches').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('twin_match_shares').select('match_id'),
            supabaseAdmin.from('motivation_cards').select('*', { count: 'exact', head: true }),
            supabaseAdmin.from('motivation_cards').select('*', { count: 'exact', head: true }).eq('is_shared', true),
        ]);

        if (streakErr) throw streakErr;
        if (circleErr) throw circleErr;
        if (memberErr) throw memberErr;
        if (matchErr) throw matchErr;
        if (shareErr && shareErr.code !== '42P01' && shareErr.code !== 'PGRST205') throw shareErr;
        if (cardErr) throw cardErr;
        if (cardShareErr) throw cardShareErr;

        const avgStreak = streakData?.length > 0
            ? (streakData.reduce((sum, s) => sum + (s.current_streak || 0), 0) / streakData.length).toFixed(1)
            : 0;
        const totalFreezeTokens = streakData?.reduce((sum, s) => sum + (s.freeze_tokens || 0), 0) || 0;
        const avgMembersPerCircle = activeCircles > 0 ? (circleMembers?.length || 0) / activeCircles : 0;

        const sharedMatches = new Set((sharedMatchRows || []).map((r) => r.match_id)).size;
        const matchShareRate = totalMatches > 0 ? ((sharedMatches / totalMatches) * 100).toFixed(1) : 0;
        const cardShareRate = totalCards > 0 ? (((sharedCards || 0) / totalCards) * 100).toFixed(1) : 0;

        return {
            streaks: {
                average: parseFloat(avgStreak),
                totalFreezeTokens
            },
            circles: {
                active: activeCircles || 0,
                avgMembers: avgMembersPerCircle.toFixed(1)
            },
            twinMatches: {
                total: totalMatches || 0,
                shareRate: parseFloat(matchShareRate)
            },
            motivationCards: {
                total: totalCards || 0,
                shareRate: parseFloat(cardShareRate)
            }
        };
    } catch (error) {
        logger.error('Error getting feature usage stats:', error);
        throw error;
    }
}

/**
 * Get system health metrics
 */
export async function getSystemHealth() {
    try {
        // Check recent errors (last 24 hours)
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Get AI response times (from chat messages)
        const { data: recentMessages } = await supabaseAdmin
            .from('chat_history')
            .select('created_at')
            .gte('created_at', oneDayAgo)
            .limit(100);

        return {
            status: 'operational',
            recentMessages: recentMessages?.length || 0,
            lastChecked: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Error getting system health:', error);
        return {
            status: 'degraded',
            error: error.message
        };
    }
}

/**
 * Get all analytics (combined)
 */
export async function getAllAnalytics() {
    try {
        const [users, revenue, features, system] = await Promise.all([
            getUserMetrics(),
            getRevenueMetrics(),
            getFeatureUsageStats(),
            getSystemHealth()
        ]);

        return {
            users,
            revenue,
            features,
            system,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Error getting all analytics:', error);
        throw error;
    }
}

export default {
    getUserMetrics,
    getRevenueMetrics,
    getFeatureUsageStats,
    getSystemHealth,
    getAllAnalytics
};
