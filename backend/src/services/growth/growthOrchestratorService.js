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
    /**
     * Retrieves the non-repeating rotational theme.
     * Uses deterministic calendar scheduling as the primary guarantee so server reboots never reset the rotation.
     */
    getNextRotationalTheme(platform, target = null) {
        const schedule = contentGeneratorService.getDailySchedule();
        logger.info(`🔄 [GROWTH ORCHESTRATOR] Calendar schedule for ${platform} (${target || 'default'}): Day #${schedule.dayNumber} -> Theme "${schedule.theme.name}" (${schedule.theme.id})`);
        return schedule.theme;
    }

    /**
     * Dedicated Daily Facebook Publisher.
     * Alternates formats daily: Carousel vs Reel.
     * Prevents duplicate posts across server restarts by verifying directly against Meta Graph API.
     */
    async publishDailyFacebookReel(force = false, specificThemeId = null, specificFormat = null) {
        const now = new Date();
        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
        logger.info(`[GROWTH ORCHESTRATOR] Starting daily Facebook publication flow for ${todayIST}...`);

        // 1. Unless force=true, verify directly with Meta Graph API if already published today
        if (!force) {
            const alreadyPostedOnFB = await this.adapters.facebook.hasPublishedTodayIST();
            if (alreadyPostedOnFB) {
                logger.info(`[GROWTH ORCHESTRATOR] Facebook Page already has a post today (${todayIST}). Skipping duplicate.`);
                return { action: 'skipped', reason: 'already_published_today' };
            }
        }

        // 2. Get deterministic non-repeating theme and alternating format
        const schedule = contentGeneratorService.getDailySchedule(now);
        const theme = specificThemeId 
            ? (contentGeneratorService.themes.find(t => t.id === specificThemeId) || schedule.theme)
            : schedule.theme;

        const format = specificFormat || schedule.facebookFormat; // Alternates: Carousel vs Reel!
        const campaignId = `camp_${theme.id}_${Date.now()}`;
        const fbContent = contentGeneratorService._generateFacebookContent(theme, campaignId, format);
        const postId = `post_facebook_${Date.now()}`;

        logger.info(`[GROWTH ORCHESTRATOR] Facebook Scheduled: Theme="${theme.name}", Format="${format}"`);

        let renderedReel = null;
        let renderedCarousel = null;

        // 3. Render Media: Reel (with strict RAM limits) or Carousel
        if (format === 'reel') {
            try {
                logger.info(`[GROWTH ORCHESTRATOR] Rendering Low-RAM Reel for Facebook: "${theme.name}"...`);
                renderedReel = await mediaRendererService.renderReel({
                    campaignId,
                    postId,
                    hook: fbContent.title || theme.hook,
                    tag: fbContent.tag || theme.tag
                });
            } catch (reelErr) {
                logger.warn(`[GROWTH ORCHESTRATOR] Reel render failed (${reelErr.message}). Automatic failover to Carousel.`);
            }
        }

        // Always render carousel slides as primary (for carousel format) or guaranteed failover (if reel render fails)
        if (!renderedReel) {
            logger.info(`[GROWTH ORCHESTRATOR] Rendering Carousel slides for Facebook: "${theme.name}"...`);
            renderedCarousel = await mediaRendererService.renderCarousel({
                campaignId,
                postId,
                slides: fbContent.slides
            });
        }

        // 4. Publish to Facebook Page as Reel or Carousel with First Comment
        logger.info(`[GROWTH ORCHESTRATOR] Publishing ${renderedReel ? 'Reel' : 'Carousel'} directly to Facebook Page...`);
        const publishResult = await this.adapters.facebook.publish({
            title: fbContent.title,
            caption: fbContent.caption,
            firstComment: fbContent.firstComment,
            videoPath: renderedReel?.videoPath || null,
            mediaPaths: renderedCarousel?.pngPaths || [],
            format: renderedReel ? 'reel' : 'carousel'
        });

        // 5. Save to state
        const postRecord = {
            id: postId,
            campaignId,
            platform: 'facebook',
            format: renderedReel ? 'reel' : 'carousel',
            title: fbContent.title,
            caption: fbContent.caption,
            videoPath: renderedReel?.videoPath || null,
            mediaPaths: renderedCarousel?.pngPaths || [],
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
            format: postRecord.format,
            theme: theme.name,
            error: publishResult.error
        };
    }

    /**
     * Publishes today's high-converting PDF Carousel to Ashwani Kumar's LinkedIn Personal Profile.
     * Generates fresh content, renders 1080x1350 multi-page PDF document carousel, and dispatches to LinkedIn.
     * @param {boolean} force - If true, bypasses the duplicate post throttle
     */
    async publishDailyLinkedInPersonal(force = false, specificThemeId = null) {
        logger.info(`[GROWTH ORCHESTRATOR] Starting daily LinkedIn Personal Profile carousel flow (theme=${specificThemeId || 'auto'})...`);
        const now = new Date();
        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

        // 1. Verify against Supabase persistence + memory state to prevent duplicate posts across server restarts
        if (!force) {
            try {
                const { data: recent } = await supabaseAdmin
                    .from('usage_tracking')
                    .select('created_at')
                    .eq('action_type', 'growth_linkedin_personal')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (recent && recent.length > 0) {
                    const lastIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(recent[0].created_at));
                    if (lastIST === todayIST) {
                        logger.info(`[GROWTH ORCHESTRATOR] LinkedIn personal post already published today in Supabase tracking (${todayIST}). Skipping duplicate.`);
                        return { action: 'skipped', reason: 'already_published_today' };
                    }
                }
            } catch (dbCheckErr) {
                logger.warn('[GROWTH ORCHESTRATOR] Supabase date check warning:', dbCheckErr.message);
            }

            const alreadyPublishedInMemory = this.state.posts.some(p => {
                if (p.platform !== 'linkedin' || p.target !== 'personal' || p.status !== 'published' || !p.publishedAt) return false;
                const postDateIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(p.publishedAt));
                return postDateIST === todayIST;
            });
            if (alreadyPublishedInMemory) {
                logger.info(`[GROWTH ORCHESTRATOR] LinkedIn personal post already published today in local state (${todayIST}). Skipping duplicate.`);
                return { action: 'skipped', reason: 'already_published_today' };
            }
        }

        // 2. Get deterministic non-repeating theme for today
        const schedule = contentGeneratorService.getDailySchedule(now);
        const theme = specificThemeId
            ? (contentGeneratorService.themes.find(t => t.id === specificThemeId) || schedule.theme)
            : schedule.theme;

        const campaignId = `camp_${theme.id}_${Date.now()}`;
        const content = contentGeneratorService._generateLinkedInPersonalContent(theme, campaignId);
        const postId = `post_linkedin_personal_${Date.now()}`;

        logger.info(`[GROWTH ORCHESTRATOR] Today's LinkedIn Theme: "${theme.name}" (${theme.id})`);

        // 3. Render 1080x1350 Multi-Page PDF Carousel
        logger.info(`[GROWTH ORCHESTRATOR] Rendering Carousel & PDF for Ashwani Kumar's LinkedIn: "${theme.name}"...`);
        const rendered = await mediaRendererService.renderCarousel({
            campaignId,
            postId,
            slides: content.slides
        });

        // 4. Publish to LinkedIn via official API
        logger.info(`[GROWTH ORCHESTRATOR] Dispatching PDF document carousel to LinkedIn personal profile...`);
        const publishResult = await this.adapters.linkedin.publish({
            title: content.title,
            caption: content.caption,
            pdfPath: rendered.pdfPath,
            pngPaths: rendered.pngPaths,
            utmLink: content.utmLink,
            target: 'personal'
        });

        // 5. Track published timestamp in Supabase (persists across Render container restarts)
        if (publishResult.success) {
            try {
                const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
                if (users && users.length > 0) {
                    const nowIso = now.toISOString();
                    await supabaseAdmin.from('usage_tracking').insert({
                        user_id: users[0].id,
                        action_type: 'growth_linkedin_personal',
                        count: 1,
                        period_start: nowIso,
                        period_end: nowIso,
                        created_at: nowIso
                    });
                }
            } catch (dbLogErr) {
                logger.warn('[GROWTH ORCHESTRATOR] Supabase log warning:', dbLogErr.message);
            }
        }

        // 6. Save to local state
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
            theme: theme.name,
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
