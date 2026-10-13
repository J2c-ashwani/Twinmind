import fetch from 'node-fetch';
import fs from 'fs';
import logger from '../../../config/logger.js';

/**
 * YouTube Publishing Adapter (YouTube Data API v3)
 * Supports YouTube Shorts (Vertical 9:16 Video Uploads), Resumable Uploads, and Automated OAuth Refresh.
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YOUTUBE_UPLOAD_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';

class YouTubeAdapter {
    constructor() {
        this.platform = 'youtube';
        this.cachedAccessToken = null;
        this.tokenExpiresAt = 0;
    }

    getCredentials() {
        return {
            clientId: process.env.YOUTUBE_CLIENT_ID,
            clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
            refreshToken: process.env.YOUTUBE_REFRESH_TOKEN
        };
    }

    isConfigured() {
        const { clientId, clientSecret, refreshToken } = this.getCredentials();
        return Boolean(clientId && clientSecret && refreshToken);
    }

    async getAccessToken() {
        const { clientId, clientSecret, refreshToken } = this.getCredentials();
        if (!clientId || !clientSecret || !refreshToken) return null;

        const now = Date.now();
        if (this.cachedAccessToken && this.tokenExpiresAt > now + 60000) {
            return this.cachedAccessToken;
        }

        try {
            const res = await fetch(GOOGLE_TOKEN_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: clientId,
                    client_secret: clientSecret,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                })
            });

            const data = await res.json();
            if (!res.ok || data.error) {
                logger.error('[YOUTUBE] Token refresh failed:', data);
                return null;
            }

            this.cachedAccessToken = data.access_token;
            this.tokenExpiresAt = now + (data.expires_in * 1000);
            return this.cachedAccessToken;
        } catch (e) {
            logger.error('[YOUTUBE] Exception during token refresh:', e);
            return null;
        }
    }

    async getHealthStatus() {
        const configured = this.isConfigured();
        if (!configured) {
            return {
                platform: this.platform,
                status: 'missing_credentials',
                ready: false,
                requiredEnv: ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN']
            };
        }

        const token = await this.getAccessToken();
        return {
            platform: this.platform,
            status: token ? 'connected' : 'refresh_token_invalid',
            ready: Boolean(token)
        };
    }

    /**
     * Publishes a video/Short to YouTube
     * @param {Object} postData - { title, description, videoPath }
     */
    async publish(postData) {
        if (!this.isConfigured()) {
            logger.warn(`[YOUTUBE] Credentials not set. Running in verified simulation mode.`);
            return {
                success: true,
                simulated: true,
                platform: this.platform,
                postId: `sim_yt_${Date.now()}`,
                url: `https://youtube.com/shorts/simulated_${Date.now()}`
            };
        }

        const accessToken = await this.getAccessToken();
        if (!accessToken) {
            return { success: false, error: 'Could not obtain YouTube access token' };
        }

        if (!postData.videoPath || !fs.existsSync(postData.videoPath)) {
            return { success: false, error: `Video file not found at ${postData.videoPath}` };
        }

        logger.info(`[YOUTUBE] Uploading Short: "${postData.title}"...`);

        try {
            // Step 1: Initiate Resumable Upload Session
            const metadata = {
                snippet: {
                    title: postData.title.slice(0, 100),
                    description: postData.description,
                    tags: ['Shorts', 'TwinGenie', 'AI', 'PersonalGrowth', 'DigitalTwin'],
                    categoryId: '28' // Science & Technology
                },
                status: {
                    privacyStatus: 'public',
                    selfDeclaredMadeForKids: false
                }
            };

            const stats = fs.statSync(postData.videoPath);

            const initRes = await fetch(YOUTUBE_UPLOAD_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                    'X-Upload-Content-Length': stats.size.toString(),
                    'X-Upload-Content-Type': 'video/mp4'
                },
                body: JSON.stringify(metadata)
            });

            if (!initRes.ok) {
                const errData = await initRes.json();
                logger.error('[YOUTUBE] Init upload failed:', errData);
                return { success: false, error: errData };
            }

            const uploadUrl = initRes.headers.get('location');
            if (!uploadUrl) {
                return { success: false, error: 'No upload location header returned from YouTube' };
            }

            // Step 2: Stream Video Binary
            const videoStream = fs.createReadStream(postData.videoPath);
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Length': stats.size.toString(),
                    'Content-Type': 'video/mp4'
                },
                body: videoStream
            });

            const uploadData = await uploadRes.json();
            if (!uploadRes.ok || uploadData.error) {
                logger.error('[YOUTUBE] Video upload failed:', uploadData);
                return { success: false, error: uploadData.error || uploadData };
            }

            const videoId = uploadData.id;
            const shortUrl = `https://youtube.com/shorts/${videoId}`;
            logger.info(`🎉 [YOUTUBE] Published Short successfully! Video ID: ${videoId}`);

            return {
                success: true,
                platform: this.platform,
                postId: videoId,
                url: shortUrl
            };
        } catch (err) {
            logger.error('[YOUTUBE] Exception during upload:', err);
            return { success: false, error: err.message };
        }
    }
}

export default new YouTubeAdapter();
