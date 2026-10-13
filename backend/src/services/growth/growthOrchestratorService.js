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

        // Schedule times for today or tomorrow (IST slots: 09:00, 13:00, 16:00, 19:00)
        // Convert to upcoming timestamps
        const now = new Date();
        const istOffsetHours = 5.5; // IST is UTC+5:30

        const slotTimes = {
            linkedin: { hour: 9, minute: 0 },
            instagram: { hour: 13, minute: 0 },
            facebook: { hour: 16, minute: 0 },
            youtube: { hour: 19, minute: 0 }
        };

        for (const [platform, postSpec] of Object.entries(bundle.posts)) {
            const postId = `post_${platform}_${Date.now()}`;
            let mediaPaths = [];
            let pdfPath = null;
            let pngUrls = [];

            // Render carousel media for LinkedIn, Instagram, and Facebook if slides provided
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
            const slot = slotTimes[platform] || { hour: 12, minute: 0 };
            const scheduledDate = new Date();
            scheduledDate.setHours(slot.hour, slot.minute, 0, 0);
            if (scheduledDate < now) {
                // If time has passed today, schedule for tomorrow
                scheduledDate.setDate(scheduledDate.getDate() + 1);
            }

            const postRecord = {
                id: postId,
                campaignId: bundle.campaignId,
                platform,
                format: postSpec.format,
                title: postSpec.title,
                caption: postSpec.caption,
                utmLink: postSpec.utmLink,
                mediaPaths,
                pngUrls,
                pdfPath,
                videoPath: postSpec.videoPath || path.join(__dirname, '../../../../twingenie_ugc_ad.mp4'),
                scheduledFor: scheduledDate.toISOString(),
                status: 'scheduled',
                retries: 0,
                platformPostId: null,
                platformPostUrl: null,
                publishedAt: null,
                error: null
            };

            this.state.posts.push(postRecord);
            logger.info(`📅 [GROWTH ORCHESTRATOR] Scheduled ${platform} post for ${scheduledDate.toISOString()}`);
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
                utmLink: post.utmLink,
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
}

const growthOrchestratorService = new GrowthOrchestratorService();
export default growthOrchestratorService;
