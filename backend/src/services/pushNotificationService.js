import { messaging } from '../config/firebase.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

const INVALID_TOKEN_ERROR_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
]);

function chunkArray(items, size) {
    const chunks = [];
    for (let index = 0; index < items.length; index += size) {
        chunks.push(items.slice(index, index + size));
    }
    return chunks;
}

function stringifyDataPayload(data) {
    return Object.fromEntries(
        Object.entries(data || {}).map(([key, value]) => [
            key,
            value == null ? '' : String(value),
        ])
    );
}

async function getUserPushTokens(userId) {
    const tokens = new Set();

    const { data: deviceTokens, error: deviceTokenError } = await supabaseAdmin
        .from('push_device_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('enabled', true);

    if (!deviceTokenError && Array.isArray(deviceTokens)) {
        deviceTokens.forEach((row) => {
            if (row.token) tokens.add(row.token);
        });
    } else if (deviceTokenError) {
        logger.warn(`Failed to fetch push_device_tokens for user ${userId}; falling back to users.fcm_token`, deviceTokenError);
    }

    if (tokens.size === 0) {
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('fcm_token')
            .eq('id', userId)
            .single();

        if (error) {
            logger.warn(`Failed to fetch fallback FCM token for user ${userId}:`, error);
        } else if (user?.fcm_token) {
            tokens.add(user.fcm_token);
        }
    }

    return Array.from(tokens);
}

async function disableInvalidTokens(userId, tokens) {
    if (tokens.length === 0) return;

    await supabaseAdmin
        .from('push_device_tokens')
        .update({ enabled: false, disabled_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('token', tokens);

    for (const token of tokens) {
        await supabaseAdmin
            .from('users')
            .update({ fcm_token: null })
            .eq('id', userId)
            .eq('fcm_token', token);
    }
}

/**
 * Send a push notification to a user
 * @param {string} userId - The user ID to send to
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Custom data payload (optional)
 */
export async function sendPushNotification(userId, title, body, data = {}) {
    try {
        if (!messaging) {
            logger.warn('Firebase Admin is not configured; skipping push notification send.');
            return false;
        }

        // 1. Get user's FCM token(s) from database
        const tokens = await getUserPushTokens(userId);

        if (tokens.length === 0) {
            logger.debug(`No FCM token found for user ${userId}, skipping push.`);
            return false;
        }

        // 2. Construct message payload
        const baseMessage = {
            notification: {
                title,
                body
            },
            data: {
                ...stringifyDataPayload(data),
                click_action: 'FLUTTER_NOTIFICATION_CLICK' // Standard for Flutter
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'twingenie_channel_v1', // Must match Android channel ID in mobile app
                    icon: 'ic_notification',
                    color: '#9333EA'
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
        const invalidTokens = [];
        let successCount = 0;

        for (const tokenBatch of chunkArray(tokens, 500)) {
            const response = await messaging.sendEachForMulticast({
                ...baseMessage,
                tokens: tokenBatch,
            });

            successCount += response.successCount;

            response.responses.forEach((result, index) => {
                if (!result.success && INVALID_TOKEN_ERROR_CODES.has(result.error?.code)) {
                    invalidTokens.push(tokenBatch[index]);
                }
            });
        }

        if (invalidTokens.length > 0) {
            logger.warn(`Disabling ${invalidTokens.length} invalid FCM token(s) for user ${userId}`);
            await disableInvalidTokens(userId, invalidTokens);
        }

        logger.info(`Sent push notification to user ${userId}: ${successCount}/${tokens.length} delivered`);
        return successCount > 0;

    } catch (error) {
        logger.error('Error sending push notification:', error);
        return false;
    }
}

export default {
    sendPushNotification
};
