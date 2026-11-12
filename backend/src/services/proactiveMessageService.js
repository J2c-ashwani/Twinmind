import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import pushNotificationService from './pushNotificationService.js';

/**
 * Proactive Message Service
 * Handles intelligent, context-aware proactive messaging from AI to users
 */

// Message templates by trigger type
const MESSAGE_TEMPLATES = {
    morning_checkin: [
        "Good morning! How did you sleep?",
        "Morning! Ready to tackle the day?",
        "Hey! How are you feeling this morning?",
        "Good morning! I was thinking about what you mentioned yesterday..."
    ],
    evening_reflection: [
        "Hey, before you wind down - how was today?",
        "Evening! Want to talk about your day?",
        "How did today go? I'm here if you want to reflect.",
        "Before you sleep, how are you feeling about today?"
    ],
    missed_you: [
        "I haven't heard from you today. Everything okay?",
        "Hey, it's been a while. How are you?",
        "Missing our conversations. How have you been?",
        "I was thinking about you. Everything alright?"
    ],
    follow_up: [
        "You mentioned [topic] a few days ago. How's that going?",
        "I've been thinking about what you said about [topic]. Any updates?",
        "Remember when you talked about [topic]? How did it turn out?",
        "Wanted to check in on [topic] you mentioned earlier."
    ],
    milestone: [
        "We've been talking every day for [days]! How are you feeling about our journey?",
        "It's been [days] days since we first connected. Look how far we've come!",
        "Milestone alert: [achievement]! I'm proud of you.",
        "You just hit [milestone]! That's amazing progress."
    ],
    celebration: [
        "I noticed you achieved [goal]! That's incredible!",
        "Celebrating with you - you did [achievement]!",
        "YES! You made it happen with [goal]!",
        "So proud of you for [achievement]!"
    ]
};

/**
 * Pure trigger evaluation helper (unit-testable with synthetic timestamps/patterns)
 */
export function evaluateProactiveTriggers({
    now = new Date(),
    pattern = null,
    lastActivityAt = null,
    contexts = [],
    streak = null,
} = {}) {
    const triggers = [];
    const currentNow = now instanceof Date ? now : new Date(now);
    const effectiveLastActivity = pattern?.last_activity || lastActivityAt;

    if (!effectiveLastActivity) {
        return triggers;
    }

    const hoursSinceActivity = Math.max(
        0,
        (currentNow.getTime() - new Date(effectiveLastActivity).getTime()) / (1000 * 60 * 60)
    );

    if (!pattern) {
        if (hoursSinceActivity >= 48) {
            triggers.push({
                type: 'missed_you',
                condition: { hours_since_activity: Math.round(hoursSinceActivity) },
                priority: 'medium',
            });
        }
        return triggers;
    }

    // Trigger: Missed you (no activity for 24+ hours)
    if (hoursSinceActivity >= 24) {
        triggers.push({
            type: 'missed_you',
            condition: { hours_since_activity: Math.round(hoursSinceActivity) },
            priority: 'high',
        });
    }

    // Trigger: Morning check-in
    const currentHour = currentNow.getHours();
    const wakeupHour = pattern.typical_wakeup_time
        ? parseInt(String(pattern.typical_wakeup_time).split(':')[0], 10)
        : 8;

    if (!Number.isNaN(wakeupHour) && currentHour === (wakeupHour + 1) % 24 && hoursSinceActivity > 12) {
        triggers.push({
            type: 'morning_checkin',
            condition: { current_hour: currentHour },
            priority: 'medium',
        });
    }

    // Trigger: Evening reflection
    const bedtimeHour = pattern.typical_bedtime
        ? parseInt(String(pattern.typical_bedtime).split(':')[0], 10)
        : 22;

    if (!Number.isNaN(bedtimeHour) && currentHour === (bedtimeHour - 1 + 24) % 24 && hoursSinceActivity < 6) {
        triggers.push({
            type: 'evening_reflection',
            condition: { current_hour: currentHour },
            priority: 'medium',
        });
    }

    // Trigger: Follow-up on life context
    if (Array.isArray(contexts) && contexts.length > 0) {
        const context = contexts[0];
        if (context?.last_mentioned) {
            const daysSinceMentioned =
                (currentNow.getTime() - new Date(context.last_mentioned).getTime()) / (1000 * 60 * 60 * 24);

            if (daysSinceMentioned >= 3) {
                triggers.push({
                    type: 'follow_up',
                    condition: {
                        context_name: context.name,
                        context_type: context.context_type,
                        days_since_mentioned: Math.floor(daysSinceMentioned),
                    },
                    priority: 'high',
                    context_data: context,
                });
            }
        }
    }

    // Trigger: Milestone celebration
    if (streak && [7, 14, 30, 60, 90].includes(streak.current_streak)) {
        triggers.push({
            type: 'milestone',
            condition: { streak_days: streak.current_streak },
            priority: 'high',
        });
    }

    return triggers;
}

/**
 * Detect if user should receive a proactive message
 */
async function detectProactiveTriggers(userId, now = new Date()) {
    try {
        const [patternRes, latestChatRes, contextsRes, streakRes] = await Promise.all([
            supabaseAdmin
                .from('user_activity_patterns')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle(),
            supabaseAdmin
                .from('chat_history')
                .select('created_at')
                .eq('user_id', userId)
                .eq('sender', 'user')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle(),
            supabaseAdmin
                .from('life_context')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active')
                .gte('importance', 7)
                .order('last_mentioned', { ascending: true })
                .limit(1),
            supabaseAdmin
                .from('user_streaks')
                .select('*')
                .eq('user_id', userId)
                .eq('streak_type', 'daily_checkin')
                .maybeSingle(),
        ]);

        let lastActivityAt = patternRes.data?.last_activity || latestChatRes.data?.created_at || null;
        if (!lastActivityAt) {
            const { data: userRow } = await supabaseAdmin
                .from('users')
                .select('created_at')
                .eq('id', userId)
                .maybeSingle();
            lastActivityAt = userRow?.created_at || null;
        }

        return evaluateProactiveTriggers({
            now,
            pattern: patternRes.data || null,
            lastActivityAt,
            contexts: contextsRes.data || [],
            streak: streakRes.data || null,
        });
    } catch (error) {
        logger.error('Error detecting proactive triggers:', error);
        return [];
    }
}

/**
 * Generate proactive message content
 */
function generateProactiveMessage(trigger, userContext = {}) {
    const templates = MESSAGE_TEMPLATES[trigger.type] || [];
    let template = templates[Math.floor(Math.random() * templates.length)];

    // Replace placeholders
    if (trigger.context_data) {
        template = template.replace('[topic]', trigger.context_data.name);
    }

    if (trigger.condition?.streak_days) {
        template = template.replace('[days]', trigger.condition.streak_days);
    }

    return template;
}

/**
 * Check per-user cooldown to avoid repeated proactive spam
 */
async function isUserInProactiveCooldown(userId, triggerType) {
    const cooldownHours = triggerType === 'missed_you' ? 48 : 24;
    const cutoffIso = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
        .from('proactive_messages')
        .select('id')
        .eq('user_id', userId)
        .gte('created_at', cutoffIso)
        .limit(1);

    if (error) {
        logger.warn(`Proactive cooldown check warning for ${userId}: ${error.message}`);
        return true; // Fail safe: do not spam on DB errors
    }

    return Array.isArray(data) && data.length > 0;
}

/**
 * Schedule proactive message
 */
async function scheduleProactiveMessage(userId, trigger) {
    try {
        const message = generateProactiveMessage(trigger);

        const { data, error } = await supabaseAdmin
            .from('proactive_messages')
            .insert({
                user_id: userId,
                trigger_type: trigger.type,
                trigger_condition: trigger.condition,
                message_content: message,
                scheduled_for: new Date().toISOString(),
                sent_at: null,
            })
            .select()
            .single();

        if (error) throw error;

        logger.info(`Scheduled proactive message for user ${userId}: ${trigger.type}`);

        // Sync to Notifications Table
        try {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: userId,
                    title: 'TwinGenie Check-in',
                    body: message.replace(/"/g, ''),
                    type: 'proactive_message',
                    data: {
                        action: 'chat',
                        message_id: data.id,
                        trigger_type: trigger.type
                    }
                });
        } catch (notifError) {
            logger.warn('Failed to sync proactive message to notifications:', notifError);
        }

        // Dispatch push and mark sent_at only when push delivery succeeds
        const pushDelivered = await pushNotificationService.sendPushNotification(
            userId,
            'TwinGenie Check-in',
            message.replace(/"/g, ''),
            {
                type: 'proactive_message',
                action: 'chat',
                message_id: data.id,
                trigger_type: trigger.type
            }
        );

        if (pushDelivered) {
            await supabaseAdmin
                .from('proactive_messages')
                .update({ sent_at: new Date().toISOString() })
                .eq('id', data.id);
        }

        return data;

    } catch (error) {
        logger.error('Error scheduling proactive message:', error);
        throw error;
    }
}

/**
 * Get pending proactive messages for user
 */
async function getPendingProactiveMessages(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('proactive_messages')
            .select('*')
            .eq('user_id', userId)
            .is('sent_at', null)
            .order('scheduled_for', { ascending: true });

        if (error) throw error;
        return data || [];

    } catch (error) {
        logger.error('Error getting pending messages:', error);
        return [];
    }
}

/**
 * Mark proactive message as sent/read (owner-scoped)
 */
async function markMessageSent(messageId, userId) {
    try {
        if (!userId) throw new Error('userId is required');

        const { data, error } = await supabaseAdmin
            .from('proactive_messages')
            .update({
                sent_at: new Date().toISOString(),
                user_responded: true,
            })
            .eq('id', messageId)
            .eq('user_id', userId)
            .select('id')
            .maybeSingle();

        if (error) throw error;
        return Boolean(data);

    } catch (error) {
        logger.error('Error marking message as sent:', error);
        throw error;
    }
}

/**
 * Record user response to proactive message
 */
async function recordUserResponse(messageId, responseTime) {
    try {
        const { error } = await supabaseAdmin
            .from('proactive_messages')
            .update({
                user_responded: true,
                response_time: responseTime
            })
            .eq('id', messageId);

        if (error) throw error;

    } catch (error) {
        logger.error('Error recording user response:', error);
    }
}

/**
 * Run proactive message check (called by cron job)
 */
async function runProactiveMessageCheck() {
    try {
        // Get all users from users table and push tokens
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id');

        const { data: tokenUsers } = await supabaseAdmin
            .from('push_device_tokens')
            .select('user_id')
            .eq('enabled', true);

        const allUserIds = new Set();
        if (users) users.forEach(u => u.id && allUserIds.add(u.id));
        if (tokenUsers) tokenUsers.forEach(t => t.user_id && allUserIds.add(t.user_id));

        if (allUserIds.size === 0) return;

        for (const userId of allUserIds) {
            const triggers = await detectProactiveTriggers(userId);

            // Schedule highest priority trigger if not in cooldown
            if (triggers.length > 0) {
                const highestPriority = triggers.sort((a, b) => {
                    const priority = { high: 3, medium: 2, low: 1 };
                    return priority[b.priority] - priority[a.priority];
                })[0];

                const inCooldown = await isUserInProactiveCooldown(userId, highestPriority.type);
                if (!inCooldown) {
                    await scheduleProactiveMessage(userId, highestPriority);
                }
            }
        }

        logger.info(`Proactive message check completed for ${allUserIds.size} users`);

    } catch (error) {
        logger.error('Error in proactive message check:', error);
    }
}

export {
    detectProactiveTriggers,
    generateProactiveMessage,
    scheduleProactiveMessage,
    getPendingProactiveMessages,
    markMessageSent,
    recordUserResponse,
    runProactiveMessageCheck
};
