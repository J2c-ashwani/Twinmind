import { supabaseAdmin } from '../config/supabase.js';
import aiService from './aiService.js';
import pushNotificationService from './pushNotificationService.js';
import logger from '../config/logger.js';

/**
 * Reminder Service - Generates smart, context-aware reminders
 */

/**
 * Generate smart reminders for active users
 * This is intended to be run by a cron job
 */
export async function generateSmartReminders() {
    try {
        logger.info('Starting smart reminder generation for all users...');

        // 1. Get all candidate users (users with push tokens or in users table)
        const { data: tokenUsers } = await supabaseAdmin
            .from('push_device_tokens')
            .select('user_id')
            .eq('enabled', true);

        const { data: registeredUsers } = await supabaseAdmin
            .from('users')
            .select('id, fcm_token');

        const allUserIds = new Set();
        if (tokenUsers) {
            tokenUsers.forEach(t => t.user_id && allUserIds.add(t.user_id));
        }
        if (registeredUsers) {
            registeredUsers.forEach(u => {
                if (u.id) allUserIds.add(u.id);
            });
        }

        logger.info(`Found ${allUserIds.size} total registered/token users for reminders.`);

        // 2. Fetch recent chat history authored by users (exclude seeded AI opening messages)
        const { data: recentChats } = await supabaseAdmin
            .from('chat_history')
            .select('user_id, created_at, message')
            .eq('sender', 'user')
            .order('created_at', { ascending: false })
            .limit(500);

        // Group by user
        const userChats = {};
        if (recentChats) {
            recentChats.forEach(chat => {
                if (!userChats[chat.user_id]) {
                    userChats[chat.user_id] = [];
                }
                // Keep only last 10 messages for context
                if (userChats[chat.user_id].length < 10) {
                    userChats[chat.user_id].push(chat.message);
                }
            });
        }

        // 3. Process every user - both active chatters and unengaged users
        for (const userId of allUserIds) {
            await processUserForReminders(userId, userChats[userId] || []);
        }

        logger.info('Smart reminder generation complete for all users.');
    } catch (error) {
        logger.error('Error generating smart reminders:', error);
    }
}

/**
 * Analyze user chat history and generate a reminder if needed
 */
async function processUserForReminders(userId, recentMessages = []) {
    try {
        // Check if we already sent a reminder today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: existing } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .eq('type', 'smart_reminder')
            .gte('created_at', today.toISOString())
            .single();

        if (existing) {
            // Already sent a reminder today, skip
            return;
        }

        // Check if user has actively enabled push tokens
        const { data: enabledTokens } = await supabaseAdmin
            .from('push_device_tokens')
            .select('token')
            .eq('user_id', userId)
            .eq('enabled', true);

        if (!enabledTokens || enabledTokens.length === 0) {
            // User has no valid, enabled push token — skip push to respect permission state
            return;
        }

        let reminderTitle = 'TwinGenie Check-in';
        let reminderMessage;
        let notificationType = 'smart_reminder';

        // For unengaged users (0 recent messages), send a respectful, low-frequency invitation
        if (!recentMessages || recentMessages.length === 0) {
            // 7-day cooldown for unengaged users to prevent feeling spammed
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: recentNudge } = await supabaseAdmin
                .from('notifications')
                .select('id')
                .eq('user_id', userId)
                .eq('type', 'twin_ready_reminder')
                .gte('created_at', sevenDaysAgo)
                .limit(1);

            if (recentNudge && recentNudge.length > 0) {
                // Already notified within 7 days; give user space
                return;
            }

            reminderTitle = 'Your Twin is ready';
            reminderMessage = "You can start your first conversation whenever you're ready.";
            notificationType = 'twin_ready_reminder';
        } else {
            // Use AI to analyze context and generate a check-in
            const context = recentMessages.slice().reverse().join('\nUser: ');

            const systemPrompt = `
You are a thoughtful AI companion. Analyze the user's recent chat history and decide if a check-in is needed.
If the user mentioned a specific event (interview, date, meeting), feeling (sad, stressed, happy), or goal, generate a short, friendly check-in message.

Example 1 (User mentioned interview): "Hey! How did that interview go today? I've been thinking about you."
Example 2 (User was sad): "Just checking in - how are you feeling today? Sending you some positive vibes."
Example 3 (No specific context): "Hope you're having a great day! I'm here if you want to chat."

Output ONLY the message text. Keep it under 15 words.
`;

            try {
                const aiResponse = await aiService.generateChatResponse({
                    userMessage: `Recent chat history:\n${context}\n\nGenerate a check-in message:`,
                    systemPrompt,
                    taskType: 'reminders'
                });

                // Extract text from AI response
                reminderMessage = typeof aiResponse === 'string'
                    ? aiResponse
                    : (aiResponse?.text || aiResponse?.message || 'Hope you\'re having a great day! I\'m here if you want to chat.');
            } catch (err) {
                logger.warn(`AI reminder fallback for ${userId}: ${err.message}`);
                reminderMessage = "Hope you're having a great day! I'm here if you want to chat.";
            }
        }

        const cleanBody = (reminderMessage || "Your Twin is ready to chat with you today!").replace(/"/g, '').trim();

        // Save notification
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                title: reminderTitle,
                body: cleanBody,
                type: notificationType,
                data: { action: 'chat' }
            });

        // Send Push Notification
        await pushNotificationService.sendPushNotification(
            userId,
            reminderTitle,
            cleanBody,
            { type: notificationType, action: 'chat' }
        );

        logger.info(`Generated reminder for user ${userId}: ${cleanBody}`);

    } catch (error) {
        logger.error(`Error processing reminders for user ${userId}:`, error);
    }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;
        return data;
    } catch (error) {
        logger.error('Error fetching notifications:', error);
        throw error;
    }
}

/**
 * Mark notification as read
 */
export async function markAsRead(notificationId) {
    try {
        const { error } = await supabaseAdmin
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notificationId);

        if (error) throw error;
    } catch (error) {
        logger.error('Error marking notification read:', error);
        throw error;
    }
}

/**
 * Update user's device token for push notifications
 */
export async function updateDeviceToken(userId, token) {
    try {
        const { error } = await supabaseAdmin
            .from('users')
            .update({ fcm_token: token })
            .eq('id', userId);

        if (error) throw error;

        const { error: deviceTokenError } = await supabaseAdmin
            .from('push_device_tokens')
            .upsert({
                user_id: userId,
                token,
                platform: 'android',
                enabled: true,
                last_seen_at: new Date().toISOString(),
            }, { onConflict: 'token' });

        if (deviceTokenError) {
            logger.warn('Could not upsert push_device_tokens entry. Apply the push device token migration for multi-device push support.', deviceTokenError);
        }

        logger.info(`Updated device token for user ${userId}`);
    } catch (error) {
        logger.error('Error updating device token:', error);
        throw error;
    }
}

/**
 * Store a browser Web Push subscription separately from FCM tokens.
 */
export async function updateWebPushSubscription(userId, subscription) {
    try {
        const { error } = await supabaseAdmin
            .from('users')
            .update({
                web_push_subscription: subscription,
                push_provider: 'web_push',
            })
            .eq('id', userId);

        if (error) throw error;
        logger.info(`Updated web push subscription for user ${userId}`);
    } catch (error) {
        logger.error('Error updating web push subscription:', error);
        throw error;
    }
}

export default {
    generateSmartReminders,
    getUserNotifications,
    markAsRead,
    updateDeviceToken,
    updateWebPushSubscription,
};
