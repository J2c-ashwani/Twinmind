import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../config/logger.js';
import contentGeneratorService from './contentGeneratorService.js';
import mediaRendererService from './mediaRendererService.js';
import linkedinAdapter from './adapters/linkedinAdapter.js';
import instagramAdapter from './adapters/instagramAdapter.js';
import facebookAdapter from './adapters/facebookAdapter.js';
import youtubeAdapter from './adapters/youtubeAdapter.js';
import { supabaseAdmin } from '../../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE_PATH = path.join(__dirname, '../../../logs/growth_orchestrator_state.json');

class GrowthOrchestratorService {
    constructor() {
        this.adapters = {
            linkedin: linkedinAdapter,
            instagram: instagramAdapter,
            facebook: facebookAdapter,
            youtube: youtubeAdapter
        };
        this.state = this._loadState();
    }

    _loadState() {
        try {
            if (fs.existsSync(STATE_FILE_PATH)) {
                return JSON.parse(fs.readFileSync(STATE_FILE_PATH, 'utf8'));
            }
        } catch (e) {
            logger.warn('[GROWTH ORCHESTRATOR] Initializing fresh state file:', e.message);
        }

        const initial = {
            campaigns: [],
            posts: [],
            isPaused: false,
            lastRunTimestamp: null
        };
        this._saveState(initial);
        return initial;
    }

    _saveState(state = this.state) {
        try {
            const dir = path.dirname(STATE_FILE_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
        } catch (e) {
            logger.error('[GROWTH ORCHESTRATOR] Error writing state file:', e);
        }
    }

    async getSystemStatus() {
        const adapterHealth = {};
        for (const [name, adapter] of Object.entries(this.adapters)) {
            adapterHealth[name] = await adapter.getHealthStatus();
        }

        const scheduledCount = this.state.posts.filter(p => p.status === 'scheduled').length;
        const publishedCount = this.state.posts.filter(p => p.status === 'published').length;
        const failedCount = this.state.posts.filter(p => p.status === 'failed').length;

        return {
            isPaused: this.state.isPaused || process.env.GROWTH_AUTORUN === 'false',
            adapters: adapterHealth,
            queueSummary: {
                totalCampaigns: this.state.campaigns.length,
                scheduled: scheduledCount,
                published: publishedCount,
                failed: failedCount
            },
            recentPosts: this.state.posts.slice(-10)
        };
    }

    /**
     * Generates a complete daily campaign bundle across all 4 platforms,
     * renders media assets (Carousels & PDFs), and schedules posts.
     */
    async generateAndQueueDailyCampaign(themeId = null) {
        logger.info('[GROWTH ORCHESTRATOR] Generating new 4-platform campaign bundle...');
        const bundle = await contentGeneratorService.generateCampaignBundle(themeId);

        const campaignRecord = {
            id: bundle.campaignId,
            theme: bundle.theme,
            createdAt: new Date().toISOString(),
            status: 'active'
        };
        this.state.campaigns.push(campaignRecord);

        // Convert target IST slots to UTC (UTC = IST - 5:30):
        // LinkedIn: 10:00 AM IST -> 04:30 UTC
        // Instagram: 01:30 PM IST -> 08:00 UTC
        // Facebook: 04:00 PM IST -> 10:30 UTC
        // Slot times in UTC:
        // LinkedIn: 04:00 PM IST -> 10:30 UTC
        // Instagram: 01:30 PM IST -> 08:00 UTC
        // Facebook: 04:00 PM IST -> 10:30 UTC
        // YouTube: 07:00 PM IST -> 13:30 UTC
        const now = new Date();
        const slotTimes = {
            linkedin: { hour: 10, minute: 30 },
            instagram: { hour: 8, minute: 0 },
            facebook: { hour: 10, minute: 30 },
            youtube: { hour: 13, minute: 30 }
        };

        for (const [platform, postSpec] of Object.entries(bundle.posts)) {
            // Memory Safeguard: Only render media for active, configured platforms
            const adapter = this.adapters[platform];
            if (!adapter || !adapter.isConfigured()) {
                logger.info(`[GROWTH ORCHESTRATOR] Skipping media rendering for ${platform} (credentials not configured).`);
                continue;
            }

            const postId = `post_${platform}_${Date.now()}`;
            let mediaPaths = [];
            let pdfPath = null;
            let pngUrls = [];
            let videoPath = null;
            let videoUrl = null;

            // Render lightweight carousel media (Pillow <25MB RAM) for active platforms (LinkedIn & Facebook)
            if (postSpec.slides && postSpec.slides.length > 0) {
                try {
                    logger.info(`[GROWTH ORCHESTRATOR] Rendering carousel assets for ${platform}...`);
                    const rendered = await mediaRendererService.renderCarousel({
                        campaignId: bundle.campaignId,
                        postId,
                        slides: postSpec.slides
                    });
                    mediaPaths = rendered.pngPaths;
                    pdfPath = rendered.pdfPath;
                    pngUrls = rendered.pngUrls;
                } catch (renderErr) {
                    logger.error(`[GROWTH ORCHESTRATOR] Asset rendering error for ${platform}:`, renderErr);
                }
            }

            // Target scheduled timestamp
            const slot = slotTimes[platform] || { hour: 10, minute: 30 };
            const scheduledDate = new Date();
            scheduledDate.setUTCHours(slot.hour, slot.minute, 0, 0);

            // Check if platform has already had a published post today (IST calendar day)
            const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
            const recentPublished = this.state.posts.some(p => {
                if (p.platform !== platform || p.status !== 'published' || !p.publishedAt) return false;
                const postDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(p.publishedAt));
                return postDateIST === todayIST;
            });

            // If no post has been published today for this platform, schedule for immediate dispatch
            if (!recentPublished) {
                scheduledDate.setTime(now.getTime() - 1000); // Due now!
                logger.info(`⚡ [GROWTH ORCHESTRATOR] No post published today for ${platform}. Queuing for immediate dispatch.`);
            } else if (scheduledDate < now) {
                // If today's slot has passed and post was already published today, schedule for tomorrow
                scheduledDate.setUTCDate(scheduledDate.getUTCDate() + 1);
            }

            const postRecord = {
                id: postId,
                campaignId: bundle.campaignId,
                platform,
                target: platform === 'linkedin' ? 'personal' : undefined,
                format: postSpec.format,
                title: postSpec.title,
                caption: postSpec.caption,
                firstComment: postSpec.firstComment,
                utmLink: postSpec.utmLink,
                mediaPaths,
                pngUrls,
                pdfPath,
                videoPath,
                videoUrl,
                scheduledFor: scheduledDate.toISOString(),
                status: 'scheduled',
                retries: 0,
                platformPostId: null,
                platformPostUrl: null,
                publishedAt: null,
                error: null
            };

            this.state.posts.push(postRecord);
            logger.info(`📅 [GROWTH ORCHESTRATOR] Scheduled ${platform} (${postSpec.format}) post for ${scheduledDate.toISOString()}`);
        }

        this._saveState();
        return {
            campaignId: bundle.campaignId,
            theme: bundle.theme,
            postsScheduled: Object.keys(bundle.posts).length
        };
    }

    /**
     * Executes scheduled posts that are due
     */
    async processScheduledPosts() {
        if (this.state.isPaused || process.env.GROWTH_AUTORUN === 'false') {
            logger.info('[GROWTH ORCHESTRATOR] Execution paused via flag');
            return { action: 'paused' };
        }

        const now = new Date();
        const duePosts = this.state.posts.filter(p => p.status === 'scheduled' && new Date(p.scheduledFor) <= now);

        if (duePosts.length === 0) {
            return { action: 'idle', dueCount: 0 };
        }

        logger.info(`[GROWTH ORCHESTRATOR] Processing ${duePosts.length} due posts...`);
        const results = [];

        for (const post of duePosts) {
            const res = await this.publishPostNow(post.id);
            results.push(res);
        }

        return { action: 'processed', results };
    }

    /**
     * Publishes a single post immediately
     */
    async publishPostNow(postId) {
        const post = this.state.posts.find(p => p.id === postId);
        if (!post) {
            throw new Error(`Post with ID ${postId} not found`);
        }

        const adapter = this.adapters[post.platform];
        if (!adapter) {
            throw new Error(`No adapter found for platform ${post.platform}`);
        }

        post.status = 'publishing';
        this._saveState();

        try {
            logger.info(`[GROWTH ORCHESTRATOR] Dispatching ${post.id} to ${post.platform} adapter...`);
            const publishResult = await adapter.publish({
                title: post.title,
                caption: post.caption,
                target: post.target || (post.platform === 'linkedin' ? 'personal' : undefined),
                firstComment: post.firstComment,
                utmLink: post.utmLink,
                mediaPaths: post.mediaPaths || [],
                pdfPath: post.pdfPath,
                pngUrls: post.pngUrls || [],
                videoUrl: post.videoUrl,
                videoPath: post.videoPath,
                format: post.format
            });

            if (publishResult.success) {
                post.status = 'published';
                post.publishedAt = new Date().toISOString();
                post.platformPostId = publishResult.postId;
                post.platformPostUrl = publishResult.url;
                post.error = null;
                logger.info(`🎉 [GROWTH ORCHESTRATOR] ${post.platform} post live at: ${publishResult.url}`);
            } else {
                post.retries += 1;
                post.status = post.retries >= 3 ? 'failed' : 'scheduled';
                post.error = publishResult.error;
                logger.error(`❌ [GROWTH ORCHESTRATOR] Publish failed for ${post.id}:`, publishResult.error);
            }
        } catch (e) {
            post.retries += 1;
            post.status = post.retries >= 3 ? 'failed' : 'scheduled';
            post.error = e.message;
            logger.error(`❌ [GROWTH ORCHESTRATOR] Unexpected publish exception:`, e);
        }

        this._saveState();
        return { postId: post.id, status: post.status, url: post.platformPostUrl, error: post.error };
    }

    /**
     * Dedicated Daily Facebook Reel Publisher
     * Triggered by cron-job.org or internal scheduler at a fixed daily time.
     * Generates a fresh Reel, renders 8Mbps CBR video with Edge TTS voiceover,
     * and publishes directly to Facebook Reels.
     */
    /**
     * Determines the next theme in sequence to guarantee zero consecutive duplicate posts
     */
    getNextRotationalTheme(platform, target = null) {
        const themes = contentGeneratorService.themes || [];
        if (!themes || themes.length === 0) return { id: 'honest_mode', name: 'Normal vs Honest Twin' };

        const recentPosts = (this.state.posts || [])
            .filter(p => p.platform === platform && (!target || p.target === target) && p.status === 'published' && p.publishedAt)
            .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

        if (recentPosts.length === 0) {
            return themes[0];
        }

        const lastPost = recentPosts[0];
        const lastCampaignId = lastPost.campaignId || '';
        const lastTitle = (lastPost.title || '').toLowerCase();

        const lastIndex = themes.findIndex(t => 
            lastCampaignId.includes(t.id) || 
            lastTitle.includes(t.name.toLowerCase()) ||
            lastTitle.includes((t.tag || '').toLowerCase())
        );

        if (lastIndex === -1) {
            return themes[0];
        }

        const nextIndex = (lastIndex + 1) % themes.length;
        logger.info(`🔄 [GROWTH ORCHESTRATOR] Rotated theme for ${platform} (${target || 'default'}): "${themes[lastIndex].name}" -> "${themes[nextIndex].name}"`);
        return themes[nextIndex];
    }

    /**
     * Dedicated Daily Facebook Carousel Publisher
     */
    async publishDailyFacebookReel(force = false, specificThemeId = null) {
        logger.info(`[GROWTH ORCHESTRATOR] Starting daily Facebook Carousel publication flow (theme=${specificThemeId || 'auto'})...`);
        const now = new Date();

        // Unless force=true, ensure we haven't already published a Facebook Reel today (IST calendar day)
        if (!force) {
            const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
            const alreadyPublishedToday = this.state.posts.some(p => {
                if (p.platform !== 'facebook' || p.status !== 'published' || !p.publishedAt) return false;
                const postDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(p.publishedAt));
                return postDateIST === todayIST;
            });
            if (alreadyPublishedToday) {
                logger.info(`[GROWTH ORCHESTRATOR] Facebook Reel already published today (${todayIST}). Skipping.`);
                return { action: 'skipped', reason: 'already_published_today' };
            }
        }

        // 1. Get next rotated or specific theme for Facebook
        const theme = specificThemeId 
            ? (contentGeneratorService.themes.find(t => t.id === specificThemeId) || this.getNextRotationalTheme('facebook'))
            : this.getNextRotationalTheme('facebook');
        const campaignId = `camp_${theme.id}_${Date.now()}`;
        const fbContent = contentGeneratorService._generateFacebookContent(theme, campaignId, 'carousel');

        const postId = `post_facebook_${Date.now()}`;

        // 2. Render High-Res Multi-Image Carousel (Lightweight Pillow, <25MB RAM, NO FFmpeg)
        logger.info(`[GROWTH ORCHESTRATOR] Rendering high-res Carousel slides for Facebook: "${theme.name}"...`);
        const renderedCarousel = await mediaRendererService.renderCarousel({
            campaignId,
            postId,
            slides: fbContent.slides
        });

        // 3. Publish to Facebook Page as Multi-Image Carousel with First Comment
        logger.info(`[GROWTH ORCHESTRATOR] Publishing Carousel directly to Facebook Page...`);
        const publishResult = await this.adapters.facebook.publish({
            title: fbContent.title,
            caption: fbContent.caption,
            firstComment: fbContent.firstComment,
            mediaPaths: renderedCarousel.pngPaths,
            format: 'carousel'
        });

        // 4. Save to state
        const postRecord = {
            id: postId,
            campaignId,
            platform: 'facebook',
            format: 'carousel',
            title: fbContent.title,
            caption: fbContent.caption,
            videoPath: null,
            videoUrl: null,
            mediaPaths: renderedCarousel.pngPaths,
            status: publishResult.success ? 'published' : 'failed',
            scheduledFor: now.toISOString(),
            publishedAt: publishResult.success ? now.toISOString() : null,
            platformPostId: publishResult.postId,
            platformPostUrl: publishResult.url,
            error: publishResult.error || null,
            retries: 0
        };

        this.state.posts.push(postRecord);
        this._saveState();

        return {
            success: publishResult.success,
            postId: postRecord.id,
            platformPostId: publishResult.postId,
            url: publishResult.url,
            totalSlides: renderedCarousel.totalSlides,
            error: publishResult.error
        };
    }

    /**
     * Publishes today's high-converting PDF Carousel to Ashwani Kumar's LinkedIn Personal Profile.
     * Generates fresh content, renders 1080x1350 multi-page PDF document carousel, and dispatches to LinkedIn.
     * @param {boolean} force - If true, bypasses the 18-hour duplicate post throttle
     */
    async publishDailyLinkedInPersonal(force = false, specificThemeId = null) {
        logger.info(`[GROWTH ORCHESTRATOR] Starting daily LinkedIn Personal Profile carousel flow (theme=${specificThemeId || 'auto'})...`);
        const now = new Date();

        if (!force) {
            const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
            const alreadyPublishedToday = this.state.posts.some(p => {
                if (p.platform !== 'linkedin' || p.target !== 'personal' || p.status !== 'published' || !p.publishedAt) return false;
                const postDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(p.publishedAt));
                return postDateIST === todayIST;
            });
            if (alreadyPublishedToday) {
                logger.info(`[GROWTH ORCHESTRATOR] LinkedIn personal post already published today (${todayIST}). Skipping.`);
                return { action: 'skipped', reason: 'already_published_today' };
            }
        }

        // 1. Get rotated or specific theme for Ashwani Kumar's Personal Profile (guaranteed non-repeating)
        const theme = specificThemeId
            ? (contentGeneratorService.themes.find(t => t.id === specificThemeId) || this.getNextRotationalTheme('linkedin', 'personal'))
            : this.getNextRotationalTheme('linkedin', 'personal');
        const campaignId = `camp_${theme.id}_${Date.now()}`;
        const content = contentGeneratorService._generateLinkedInPersonalContent(theme, campaignId);

        const postId = `post_linkedin_personal_${Date.now()}`;

        // 2. Render 1080x1350 Multi-Page PDF Carousel
        logger.info(`[GROWTH ORCHESTRATOR] Rendering Carousel & PDF for Ashwani Kumar's LinkedIn: "${theme.name}"...`);
        const rendered = await mediaRendererService.renderCarousel({
            campaignId,
            postId,
            slides: content.slides
        });

        // 3. Publish to LinkedIn via official API
        logger.info(`[GROWTH ORCHESTRATOR] Dispatching PDF document carousel to LinkedIn personal profile...`);
        const publishResult = await this.adapters.linkedin.publish({
            title: content.title,
            caption: content.caption,
            pdfPath: rendered.pdfPath,
            pngPaths: rendered.pngPaths,
            utmLink: content.utmLink,
            target: 'personal'
        });

        // 4. Save to state
        const postRecord = {
            id: postId,
            campaignId,
            platform: 'linkedin',
            target: 'personal',
            format: 'carousel_pdf',
            title: content.title,
            caption: content.caption,
            pdfPath: rendered.pdfPath,
            pngPaths: rendered.pngPaths,
            status: publishResult.success ? 'published' : 'failed',
            scheduledFor: now.toISOString(),
            publishedAt: publishResult.success ? now.toISOString() : null,
            platformPostId: publishResult.postId,
            platformPostUrl: publishResult.url,
            error: publishResult.error || null,
            retries: 0
        };

        this.state.posts.push(postRecord);
        this._saveState();

        return {
            success: publishResult.success,
            postId: postRecord.id,
            platformPostId: publishResult.postId,
            url: publishResult.url,
            totalSlides: rendered.totalSlides,
            pdfPath: rendered.pdfPath,
            error: publishResult.error
        };
    }

    /**
     * Unified Daily Broadcast: Dispatches both Facebook Reel & LinkedIn Personal Carousel at 4:00 PM IST.
     * @param {boolean} force - Force publish even if already published today
     */
    async publishDailyBroadcast(force = false) {
        logger.info(`🚀 [GROWTH ORCHESTRATOR] Initiating Unified Daily Broadcast (Facebook Reel + LinkedIn Personal Carousel, force=${force})...`);
        const results = {
            timestamp: new Date().toISOString(),
            facebook: null,
            linkedin: null
        };

        try {
            results.facebook = await this.publishDailyFacebookReel(force);
        } catch (fbErr) {
            logger.error('[GROWTH ORCHESTRATOR] Daily Facebook publish failed:', fbErr);
            results.facebook = { success: false, error: fbErr.message };
        }

        try {
            results.linkedin = await this.publishDailyLinkedInPersonal(force);
        } catch (liErr) {
            logger.error('[GROWTH ORCHESTRATOR] Daily LinkedIn publish failed:', liErr);
            results.linkedin = { success: false, error: liErr.message };
        }

        logger.info(`✅ [GROWTH ORCHESTRATOR] Unified Daily Broadcast finished: FB success=${results.facebook?.success}, LI success=${results.linkedin?.success}`);
        return results;
    }
}

const growthOrchestratorService = new GrowthOrchestratorService();
export default growthOrchestratorService;
