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
        logger.info('Starting smart reminder generation...');

        // 1. Get users active in the last 3 days
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

        // We'll fetch users who have chatted recently
        // Note: In a real app, we'd query users table with last_active, 
        // but here we'll query unique user_ids from chat_history
        const { data: recentChats, error } = await supabaseAdmin
            .from('chat_history')
            .select('user_id, created_at, message')
            .gte('created_at', threeDaysAgo.toISOString())
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Group by user
        const userChats = {};
        recentChats.forEach(chat => {
            if (!userChats[chat.user_id]) {
                userChats[chat.user_id] = [];
            }
            // Keep only last 10 messages for context
            if (userChats[chat.user_id].length < 10) {
                userChats[chat.user_id].push(chat.message);
            }
        });

        // Process each user
        for (const userId of Object.keys(userChats)) {
            await processUserForReminders(userId, userChats[userId]);
        }

        logger.info('Smart reminder generation complete.');
    } catch (error) {
        logger.error('Error generating smart reminders:', error);
    }
}

/**
 * Analyze user chat history and generate a reminder if needed
 */
async function processUserForReminders(userId, recentMessages) {
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

        // Use AI to analyze context and generate a check-in
        const context = recentMessages.reverse().join('\nUser: ');

        const systemPrompt = `
You are a thoughtful AI companion. Analyze the user's recent chat history and decide if a check-in is needed.
If the user mentioned a specific event (interview, date, meeting), feeling (sad, stressed, happy), or goal, generate a short, friendly check-in message.

Example 1 (User mentioned interview): "Hey! How did that interview go today? I've been thinking about you."
Example 2 (User was sad): "Just checking in - how are you feeling today? Sending you some positive vibes."
Example 3 (No specific context): "Hope you're having a great day! I'm here if you want to chat."

Output ONLY the message text. Keep it under 15 words.
`;

        const aiResponse = await aiService.generateChatResponse(
            `Recent chat history:\n${context}\n\nGenerate a check-in message:`,
            [], // conversationHistory
            systemPrompt,
            'reminders' // taskType
        );

        // Extract text from AI response (aiService returns {text, provider, ...})
        const reminderMessage = typeof aiResponse === 'string'
            ? aiResponse
            : (aiResponse?.text || aiResponse?.message || 'Hope you\'re having a great day!');

        // Save notification
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: userId,
                title: 'TwinGenie Check-in',
                body: reminderMessage.replace(/"/g, ''), // Remove quotes
                type: 'smart_reminder',
                data: { action: 'chat' }
            });

        // Send Push Notification
        await pushNotificationService.sendPushNotification(
            userId,
            'TwinGenie Check-in',
            reminderMessage.replace(/"/g, ''),
            { type: 'smart_reminder', action: 'chat' }
        );

        logger.info(`Generated reminder for user ${userId}: ${reminderMessage}`);

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
        logger.info(`Updated device token for user ${userId}`);
    } catch (error) {
        logger.error('Error updating device token:', error);
        throw error;
    }
}

export default {
    generateSmartReminders,
    getUserNotifications,
    markAsRead,
    updateDeviceToken
};
