import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import { isEffectivePro } from '../middleware/subscriptionMiddleware.js';

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
        const [patternRes, streaksRes, eventsRes, convCountRes, userChatsRes, goalsRes] = await Promise.all([
            supabaseAdmin.from('user_activity_patterns').select('*').eq('user_id', userId).maybeSingle(),
            supabaseAdmin.from('user_streaks').select('*').eq('user_id', userId),
            supabaseAdmin.from('metric_events').select('event_type').eq('user_id', userId),
            supabaseAdmin.from('conversations').select('*', { count: 'exact', head: true }).eq('user_id', userId),
            supabaseAdmin
                .from('chat_history')
                .select('conversation_id, created_at, sender')
                .eq('user_id', userId)
                .limit(1000),
            supabaseAdmin
                .from('life_context')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('context_type', 'goal')
                .eq('status', 'completed'),
        ]);

        const pattern = patternRes.data;
        const streaks = streaksRes.data || [];
        const events = eventsRes.data || [];
        const allChats = userChatsRes.data || [];
        const userChats = allChats.filter((m) => m.sender === 'user');

        const dailyStreak = streaks.find((s) => s.streak_type === 'daily_checkin')?.current_streak || 0;
        const vulnerabilityCount = events.filter((e) => e.event_type === 'vulnerability_shared').length;

        let lateNightChats = 0;
        let morningChats = 0;
        for (const msg of userChats) {
            const hour = new Date(msg.created_at).getHours();
            if (hour >= 23 || hour < 4) lateNightChats += 1;
            if (hour >= 5 && hour < 10) morningChats += 1;
        }

        const distinctDays = new Set(userChats.map((m) => String(m.created_at).slice(0, 10))).size;

        const conversationCounts = {};
        for (const msg of allChats) {
            if (msg.conversation_id) {
                conversationCounts[msg.conversation_id] = (conversationCounts[msg.conversation_id] || 0) + 1;
            }
        }
        const longConversations = Object.values(conversationCounts).filter((c) => c >= 50).length;

        return {
            days_active: Math.max(pattern?.total_days_active || 0, distinctDays),
            daily_streak: dailyStreak,
            vulnerability_count: vulnerabilityCount,
            goals_achieved: goalsRes.count || 0,
            late_night_chats: lateNightChats,
            morning_chats: morningChats,
            long_conversations: longConversations,
            total_conversations: convCountRes.count || 0,
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
        const numericPoints = Number(points);
        if (!Number.isFinite(numericPoints) || numericPoints <= 0) {
            return { leveled_up: false, new_level: 1, experience_points: 0 };
        }

        const { data: level, error: selectErr } = await supabaseAdmin
            .from('user_levels')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (selectErr) throw selectErr;

        if (!level) {
            const { error: insertErr } = await supabaseAdmin
                .from('user_levels')
                .insert({
                    user_id: userId,
                    current_level: 'stranger',
                    level_number: 1,
                    experience_points: numericPoints,
                });
            if (insertErr) throw insertErr;
            return { leveled_up: false, new_level: 1, experience_points: numericPoints };
        }

        const newXP = (level.experience_points || 0) + numericPoints;
        let newLevelNumber = level.level_number || 1;
        let newLevelName = level.current_level || 'stranger';
        let leveledUp = false;

        // Advance sequentially across multiple levels if XP crosses multiple thresholds
        while (LEVELS[newLevelNumber] && newXP >= LEVELS[newLevelNumber].max_xp && LEVELS[newLevelNumber + 1]) {
            newLevelNumber += 1;
            newLevelName = LEVELS[newLevelNumber].name;
            leveledUp = true;
        }

        const { error: updateErr } = await supabaseAdmin
            .from('user_levels')
            .update({
                experience_points: newXP,
                level_number: newLevelNumber,
                current_level: newLevelName,
                level_up_at: leveledUp ? new Date().toISOString() : level.level_up_at,
            })
            .eq('user_id', userId);

        if (updateErr) throw updateErr;

        return { leveled_up: leveledUp, new_level: newLevelNumber, new_level_name: newLevelName, experience_points: newXP };

    } catch (error) {
        logger.error('Error adding XP:', error);
        throw error;
    }
}

/**
 * Purchase streak freeze with allowlisted payment type and atomic XP / Pro verification
 */
export async function purchaseStreakFreeze(userId, purchaseType = 'xp') {
    try {
        const xpCost = 500;
        const normalizedType = String(purchaseType || '').trim().toLowerCase();

        if (normalizedType !== 'xp' && normalizedType !== 'premium') {
            throw new Error('Invalid purchaseType. Must be "xp" or "premium".');
        }

        if (normalizedType === 'premium') {
            const { data: subscription } = await supabaseAdmin
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

            if (!isEffectivePro(subscription)) {
                throw new Error('Active Pro subscription required for premium streak freeze');
            }
        }

        if (normalizedType === 'xp') {
            const { data: level } = await supabaseAdmin
                .from('user_levels')
                .select('experience_points')
                .eq('user_id', userId)
                .maybeSingle();

            if (!level || level.experience_points < xpCost) {
                throw new Error('Not enough XP');
            }

            // Conditional update ensures concurrent calls cannot double-spend XP
            const { data: deducted, error: deductError } = await supabaseAdmin
                .from('user_levels')
                .update({ experience_points: level.experience_points - xpCost })
                .eq('user_id', userId)
                .eq('experience_points', level.experience_points)
                .gte('experience_points', xpCost)
                .select('experience_points')
                .maybeSingle();

            if (deductError || !deducted) {
                throw new Error('Could not process XP deduction safely; please retry');
            }
        }

        // Add freeze token
        const { data: streak } = await supabaseAdmin
            .from('user_streaks')
            .select('freeze_tokens')
            .eq('user_id', userId)
            .eq('streak_type', 'daily_checkin')
            .maybeSingle();

        const nextTokens = (streak?.freeze_tokens || 0) + 1;
        await supabaseAdmin
            .from('user_streaks')
            .upsert(
                {
                    user_id: userId,
                    streak_type: 'daily_checkin',
                    freeze_tokens: nextTokens,
                    last_freeze_earned: new Date().toISOString(),
                },
                { onConflict: 'user_id,streak_type' }
            );

        // Log purchase
        await supabaseAdmin
            .from('streak_freeze_purchases')
            .insert({
                user_id: userId,
                purchase_type: normalizedType,
                tokens_earned: 1,
                xp_cost: normalizedType === 'xp' ? xpCost : null,
            });

        return { success: true, tokensRemaining: nextTokens };
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
        const [streaks, userAchievements, level] = await Promise.all([
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

        // Merge predefined achievements with user's unlocked achievements
        // This ensures ALL achievements are shown (locked ones too)
        const unlockedMap = {};
        (userAchievements.data || []).forEach(a => {
            unlockedMap[a.achievement_type] = a;
        });

        const allAchievements = Object.entries(ACHIEVEMENTS).map(([type, achievement]) => {
            const userAchievement = unlockedMap[type];
            if (userAchievement) {
                // User has unlocked this achievement
                return userAchievement;
            } else {
                // Locked achievement - return predefined data with null unlocked_at
                return {
                    id: type, // Use type as fallback ID
                    achievement_type: type,
                    achievement_name: achievement.name,
                    description: achievement.description,
                    rarity: achievement.rarity,
                    points: achievement.points,
                    icon: achievement.icon,
                    unlocked_at: null
                };
            }
        });

        return {
            streaks: effectiveStreaks,
            achievements: allAchievements,
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
