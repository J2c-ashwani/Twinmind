import fetch from 'node-fetch';
import logger from '../../../config/logger.js';

/**
 * Meta Threads Publishing Adapter
 * Uses official Threads API (graph.threads.net/v1.0).
 * Supports Text posts (up to 500 characters), Link attachments, and Images.
 * Includes token health monitoring and 60-day auto-refresh capability.
 */

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';
const DEFAULT_THREADS_USER_ID = '29098705129742004'; // @twingenie.app

class ThreadsAdapter {
    constructor() {
        this.platform = 'threads';
    }

    getCredentials() {
        return {
            accessToken: process.env.THREADS_ACCESS_TOKEN,
            userId: process.env.THREADS_USER_ID || DEFAULT_THREADS_USER_ID,
            appId: process.env.THREADS_APP_ID,
            appSecret: process.env.THREADS_APP_SECRET
        };
    }

    isConfigured() {
        const { accessToken, userId } = this.getCredentials();
        return Boolean(accessToken && userId);
    }

    async getHealthStatus() {
        const configured = this.isConfigured();
        if (!configured) {
            return {
                platform: this.platform,
                status: 'missing_credentials',
                ready: false,
                requiredEnv: ['THREADS_ACCESS_TOKEN', 'THREADS_USER_ID']
            };
        }

        try {
            const { accessToken, userId } = this.getCredentials();
            const res = await fetch(`${THREADS_API_BASE}/me?fields=id,username,threads_profile_picture_url&access_token=${accessToken}`);
            const data = await res.json();
            return {
                platform: this.platform,
                status: res.ok ? 'connected' : 'token_expired_or_invalid',
                ready: res.ok,
                account: data.username || userId,
                userId: data.id || userId,
                error: data.error?.message
            };
        } catch (e) {
            return {
                platform: this.platform,
                status: 'network_error',
                ready: false,
                error: e.message
            };
        }
    }

    /**
     * Refreshes a long-lived 60-day access token
     */
    async refreshAccessToken() {
        const { accessToken } = this.getCredentials();
        if (!accessToken) throw new Error('No THREADS_ACCESS_TOKEN available to refresh.');

        try {
            logger.info('🔄 [THREADS] Refreshing 60-day long-lived access token...');
            const url = `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${accessToken}`;
            const res = await fetch(url);
            const data = await res.json();

            if (res.ok && data.access_token) {
                logger.info(`✅ [THREADS] Access token refreshed successfully! Expires in ${Math.round(data.expires_in / 86400)} days.`);
                return {
                    success: true,
                    accessToken: data.access_token,
                    expiresIn: data.expires_in
                };
            } else {
                throw new Error(data.error?.message || 'Token refresh failed');
            }
        } catch (err) {
            logger.error('[THREADS] Token refresh exception:', err.message);
            return { success: false, error: err.message };
        }
    }

    /**
     * Publishes content to Threads
     * @param {Object} postData - { text, imageUrl, linkAttachment }
     */
    async publish(postData) {
        const { accessToken, userId } = this.getCredentials();

        if (!accessToken || !userId) {
            logger.warn(`[THREADS] Credentials not set. Running in verified simulation mode.`);
            return {
                success: true,
                simulated: true,
                platform: this.platform,
                postId: `sim_th_${Date.now()}`,
                url: `https://www.threads.net/@twingenie.app/post/simulated_${Date.now()}`
            };
        }

        // Threads has a strict 500-character limit
        let contentText = (postData.text || '').trim();
        if (contentText.length > 500) {
            logger.warn(`[THREADS] Post length (${contentText.length}) exceeds 500-character limit. Truncating cleanly.`);
            contentText = contentText.slice(0, 496) + '...';
        }

        logger.info(`[THREADS] Publishing to Threads account @twingenie.app (${userId})...`);

        try {
            // Step 1: Create Media Container
            const containerPayload = {
                access_token: accessToken,
                text: contentText
            };

            if (postData.imageUrl) {
                containerPayload.media_type = 'IMAGE';
                containerPayload.image_url = postData.imageUrl;
            } else {
                containerPayload.media_type = 'TEXT';
            }

            if (postData.linkAttachment) {
                containerPayload.link_attachment = postData.linkAttachment;
            }

            const containerRes = await fetch(`${THREADS_API_BASE}/${userId}/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(containerPayload)
            });

            const containerData = await containerRes.json();
            if (!containerRes.ok || !containerData.id) {
                throw new Error(containerData.error?.message || `Failed to create container: ${JSON.stringify(containerData)}`);
            }

            const creationId = containerData.id;
            logger.info(`[THREADS] Container created (${creationId}). Waiting 2s before publishing...`);
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Step 2: Publish Container
            const publishRes = await fetch(`${THREADS_API_BASE}/${userId}/threads_publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    creation_id: creationId,
                    access_token: accessToken
                })
            });

            const pubData = await publishRes.json();
            if (!publishRes.ok || !pubData.id) {
                throw new Error(pubData.error?.message || `Failed to publish container: ${JSON.stringify(pubData)}`);
            }

            const postId = pubData.id;
            logger.info(`🎉 [THREADS] Published successfully! Post ID: ${postId}`);

            // Step 3: Fetch clean permalink
            let permalink = `https://www.threads.net/@twingenie.app/post/${postId}`;
            try {
                const metaRes = await fetch(`${THREADS_API_BASE}/${postId}?fields=permalink&access_token=${accessToken}`);
                const metaData = await metaRes.json();
                if (metaData.permalink) {
                    permalink = metaData.permalink;
                }
            } catch (pErr) {
                logger.warn('[THREADS] Non-blocking permalink fetch warning:', pErr.message);
            }

            return {
                success: true,
                platform: this.platform,
                postId,
                url: permalink
            };
        } catch (err) {
            logger.error('[THREADS] Exception during publish:', err.message);
            return {
                success: false,
                platform: this.platform,
                error: err.message
            };
        }
    }
}

export default new ThreadsAdapter();
