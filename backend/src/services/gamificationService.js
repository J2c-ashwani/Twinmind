import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Gamification Service
 * Manages streaks, achievements, and user levels
 */

// Achievement definitions
export const ACHIEVEMENTS = {
    first_week: {
        name: 'First Week Complete',
        description: 'Talked for 7 days',
        condition: (stats) => stats.days_active >= 7,
        rarity: 'common',
        points: 10,
        icon: '🎉'
    },
    trusted_companion: {
        name: 'Trusted Companion',
        description: 'Shared 10 vulnerable moments',
        condition: (stats) => stats.vulnerability_count >= 10,
        rarity: 'rare',
        points: 50,
        icon: '💙'
    },
    week_streak: {
        name: '7-Day Streak',
        description: 'Talked every day for a week',
        condition: (stats) => stats.daily_streak >= 7,
        rarity: 'rare',
        points: 30,
        icon: '🔥'
    },
    month_streak: {
        name: '30-Day Streak',
        description: 'Talked every day for a month',
        condition: (stats) => stats.daily_streak >= 30,
        rarity: 'epic',
        points: 100,
        icon: '⭐'
    },
    growth_mindset: {
        name: 'Growth Mindset',
        description: 'Set and achieved 3 goals',
        condition: (stats) => stats.goals_achieved >= 3,
        rarity: 'rare',
        points: 40,
        icon: '🌱'
    },
    night_owl: {
        name: 'Night Owl',
        description: '10 late night conversations',
        condition: (stats) => stats.late_night_chats >= 10,
        rarity: 'common',
        points: 15,
        icon: '🦉'
    },
    morning_person: {
        name: 'Morning Person',
        description: '10 morning check-ins',
        condition: (stats) => stats.morning_chats >= 10,
        rarity: 'common',
        points: 15,
        icon: '🌅'
    },
    deep_diver: {
        name: 'Deep Diver',
        description: '5 conversations over 50 messages',
        condition: (stats) => stats.long_conversations >= 5,
        rarity: 'rare',
        points: 35,
        icon: '🏊'
    },
    century_club: {
        name: 'Century Club',
        description: '100 total conversations',
        condition: (stats) => stats.total_conversations >= 100,
        rarity: 'epic',
        points: 75,
        icon: '💯'
    },
    legendary_bond: {
        name: 'Legendary Bond',
        description: '90-day streak',
        condition: (stats) => stats.daily_streak >= 90,
        rarity: 'legendary',
        points: 200,
        icon: '👑'
    }
};

// Level definitions
export const LEVELS = {
    1: { name: 'stranger', min_xp: 0, max_xp: 50 },
    2: { name: 'acquaintance', min_xp: 50, max_xp: 150 },
    3: { name: 'friend', min_xp: 150, max_xp: 400 },
    4: { name: 'close_friend', min_xp: 400, max_xp: 800 },
    5: { name: 'best_friend', min_xp: 800, max_xp: Infinity }
};

/**
 * Update user streak
 */
export async function updateStreak(userId, streakType) {
    try {
        const today = new Date().toISOString().split('T')[0];

        const { data: existing } = await supabaseAdmin
            .from('user_streaks')
            .select('*')
            .eq('user_id', userId)
            .eq('streak_type', streakType)
            .single();

        if (!existing) {
            // Create new streak
            await supabaseAdmin
                .from('user_streaks')
                .insert({
                    user_id: userId,
                    streak_type: streakType,
                    current_streak: 1,
                    longest_streak: 1,
                    last_activity_date: today,
                    streak_started_at: today,
                    total_completions: 1
                });
            return { current: 1, longest: 1, isNew: true };
        }

        const lastDate = new Date(existing.last_activity_date);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

        let newStreak = existing.current_streak;
        let newLongest = existing.longest_streak;

        if (daysDiff === 0) {
            // Same day, no change
            return { current: newStreak, longest: newLongest, isNew: false };
        } else if (daysDiff === 1) {
            // Consecutive day, increment
            newStreak += 1;
            newLongest = Math.max(newStreak, newLongest);
        } else {
            // Streak broken - check for freeze token
            const shouldUseFreezeToken = existing.freeze_tokens > 0 && existing.current_streak > 7;

            if (shouldUseFreezeToken) {
                // Auto-apply freeze
                newStreak = existing.current_streak; // Maintain streak

                await supabaseAdmin
                    .from('user_streaks')
                    .update({
                        freeze_tokens: existing.freeze_tokens - 1,
                        freeze_used_at: new Date().toISOString(),
                        last_activity_date: today,
                        total_completions: existing.total_completions + 1
                    })
                    .eq('id', existing.id);

                // Log freeze usage
                await supabaseAdmin
                    .from('streak_freeze_purchases')
                    .insert({
                        user_id: userId,
                        purchase_type: 'free',
                        tokens_earned: -1
                    });

                return {
                    current: newStreak,
                    longest: newLongest,
                    isNew: false,
                    freezeUsed: true,
                    broken: false
                };
            } else {
                // No freeze available, streak breaks
                newStreak = 1;
            }
        }

        await supabaseAdmin
            .from('user_streaks')
            .update({
                current_streak: newStreak,
                longest_streak: newLongest,
                last_activity_date: today,
                total_completions: existing.total_completions + 1
            })
            .eq('id', existing.id);

        return {
            current: newStreak,
            longest: newLongest,
            isNew: false,
            broken: daysDiff > 1
        };

    } catch (error) {
        logger.error('Error updating streak:', error);
        throw error;
    }
}

/**
 * Check and award achievements
 */
export async function checkAndAwardAchievements(userId) {
    try {
        // Get user stats
        const stats = await getUserStats(userId);

        const newAchievements = [];

        // Check each achievement
        for (const [type, achievement] of Object.entries(ACHIEVEMENTS)) {
            // Check if already unlocked
            const { data: existing } = await supabaseAdmin
                .from('user_achievements')
                .select('id')
                .eq('user_id', userId)
                .eq('achievement_type', type)
                .single();

            if (existing) continue; // Already unlocked

            // Check condition
            if (achievement.condition(stats)) {
                const { data } = await supabaseAdmin
                    .from('user_achievements')
                    .insert({
                        user_id: userId,
                        achievement_type: type,
                        achievement_name: achievement.name,
                        description: achievement.description,
                        rarity: achievement.rarity,
                        points: achievement.points,
                        icon: achievement.icon
                    })
                    .select()
                    .single();

                newAchievements.push(data);

                // Award XP
                await addExperiencePoints(userId, achievement.points);
            }
        }

        return newAchievements;

    } catch (error) {
        logger.error('Error checking achievements:', error);
        return [];
    }
}

/**
 * Get user stats for achievement checking
 */
export async function getUserStats(userId) {
    try {
        const { data: pattern } = await supabaseAdmin
            .from('user_activity_patterns')
            .select('*')
            .eq('user_id', userId)
            .single();

        const { data: streaks } = await supabaseAdmin
            .from('user_streaks')
            .select('*')
            .eq('user_id', userId);

        const { data: events } = await supabaseAdmin
            .from('metric_events')
            .select('event_type')
            .eq('user_id', userId);

        const dailyStreak = streaks?.find(s => s.streak_type === 'daily_checkin')?.current_streak || 0;
        const vulnerabilityCount = events?.filter(e => e.event_type === 'vulnerability_shared').length || 0;

        return {
            days_active: pattern?.total_days_active || 0,
            daily_streak: dailyStreak,
            vulnerability_count: vulnerabilityCount,
            goals_achieved: 0, // TODO: Implement goal tracking
            late_night_chats: 0, // TODO: Track time-based stats
            morning_chats: 0,
            long_conversations: 0,
            total_conversations: 0
        };

    } catch (error) {
        logger.error('Error getting user stats:', error);
        return {};
    }
}

/**
 * Add experience points and check for level up
 */
export async function addExperiencePoints(userId, points) {
    try {
        const { data: level } = await supabaseAdmin
            .from('user_levels')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!level) {
            // Create initial level
            await supabaseAdmin
                .from('user_levels')
                .insert({
                    user_id: userId,
                    current_level: 'stranger',
                    level_number: 1,
                    experience_points: points
                });
            return { leveled_up: false, new_level: 1 };
        }

        const newXP = level.experience_points + points;
        const currentLevelDef = LEVELS[level.level_number];

        let newLevelNumber = level.level_number;
        let newLevelName = level.current_level;
        let leveledUp = false;

        // Check for level up
        if (newXP >= currentLevelDef.max_xp) {
            newLevelNumber += 1;
            newLevelName = LEVELS[newLevelNumber].name;
            leveledUp = true;
        }

        await supabaseAdmin
            .from('user_levels')
            .update({
                experience_points: newXP,
                level_number: newLevelNumber,
                current_level: newLevelName,
                level_up_at: leveledUp ? new Date() : level.level_up_at
            })
            .eq('user_id', userId);

        return { leveled_up: leveledUp, new_level: newLevelNumber, new_level_name: newLevelName };

    } catch (error) {
        logger.error('Error adding XP:', error);
        throw error;
    }
}

/**
 * Purchase streak freeze with XP
 */
export async function purchaseStreakFreeze(userId, purchaseType = 'xp') {
    try {
        const xpCost = 500;

        if (purchaseType === 'xp') {
            // Check user has enough XP
            const { data: level } = await supabaseAdmin
                .from('user_levels')
                .select('experience_points')
                .eq('user_id', userId)
                .single();

            if (!level || level.experience_points < xpCost) {
                throw new Error('Not enough XP');
            }

            // Deduct XP
            await supabaseAdmin
                .from('user_levels')
                .update({ experience_points: level.experience_points - xpCost })
                .eq('user_id', userId);
        }

        // Add freeze token
        const { data: streak } = await supabaseAdmin
            .from('user_streaks')
            .select('freeze_tokens')
            .eq('user_id', userId)
            .eq('streak_type', 'daily_checkin')
            .single();

        await supabaseAdmin
            .from('user_streaks')
            .update({
                freeze_tokens: (streak?.freeze_tokens || 0) + 1,
                last_freeze_earned: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('streak_type', 'daily_checkin');

        // Log purchase
        await supabaseAdmin
            .from('streak_freeze_purchases')
            .insert({
                user_id: userId,
                purchase_type: purchaseType,
                tokens_earned: 1,
                xp_cost: purchaseType === 'xp' ? xpCost : null
            });

        return { success: true, tokensRemaining: (streak?.freeze_tokens || 0) + 1 };
    } catch (error) {
        logger.error('Error purchasing streak freeze:', error);
        throw error;
    }
}

/**
 * Award free freeze token from milestone
 */
export async function awardFreezeToken(userId, reason = 'milestone') {
    try {
        const { data: streak } = await supabaseAdmin
            .from('user_streaks')
            .select('freeze_tokens')
            .eq('user_id', userId)
            .eq('streak_type', 'daily_checkin')
            .single();

        await supabaseAdmin
            .from('user_streaks')
            .update({
                freeze_tokens: (streak?.freeze_tokens || 0) + 1,
                last_freeze_earned: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('streak_type', 'daily_checkin');

        await supabaseAdmin
            .from('streak_freeze_purchases')
            .insert({
                user_id: userId,
                purchase_type: reason,
                tokens_earned: 1
            });

        return { success: true };
    } catch (error) {
        logger.error('Error awarding freeze token:', error);
        throw error;
    }
}

/**
 * Get freeze token status
 */
export async function getFreezeStatus(userId) {
    try {
        const { data: streak } = await supabaseAdmin
            .from('user_streaks')
            .select('freeze_tokens, freeze_used_at, last_freeze_earned')
            .eq('user_id', userId)
            .eq('streak_type', 'daily_checkin')
            .single();

        const { data: history } = await supabaseAdmin
            .from('streak_freeze_purchases')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(5);

        return {
            tokens: streak?.freeze_tokens || 0,
            lastUsed: streak?.freeze_used_at,
            lastEarned: streak?.last_freeze_earned,
            history: history || []
        };
    } catch (error) {
        logger.error('Error getting freeze status:', error);
        return { tokens: 0, history: [] };
    }
}


/**
 * Get user's gamification status
 */
export async function getGamificationStatus(userId) {
    try {
        const [streaks, achievements, level] = await Promise.all([
            supabaseAdmin.from('user_streaks').select('*').eq('user_id', userId),
            supabaseAdmin.from('user_achievements').select('*').eq('user_id', userId).order('unlocked_at', { ascending: false }),
            supabaseAdmin.from('user_levels').select('*').eq('user_id', userId).single()
        ]);

        // Calculate effective streaks based on last activity date
        const today = new Date().toISOString().split('T')[0];
        const effectiveStreaks = (streaks.data || []).map(streak => {
            const lastDate = new Date(streak.last_activity_date);
            const todayDate = new Date(today);
            const daysDiff = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

            let effectiveStreak = streak.current_streak;
            let status = 'active';

            if (daysDiff === 0) {
                // Completed today
                status = 'completed_today';
            } else if (daysDiff === 1) {
                // At risk - need to complete today
                status = 'at_risk';
            } else if (daysDiff > 1) {
                // Streak broken
                effectiveStreak = 0;
                status = 'broken';
            }

            return {
                ...streak,
                effective_streak: effectiveStreak,
                status,
                days_since_activity: daysDiff
            };
        });

        return {
            streaks: effectiveStreaks,
            achievements: achievements.data || [],
            level: level.data || { current_level: 'stranger', level_number: 1, experience_points: 0 }
        };

    } catch (error) {
        logger.error('Error getting gamification status:', error);
        return { streaks: [], achievements: [], level: {} };
    }
}

export default {
    updateStreak,
    checkAndAwardAchievements,
    addExperiencePoints,
    getGamificationStatus,
    getUserStats,
    purchaseStreakFreeze,
    awardFreezeToken,
    getFreezeStatus,
    ACHIEVEMENTS,
    LEVELS
};
