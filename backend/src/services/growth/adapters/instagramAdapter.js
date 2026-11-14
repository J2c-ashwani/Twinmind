import fetch from 'node-fetch';
import logger from '../../../config/logger.js';

/**
 * Instagram Publishing Adapter
 * Uses official Meta Graph API (v19.0+).
 * Supports Multi-Image Carousels, Single Images, and Reels.
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

class InstagramAdapter {
    constructor() {
        this.platform = 'instagram';
    }

    getCredentials() {
        return {
            accessToken: process.env.META_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.INSTAGRAM_ACCESS_TOKEN,
            igUserId: process.env.INSTAGRAM_ACCOUNT_ID || process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '17841473412113239'
        };
    }

    isConfigured() {
        const { accessToken, igUserId } = this.getCredentials();
        return Boolean(accessToken && igUserId);
    }

    async getHealthStatus() {
        const configured = this.isConfigured();
        if (!configured) {
            return {
                platform: this.platform,
                status: 'missing_credentials',
                ready: false,
                requiredEnv: ['META_ACCESS_TOKEN', 'INSTAGRAM_ACCOUNT_ID']
            };
        }

        try {
            const { accessToken, igUserId } = this.getCredentials();
            const res = await fetch(`${GRAPH_API_BASE}/${igUserId}?fields=id,username&access_token=${accessToken}`);
            const data = await res.json();

            let recentMedia = [];
            try {
                const mediaRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media?fields=id,caption,media_type,permalink,timestamp&limit=5&access_token=${accessToken}`);
                const mediaData = await mediaRes.json();
                if (mediaData.data) {
                    recentMedia = mediaData.data;
                }
            } catch (mErr) {
                logger.warn('[INSTAGRAM] Failed to fetch recent media:', mErr.message);
            }

            return {
                platform: this.platform,
                status: res.ok ? 'connected' : 'token_expired_or_invalid',
                ready: res.ok,
                account: data.username || igUserId,
                recentMedia,
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
     * Reconciles whether Instagram has already published today in Asia/Kolkata timezone.
     * Prevents duplicate posts across server restarts and ambiguous timeouts.
     */
    async hasPublishedTodayIST() {
        const { accessToken, igUserId } = this.getCredentials();
        if (!accessToken || !igUserId) return false;

        try {
            const mediaRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media?fields=id,caption,media_type,permalink,timestamp&limit=5&access_token=${accessToken}`);
            const mediaData = await mediaRes.json();
            if (mediaData && Array.isArray(mediaData.data) && mediaData.data.length > 0) {
                const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
                const postedToday = mediaData.data.some(p => {
                    if (!p.timestamp) return false;
                    const postDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(p.timestamp));
                    return postDateIST === todayIST;
                });
                return postedToday;
            }
        } catch (e) {
            logger.warn('[INSTAGRAM] Error checking today posts on Instagram:', e.message);
        }
        return false;
    }

    /**
     * Publishes content to Instagram
     * @param {Object} postData - { caption, pngUrls, videoUrl, format }
     */
    async publish(postData) {
        const { accessToken, igUserId } = this.getCredentials();

        if (!accessToken || !igUserId) {
            logger.warn(`[INSTAGRAM] Credentials not set. Running in verified simulation mode.`);
            return {
                success: true,
                simulated: true,
                platform: this.platform,
                postId: `sim_ig_${Date.now()}`,
                url: `https://www.instagram.com/p/simulated_${Date.now()}/`
            };
        }

        logger.info(`[INSTAGRAM] Publishing to IG account ${igUserId}...`);

        try {
            let creationId = null;

            if (postData.format === 'reel' && postData.videoUrl) {
                // Reel Publishing
                creationId = await this._createReelContainer(accessToken, igUserId, postData.videoUrl, postData.caption);
                // Instagram requires video containers to be transcoded and reach FINISHED before publishing
                await this._waitForContainerReady(creationId, accessToken);
            } else if (postData.pngUrls && postData.pngUrls.length > 1) {
                // Carousel Publishing (Multiple images)
                creationId = await this._createCarouselContainer(accessToken, igUserId, postData.pngUrls, postData.caption);
            } else if (postData.pngUrls && postData.pngUrls.length === 1) {
                // Single Image Publishing
                creationId = await this._createSingleImageContainer(accessToken, igUserId, postData.pngUrls[0], postData.caption);
            } else {
                throw new Error('No valid media provided for Instagram post');
            }

            // Publish container
            const publishRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media_publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creation_id: creationId,
                    access_token: accessToken
                })
            });

            const pubData = await publishRes.json();
            if (!publishRes.ok || pubData.error) {
                logger.error('[INSTAGRAM] media_publish error:', pubData);
                return { success: false, error: pubData.error || pubData };
            }

            const postId = pubData.id;
            logger.info(`🎉 [INSTAGRAM] Published successfully! Post ID: ${postId}`);

            // Post first comment with direct download CTA to maximize conversion
            await this._postFirstComment(postId, postData, accessToken);

            return {
                success: true,
                platform: this.platform,
                postId,
                url: `https://www.instagram.com/p/${postId}/`
            };
        } catch (err) {
            logger.error('[INSTAGRAM] Exception during publish:', err);
            return { success: false, error: err.message };
        }
    }

    async _createSingleImageContainer(accessToken, igUserId, imageUrl, caption) {
        const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: imageUrl,
                caption,
                access_token: accessToken
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Failed to create IG image container');
        return data.id;
    }

    async _createCarouselContainer(accessToken, igUserId, imageUrls, caption) {
        // Step 1: Create container for each carousel item
        const itemIds = [];
        for (const imgUrl of imageUrls.slice(0, 10)) { // Meta allows max 10
            const itemRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_url: imgUrl,
                    is_carousel_item: true,
                    access_token: accessToken
                })
            });
            const itemData = await itemRes.json();
            if (!itemRes.ok) throw new Error(itemData.error?.message || 'Failed to create carousel child item');
            itemIds.push(itemData.id);
        }

        // Step 2: Create parent carousel container
        const parentRes = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                media_type: 'CAROUSEL',
                children: itemIds.join(','),
                caption,
                access_token: accessToken
            })
        });

        const parentData = await parentRes.json();
        if (!parentRes.ok) throw new Error(parentData.error?.message || 'Failed to create parent carousel');
        return parentData.id;
    }

    async _createReelContainer(accessToken, igUserId, videoUrl, caption) {
        const res = await fetch(`${GRAPH_API_BASE}/${igUserId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                media_type: 'REELS',
                video_url: videoUrl,
                caption,
                access_token: accessToken
            })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || 'Failed to create Reel container');
        return data.id;
    }

    /**
     * Polls Instagram media container status until processing reaches FINISHED.
     * Allow two minutes for native video ingestion; acceptance is not processing completion.
     */
    async _waitForContainerReady(containerId, accessToken, maxAttempts = 40, delayMs = 3000) {
        logger.info(`[INSTAGRAM] Polling container ${containerId} status until FINISHED...`);
        for (let i = 0; i < maxAttempts; i++) {
            await new Promise(r => setTimeout(r, delayMs));
            const res = await fetch(`${GRAPH_API_BASE}/${containerId}?fields=status_code,status&access_token=${accessToken}`);
            const data = await res.json();
            logger.info(`[INSTAGRAM] Container ${containerId} status: ${data.status_code || 'unknown'} (attempt ${i + 1}/${maxAttempts})`);
            if (data.status_code === 'FINISHED') {
                return true;
            }
            if (data.status_code === 'ERROR') {
                throw new Error(`Instagram video processing error: ${data.status || 'Failed'}`);
            }
        }
        throw new Error(`Instagram container processing timed out after ${maxAttempts * delayMs}ms`);
    }

    /**
     * Posts a first comment with the direct download link
     */
    async _postFirstComment(mediaId, postData, accessToken) {
        if (!mediaId) return;
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.asmind.app';
        const commentMsg = postData.firstComment || 
            `📲 Experience your AI Digital Twin free on Google Play:\n${playStoreUrl}\n\nTake your 35-question Big Five personality baseline today!`;
        try {
            const res = await fetch(`${GRAPH_API_BASE}/${mediaId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: commentMsg,
                    access_token: accessToken
                })
            });
            const data = await res.json();
            if (data.id) {
                logger.info(`💬 [INSTAGRAM] First-comment link posted successfully on ${mediaId}`);
            } else if (data.error) {
                logger.warn('[INSTAGRAM] Non-blocking first-comment notice:', data.error.message || data.error);
            }
        } catch (err) {
            logger.warn('[INSTAGRAM] Non-blocking first-comment notice:', err.message);
        }
    }
}

export default new InstagramAdapter();
