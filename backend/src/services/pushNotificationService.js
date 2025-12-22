import { messaging } from '../config/firebase.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

/**
 * Send a push notification to a user
 * @param {string} userId - The user ID to send to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Custom data payload (optional)
 */
export async function sendPushNotification(userId, title, body, data = {}) {
    try {
        // 1. Get user's FCM token from database
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('fcm_token')
            .eq('id', userId)
            .single();

        if (error || !user || !user.fcm_token) {
            if (error) logger.warn(`Failed to fetch FCM token for user ${userId}:`, error);
            else logger.debug(`No FCM token found for user ${userId}, skipping push.`);
            return false;
        }

        const token = user.fcm_token;

        // 2. Construct message payload
        const message = {
            notification: {
                title,
                body
            },
            data: {
                ...data,
                click_action: 'FLUTTER_NOTIFICATION_CLICK' // Standard for Flutter
            },
            token: token,
            android: {
                priority: 'high',
                notification: {
                    channelId: 'twinmind_high_importance' // Must match Android channel ID in mobile app
                }
            },
            apns: {
                headers: {
                    'apns-priority': '10'
                },
                payload: {
                    aps: {
                        sound: 'default'
                    }
                }
            }
        };

        // 3. Send message via Firebase
        const response = await messaging.send(message);
        logger.info(`Successfully sent push notification to user ${userId}: ${response}`);
        return true;

    } catch (error) {
        if (error.code === 'messaging/registration-token-not-registered') {
            logger.warn(`FCM token invalid for user ${userId}, removing it.`);
            // Remove invalid token to prevent future errors
            await supabaseAdmin.from('users').update({ fcm_token: null }).eq('id', userId);
        } else {
            logger.error('Error sending push notification:', error);
        }
        return false;
    }
}

export default {
    sendPushNotification
};
