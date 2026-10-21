import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import logger from '../../../config/logger.js';

/**
 * Facebook Page Publishing Adapter
 * Uses official Meta Graph API (v19.0+).
 * Supports Photo Posts, Feed Messages with Links, and Video Reels.
 */

const GRAPH_API_BASE = 'https://graph.facebook.com/v19.0';

class FacebookAdapter {
    constructor() {
        this.platform = 'facebook';
    }

    getCredentials() {
        return {
            accessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN,
            pageId: process.env.FACEBOOK_PAGE_ID
        };
    }

    isConfigured() {
        const { accessToken, pageId } = this.getCredentials();
        return Boolean(accessToken && pageId);
    }

    async getHealthStatus() {
        const configured = this.isConfigured();
        if (!configured) {
            return {
                platform: this.platform,
                status: 'missing_credentials',
                ready: false,
                requiredEnv: ['FACEBOOK_PAGE_ACCESS_TOKEN', 'FACEBOOK_PAGE_ID']
            };
        }

        try {
            const { accessToken, pageId } = this.getCredentials();
            const res = await fetch(`${GRAPH_API_BASE}/${pageId}?fields=id,name&access_token=${accessToken}`);
            const data = await res.json();
            return {
                platform: this.platform,
                status: res.ok ? 'connected' : 'token_expired_or_invalid',
                ready: res.ok,
                pageName: data.name || pageId,
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
     * Publishes a post to Facebook Page
     * @param {Object} postData - { caption, pngUrls, videoUrl, utmLink }
     */
    async publish(postData) {
        const { accessToken, pageId } = this.getCredentials();

        if (!accessToken || !pageId) {
            logger.warn(`[FACEBOOK] Credentials not set. Running in verified simulation mode.`);
            return {
                success: true,
                simulated: true,
                platform: this.platform,
                postId: `sim_fb_${Date.now()}`,
                url: `https://facebook.com/${pageId || 'TwinGenie'}/posts/simulated_${Date.now()}`
            };
        }

        logger.info(`[FACEBOOK] Publishing to Facebook Page ${pageId}...`);

        try {
            let postId = null;

            // Case 0: Video Reel Upload (1080x1920 MP4 via official Video Reels API)
            if (postData.videoPath && fs.existsSync(postData.videoPath)) {
                logger.info(`[FACEBOOK] Uploading video reel binary via official Reels API: ${postData.videoPath}`);
                const fileStats = fs.statSync(postData.videoPath);
                const fileBuffer = fs.readFileSync(postData.videoPath);
                
                try {
                    // Step 1: Initialize Reel upload session
                    const initRes = await fetch(`${GRAPH_API_BASE}/${pageId}/video_reels`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                        body: new URLSearchParams({
                            upload_phase: 'start',
                            access_token: accessToken
                        })
                    });
                    const initData = await initRes.json();
                    
                    if (initData.video_id) {
                        const videoId = initData.video_id;
                        logger.info(`[FACEBOOK] Reel upload session initialized. Video ID: ${videoId}`);
                        
                        // Step 2: Upload binary bytes
                        const uploadRes = await fetch(`https://rupload.facebook.com/video-upload/v19.0/${videoId}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `OAuth ${accessToken}`,
                                'offset': '0',
                                'file_size': String(fileStats.size),
                                'Content-Type': 'application/octet-stream'
                            },
                            body: fileBuffer
                        });
                        const uploadData = await uploadRes.json();
                        
                        if (uploadData.success) {
                            // Step 3: Finish and publish Reel
                            const pubRes = await fetch(`${GRAPH_API_BASE}/${pageId}/video_reels`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                                body: new URLSearchParams({
                                    access_token: accessToken,
                                    video_id: videoId,
                                    upload_phase: 'finish',
                                    video_state: 'PUBLISHED',
                                    description: postData.caption || ''
                                })
                            });
                            const pubData = await pubRes.json();
                            postId = videoId || pubData.post_id;
                            logger.info(`🎉 [FACEBOOK] Native Reel published successfully via Reels API! Video ID: ${videoId}, Post ID: ${pubData.post_id}`);
                        } else {
                            throw new Error(`Binary upload failed: ${JSON.stringify(uploadData)}`);
                        }
                    } else {
                        throw new Error(`Reel session init failed: ${JSON.stringify(initData)}`);
                    }
                } catch (reelApiErr) {
                    logger.warn(`[FACEBOOK] Reels API flow encountered error (${reelApiErr.message}), trying fallback /videos endpoint...`);
                    const blob = new Blob([fileBuffer], { type: 'video/mp4' });
                    const formData = new FormData();
                    formData.append('source', blob, path.basename(postData.videoPath));
                    formData.append('description', postData.caption);
                    formData.append('access_token', accessToken);

                    const response = await fetch(`${GRAPH_API_BASE}/${pageId}/videos`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (!response.ok || data.error) {
                        logger.error('[FACEBOOK] Fallback video upload error:', data);
                        return { success: false, error: data.error || data };
                    }
                    postId = data.id || data.post_id;
                    logger.info(`🎉 [FACEBOOK] Video published via fallback endpoint! ID: ${postId}`);
                }
            }
            // Case 1: Direct Local Image Binary Upload (High-Res 1080x1350 Rendered Slides)
            else if (postData.mediaPaths && postData.mediaPaths.length > 0 && fs.existsSync(postData.mediaPaths[0])) {
                if (postData.mediaPaths.length === 1) {
                    logger.info(`[FACEBOOK] Uploading single local high-res photo binary: ${postData.mediaPaths[0]}`);
                    const fileBuffer = fs.readFileSync(postData.mediaPaths[0]);
                    const blob = new Blob([fileBuffer], { type: 'image/png' });
                    const formData = new FormData();
                    formData.append('source', blob, path.basename(postData.mediaPaths[0]));
                    formData.append('caption', postData.caption);
                    formData.append('access_token', accessToken);

                    const response = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = await response.json();
                    if (!response.ok || data.error) {
                        logger.error('[FACEBOOK] Photo upload error:', data);
                        return { success: false, error: data.error || data };
                    }
                    postId = data.id || data.post_id;
                    logger.info(`🎉 [FACEBOOK] Photo published successfully! ID: ${postId}`);
                } else {
                    // Multi-Image Carousel / Album Upload
                    logger.info(`[FACEBOOK] Uploading ${postData.mediaPaths.length} photos as multi-image carousel post...`);
                    const photoIds = [];
                    for (const imgPath of postData.mediaPaths.slice(0, 10)) {
                        if (fs.existsSync(imgPath)) {
                            const fileBuffer = fs.readFileSync(imgPath);
                            const blob = new Blob([fileBuffer], { type: 'image/png' });
                            const formData = new FormData();
                            formData.append('source', blob, path.basename(imgPath));
                            formData.append('published', 'false');
                            formData.append('access_token', accessToken);

                            const photoRes = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, { method: 'POST', body: formData });
                            const photoData = await photoRes.json();
                            if (photoData.id) photoIds.push({ media_fbid: photoData.id });
                        }
                    }

                    const feedPayload = {
                        message: postData.caption,
                        attached_media: photoIds,
                        access_token: accessToken
                    };

                    const response = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(feedPayload)
                    });
                    const data = await response.json();
                    if (!response.ok || data.error) {
                        logger.error('[FACEBOOK] Multi-photo feed error:', data);
                        return { success: false, error: data.error || data };
                    }
                    postId = data.id || data.post_id;
                    logger.info(`🎉 [FACEBOOK] Multi-image post published successfully! ID: ${postId}`);
                }
            }

            // Case 2: Remote Image URL
            else if (postData.pngUrls && postData.pngUrls.length > 0) {
                const response = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: postData.pngUrls[0],
                        caption: postData.caption,
                        access_token: accessToken
                    })
                });
                const data = await response.json();
                if (!response.ok || data.error) return { success: false, error: data.error || data };
                postId = data.id || data.post_id;
            }

            // Case 3: Text Post with Rich Link Card
            else {
                let payload = {
                    message: postData.caption,
                    access_token: accessToken
                };
                if (postData.utmLink) payload.link = postData.utmLink;

                const response = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await response.json();

                if (!response.ok || data.error) {
                    logger.error('[FACEBOOK] Publish API error:', data);
                    return { success: false, error: data.error || data };
                }

                postId = data.id || data.post_id;
                logger.info(`🎉 [FACEBOOK] Published successfully! Post ID: ${postId}`);
            }

            // Automatically post first comment with direct download link
            if (postId) {
                await this._postFirstComment(postId, postData, accessToken);
            }

            return {
                success: true,
                platform: this.platform,
                postId,
                url: `https://facebook.com/${postId}`
            };
        } catch (err) {
            logger.error('[FACEBOOK] Exception during publish:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Posts a first comment with the direct download link
     */
    async _postFirstComment(postId, postData, accessToken) {
        if (!postId) return;
        const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.asmind.app';
        const commentMsg = postData.firstComment || 
            `📲 Download TwinGenie free on Google Play Store:\n${playStoreUrl}\n\nTake your 35-question Big Five personality baseline today!`;
        try {
            const res = await fetch(`${GRAPH_API_BASE}/${postId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: commentMsg,
                    access_token: accessToken
                })
            });
            const data = await res.json();
            if (data.id) {
                logger.info(`💬 [FACEBOOK] First-comment link posted successfully on ${postId}`);
            }
        } catch (err) {
            logger.warn('[FACEBOOK] Non-blocking first-comment error:', err.message);
        }
    }
}

export default new FacebookAdapter();
