import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Admin Analytics Service
 * Provides analytics and metrics for admin dashboard
 */

/**
 * Get user metrics
 */
export async function getUserMetrics() {
    try {
        // Total users
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Active users (logged in last 7 days)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: activeUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('last_login', sevenDaysAgo);

        // Premium users
        const { count: premiumUsers } = await supabaseAdmin
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');

        // Free users
        const freeUsers = (totalUsers || 0) - (premiumUsers || 0);

        // Conversion rate
        const conversionRate = totalUsers > 0
            ? ((premiumUsers || 0) / totalUsers * 100).toFixed(2)
            : 0;

        // New users (last 7 days)
        const { count: newUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', sevenDaysAgo);

        return {
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            premiumUsers: premiumUsers || 0,
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
 * Get revenue metrics
 */
export async function getRevenueMetrics() {
    try {
        // Get all active subscriptions
        const { data: subscriptions } = await supabaseAdmin
            .from('subscriptions')
            .select('amount, currency, created_at')
            .eq('status', 'active');

        // Calculate MRR (assuming most are monthly)
        const mrr = (subscriptions || []).reduce((sum, sub) => sum + (sub.amount || 0), 0);

        // Growth (compare to last month)
        const lastMonthStart = new Date();
        lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
        lastMonthStart.setDate(1);

        const { count: newSubsThisMonth } = await supabaseAdmin
            .from('subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active')
            .gte('created_at', lastMonthStart.toISOString());

        return {
            mrr: mrr || 0,
            activeSubscriptions: subscriptions?.length || 0,
            newSubscriptionsThisMonth: newSubsThisMonth || 0,
            currency: 'USD'
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
        // Streak stats
        const { data: streakData } = await supabaseAdmin
            .from('user_streaks')
            .select('current_streak, freeze_tokens');

        const avgStreak = streakData?.length > 0
            ? (streakData.reduce((sum, s) => sum + (s.current_streak || 0), 0) / streakData.length).toFixed(1)
            : 0;

        const totalFreezeTokens = streakData?.reduce((sum, s) => sum + (s.freeze_tokens || 0), 0) || 0;

        // Growth Circles
        const { count: activeCircles } = await supabaseAdmin
            .from('growth_circles')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        const { data: circleMembers } = await supabaseAdmin
            .from('circle_members')
            .select('circle_id');

        const avgMembersPerCircle = activeCircles > 0
            ? (circleMembers?.length || 0) / activeCircles
            : 0;

        // Twin Matches
        const { count: totalMatches } = await supabaseAdmin
            .from('twin_matches')
            .select('*', { count: 'exact', head: true });

        const { count: sharedMatches } = await supabaseAdmin
            .from('twin_matches')
            .select('*', { count: 'exact', head: true })
            .eq('is_shared', true);

        const matchShareRate = totalMatches > 0
            ? ((sharedMatches || 0) / totalMatches * 100).toFixed(1)
            : 0;

        // Motivation Cards
        const { count: totalCards } = await supabaseAdmin
            .from('motivation_cards')
            .select('*', { count: 'exact', head: true });

        const { count: sharedCards } = await supabaseAdmin
            .from('motivation_cards')
            .select('*', { count: 'exact', head: true })
            .eq('is_shared', true);

        const cardShareRate = totalCards > 0
            ? ((sharedCards || 0) / totalCards * 100).toFixed(1)
            : 0;

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
