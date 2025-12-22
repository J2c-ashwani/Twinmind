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
 * Detect if user should receive a proactive message
 */
async function detectProactiveTriggers(userId) {
    const triggers = [];

    try {
        // Get user activity pattern
        const { data: pattern } = await supabaseAdmin
            .from('user_activity_patterns')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!pattern) return triggers;

        const now = new Date();
        const lastActivity = new Date(pattern.last_activity);
        const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);

        // Trigger: Missed you (no activity for 24+ hours)
        if (hoursSinceActivity >= 24) {
            triggers.push({
                type: 'missed_you',
                condition: { hours_since_activity: hoursSinceActivity },
                priority: 'high'
            });
        }

        // Trigger: Morning check-in
        const currentHour = now.getHours();
        const wakeupHour = pattern.typical_wakeup_time ?
            parseInt(pattern.typical_wakeup_time.split(':')[0]) : 8;

        if (currentHour === wakeupHour + 1 && hoursSinceActivity > 12) {
            triggers.push({
                type: 'morning_checkin',
                condition: { current_hour: currentHour },
                priority: 'medium'
            });
        }

        // Trigger: Evening reflection
        const bedtimeHour = pattern.typical_bedtime ?
            parseInt(pattern.typical_bedtime.split(':')[0]) : 22;

        if (currentHour === bedtimeHour - 1 && hoursSinceActivity < 6) {
            triggers.push({
                type: 'evening_reflection',
                condition: { current_hour: currentHour },
                priority: 'medium'
            });
        }

        // Trigger: Follow-up on life context
        const { data: contexts } = await supabaseAdmin
            .from('life_context')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .gte('importance', 7)
            .order('last_mentioned', { ascending: true })
            .limit(1);

        if (contexts && contexts.length > 0) {
            const context = contexts[0];
            const daysSinceMentioned = (now - new Date(context.last_mentioned)) / (1000 * 60 * 60 * 24);

            if (daysSinceMentioned >= 3) {
                triggers.push({
                    type: 'follow_up',
                    condition: {
                        context_name: context.name,
                        context_type: context.context_type,
                        days_since_mentioned: daysSinceMentioned
                    },
                    priority: 'high',
                    context_data: context
                });
            }
        }

        // Trigger: Milestone celebration
        const { data: streaks } = await supabaseAdmin
            .from('user_streaks')
            .select('*')
            .eq('user_id', userId)
            .eq('streak_type', 'daily_checkin')
            .single();

        if (streaks && [7, 14, 30, 60, 90].includes(streaks.current_streak)) {
            triggers.push({
                type: 'milestone',
                condition: { streak_days: streaks.current_streak },
                priority: 'high'
            });
        }

        return triggers;

    } catch (error) {
        logger.error('Error detecting proactive triggers:', error);
        return triggers;
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
                scheduled_for: new Date(),
                sent_at: new Date() // Send immediately for now
            })
            .select()
            .single();

        if (error) throw error;

        logger.info(`Scheduled proactive message for user ${userId}: ${trigger.type}`);

        // ---------------------------------------------------------
        // REVIVAL FIX: Also push to Notifications Table so user sees it
        // ---------------------------------------------------------
        try {
            await supabaseAdmin
                .from('notifications')
                .insert({
                    user_id: userId,
                    title: 'TwinGenie Check-in',
                    body: message.replace(/"/g, ''), // Clean quotes
                    type: 'proactive_message',
                    data: {
                        action: 'chat',
                        message_id: data.id,
                        trigger_type: trigger.type
                    }
                });
            logger.info(`✅ Synced proactive message to Notifications for user ${userId}`);
        } catch (notifError) {
            logger.warn('Failed to sync proactive message to notifications:', notifError);
        }

        // ---------------------------------------------------------
        // SEND PUSH NOTIFICATION
        // ---------------------------------------------------------
        await pushNotificationService.sendPushNotification(
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
        // ---------------------------------------------------------

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
 * Mark proactive message as sent
 */
async function markMessageSent(messageId) {
    try {
        const { error } = await supabaseAdmin
            .from('proactive_messages')
            .update({ sent_at: new Date() })
            .eq('id', messageId);

        if (error) throw error;

    } catch (error) {
        logger.error('Error marking message as sent:', error);
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
        // Get all active users
        const { data: users } = await supabaseAdmin
            .from('users')
            .select('id');

        if (!users) return;

        for (const user of users) {
            const triggers = await detectProactiveTriggers(user.id);

            // Schedule highest priority trigger
            if (triggers.length > 0) {
                const highestPriority = triggers.sort((a, b) => {
                    const priority = { high: 3, medium: 2, low: 1 };
                    return priority[b.priority] - priority[a.priority];
                })[0];

                await scheduleProactiveMessage(user.id, highestPriority);
            }
        }

        logger.info('Proactive message check completed');

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
