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
import threadsAdapter from './adapters/threadsAdapter.js';
import publicationSlotService, { SlotStatus } from './publicationSlotService.js';
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
            youtube: youtubeAdapter,
            threads: threadsAdapter
        };
        this.state = this._loadState();
        // In-flight mutex locks to prevent race-condition duplicate posts
        this._publishingLocks = {
            facebook: false,
            linkedin: false,
            instagram: false,
            threads: false
        };
        // Short-term execution timestamps for debounce protection
        this._lastPublishedTimestamps = {
            facebook: 0,
            linkedin: 0,
            instagram: 0,
            threads: 0
        };
        // A/B pair-matched experiment buckets
        this._matchedPairBuckets = {};
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

    /**
     * Pair-matched A/B experiment assignment for LinkedIn link placement.
     * Confounding factors controlled:
     * 1. Topic Category / Pillar (Psychology vs Generic AI vs Product Demo)
     * 2. Format (Carousel PDF)
     * 
     * Eliminates naive odd/even day-of-week bias by alternating arms
     * strictly within each (pillar, format) matched pair.
     * 
     * Sample size reality: At 1 post/day for 30 days = 15 Arm A, 15 Arm B (n=30).
     * Explicitly labeled as an exploratory directional experiment.
     */
    getExperimentAssignment({ pillarId = 'pillar_1_psychology', format = 'carousel_pdf', themeId = 'daily', dayNumber = 0 } = {}) {
        // Rollback check: if experiment v2 is disabled, revert to legacy behavior
        if (process.env.LINKEDIN_CONTENT_EXPERIMENT_V2 === 'false') {
            const legacyUtm = 'https://play.google.com/store/apps/details?id=com.asmind.app';
            return {
                arm: 'legacy',
                includeCaptionLink: true,
                skipFirstComment: false,
                utmLink: legacyUtm,
                firstComment: null,
                bucketKey: 'legacy',
                sampleStatus: 'legacy_production'
            };
        }

        const bucketKey = `${pillarId}:${format}`;
        if (!this._matchedPairBuckets) {
            this._matchedPairBuckets = {};
        }

        // Check historical count in this bucket from state
        let bucketCount = this._matchedPairBuckets[bucketKey];
        if (typeof bucketCount !== 'number') {
            const historicalInBucket = (this.state?.posts || []).filter(p => 
                p.platform === 'linkedin' && 
                p.experiment?.matchedPairBucket === bucketKey
            ).length;
            bucketCount = historicalInBucket;
            this._matchedPairBuckets[bucketKey] = bucketCount;
        }

        // Pair-matched alternation within this bucket: Even count -> Arm A (Caption Link), Odd count -> Arm B (First Comment Link)
        const isArmA = (bucketCount % 2 === 0);
        const arm = isArmA ? 'arm_a_caption' : 'arm_b_comment';

        // Increment count for this bucket
        this._matchedPairBuckets[bucketKey] = bucketCount + 1;

        // Build accurate Play Store Install Referrer UTM URLs
        const basePlayStore = 'https://play.google.com/store/apps/details?id=com.asmind.app';
        const medium = isArmA ? 'post_caption' : 'first_comment';
        const referrerParams = `utm_source=linkedin&utm_medium=${medium}&utm_campaign=${pillarId}&utm_content=${themeId}`;
        const utmLink = `${basePlayStore}&referrer=${encodeURIComponent(referrerParams)}`;

        const firstComment = isArmA ? null : 
            `📲 Download TwinGenie free on Google Play:\n${utmLink}\n\nTake the 35-question cognitive baseline & explore your thoughts with 4 reflective modes.`;

        return {
            arm,
            bucketKey,
            bucketCount,
            includeCaptionLink: isArmA,
            skipFirstComment: isArmA, // Arm A skips first comment; Arm B posts first comment
            utmLink,
            firstComment,
            sampleStatus: 'exploratory_directional (target n=30 over 30 days)'
        };
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
     * Legacy queue generator - deprecated in favor of dedicated daily broadcasts
     */
    async generateAndQueueDailyCampaign(themeId = null) {
        logger.info('[GROWTH ORCHESTRATOR] generateAndQueueDailyCampaign called (queue is deprecated, broadcasts are direct).');
        return {
            action: 'deprecated',
            message: 'Queue auto-generation is deprecated in favor of direct dedicated broadcasts.'
        };
    }

    /**
     * Legacy queue processor - deprecated in favor of direct dedicated broadcasts
     */
    async processScheduledPosts() {
        // Clear any old scheduled posts from memory state to prevent stale publishing
        const remaining = this.state.posts.filter(p => p.status !== 'scheduled');
        if (remaining.length !== this.state.posts.length) {
            this.state.posts = remaining;
            this._saveState();
        }
        return { action: 'idle', dueCount: 0, message: 'Queue is deprecated. Dedicated daily broadcasts handle all publishing.' };
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
     * Checks if today's broadcast for the given platform is already locked or completed in Supabase.
     * Guarantees distributed idempotency across multiple containers, server restarts, and dual schedulers.
     * @param {string} platform - 'facebook' | 'linkedin' | 'instagram' | 'threads'
     * @param {string} todayIST - YYYY-MM-DD
     */
    async checkDurableLedger(platform, todayIST) {
        try {
            const ledgerKey = `growth_ledger:${platform}:${todayIST}`;
            const lockKey = `growth_lock:${platform}:${todayIST}`;

            // 1. Check if already successfully published today in durable ledger
            const { data: ledgerEntries } = await supabaseAdmin
                .from('usage_tracking')
                .select('id, created_at')
                .eq('action_type', ledgerKey)
                .limit(1);

            if (ledgerEntries && ledgerEntries.length > 0) {
                logger.info(`[GROWTH ORCHESTRATOR] Platform ${platform} already published today in durable ledger (${todayIST}). Skipping duplicate.`);
                return { isBlocked: true, reason: 'already_published_today' };
            }

            // 2. Also check legacy action_type format (e.g. growth_facebook) for todayIST
            const legacyType = `growth_${platform === 'linkedin' ? 'linkedin_personal' : platform}`;
            const { data: legacyEntries } = await supabaseAdmin
                .from('usage_tracking')
                .select('created_at')
                .eq('action_type', legacyType)
                .order('created_at', { ascending: false })
                .limit(1);

            if (legacyEntries && legacyEntries.length > 0) {
                const lastIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(legacyEntries[0].created_at));
                if (lastIST === todayIST) {
                    logger.info(`[GROWTH ORCHESTRATOR] Platform ${platform} already recorded today in legacy tracking (${todayIST}). Skipping duplicate.`);
                    return { isBlocked: true, reason: 'already_published_today' };
                }
            }

            // 3. Check if another concurrent process has an active distributed lock (< 15 min old)
            const { data: activeLocks } = await supabaseAdmin
                .from('usage_tracking')
                .select('id, created_at')
                .eq('action_type', lockKey)
                .order('created_at', { ascending: false })
                .limit(1);

            if (activeLocks && activeLocks.length > 0) {
                const lockAgeMs = Date.now() - new Date(activeLocks[0].created_at).getTime();
                if (lockAgeMs < 15 * 60 * 1000) {
                    logger.warn(`[GROWTH ORCHESTRATOR] Active distributed lock found for ${platform} (${Math.round(lockAgeMs / 1000)}s old). Another worker is publishing. Skipping.`);
                    return { isBlocked: true, reason: 'publish_in_progress' };
                }
            }

            return { isBlocked: false };
        } catch (err) {
            logger.warn(`[GROWTH ORCHESTRATOR] Durable ledger check warning for ${platform}:`, err.message);
            return { isBlocked: false };
        }
    }

    /**
     * Acquires a 15-minute distributed lease lock in Supabase before heavy processing
     */
    async acquireDurableLock(platform, todayIST) {
        try {
            const lockKey = `growth_lock:${platform}:${todayIST}`;
            const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
            if (users && users.length > 0) {
                const nowIso = new Date().toISOString();
                await supabaseAdmin.from('usage_tracking').insert({
                    user_id: users[0].id,
                    action_type: lockKey,
                    count: 1,
                    period_start: nowIso,
                    period_end: nowIso,
                    created_at: nowIso
                });
                logger.info(`🔒 [GROWTH ORCHESTRATOR] Acquired durable distributed lock: ${lockKey}`);
            }
        } catch (err) {
            logger.warn(`[GROWTH ORCHESTRATOR] Failed to acquire durable lock for ${platform}:`, err.message);
        }
    }

    /**
     * Releases the distributed lease lock (e.g. on failure so retries are never permanently blocked)
     */
    async releaseDurableLock(platform, todayIST) {
        try {
            const lockKey = `growth_lock:${platform}:${todayIST}`;
            await supabaseAdmin
                .from('usage_tracking')
                .delete()
                .eq('action_type', lockKey);
            logger.info(`🔓 [GROWTH ORCHESTRATOR] Released durable distributed lock: ${lockKey}`);
        } catch (err) {
            logger.warn(`[GROWTH ORCHESTRATOR] Failed to release durable lock for ${platform}:`, err.message);
        }
    }

    /**
     * Commits successful publication to the durable ledger in Supabase
     */
    async commitDurableLedger(platform, todayIST, postId, postUrl) {
        try {
            const ledgerKey = `growth_ledger:${platform}:${todayIST}`;
            const legacyType = `growth_${platform === 'linkedin' ? 'linkedin_personal' : platform}`;
            const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
            if (users && users.length > 0) {
                const nowIso = new Date().toISOString();
                await supabaseAdmin.from('usage_tracking').insert([
                    {
                        user_id: users[0].id,
                        action_type: ledgerKey,
                        count: 1,
                        period_start: nowIso,
                        period_end: nowIso,
                        created_at: nowIso
                    },
                    {
                        user_id: users[0].id,
                        action_type: legacyType,
                        count: 1,
                        period_start: nowIso,
                        period_end: nowIso,
                        created_at: nowIso
                    }
                ]);
                logger.info(`📝 [GROWTH ORCHESTRATOR] Committed durable ledger record: ${ledgerKey} -> Post: ${postId}`);
            }
            await this.releaseDurableLock(platform, todayIST);
        } catch (err) {
            logger.warn(`[GROWTH ORCHESTRATOR] Failed to commit durable ledger for ${platform}:`, err.message);
        }
    }

    /**
     * Determines the next theme in sequence to guarantee zero consecutive duplicate posts
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
     * Generates 100% fresh, AI-powered non-repeating daily content.
     */
    async publishDailyFacebookReel(force = false, specificThemeId = null, specificFormat = null) {
        const now = new Date();
        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
        logger.info(`[GROWTH ORCHESTRATOR] Starting daily Facebook publication flow for ${todayIST}...`);

        // 1. Mutex Concurrency Lock: Prevent simultaneous executions in this process
        if (this._publishingLocks.facebook) {
            logger.warn(`[GROWTH ORCHESTRATOR] Facebook publication already in progress! Rejecting duplicate concurrent trigger.`);
            return { action: 'skipped', reason: 'publish_in_progress' };
        }

        // 2. Debounce Cooldown: If published within the last 15 minutes, skip immediately
        if (!force && this._lastPublishedTimestamps.facebook && (Date.now() - this._lastPublishedTimestamps.facebook < 15 * 60 * 1000)) {
            logger.info(`[GROWTH ORCHESTRATOR] Facebook post published within the last 15 minutes. Skipping duplicate.`);
            return { action: 'skipped', reason: 'recently_published' };
        }

        // 3. Durable Distributed Idempotency Ledger Check (Supabase + Meta Graph API)
        if (!force) {
            const ledgerCheck = await this.checkDurableLedger('facebook', todayIST);
            if (ledgerCheck.isBlocked) {
                return { action: 'skipped', reason: ledgerCheck.reason };
            }

            const alreadyPostedOnFB = await this.adapters.facebook.hasPublishedTodayIST();
            if (alreadyPostedOnFB) {
                logger.info(`[GROWTH ORCHESTRATOR] Facebook Page already has a post today (${todayIST}). Skipping duplicate.`);
                return { action: 'skipped', reason: 'already_published_today' };
            }
        }

        // Acquire persistent slot lease (State: RENDERING)
        const slotClaim = await publicationSlotService.claimSlot({
            platform: 'facebook',
            slotDate: todayIST,
            slotIndex: 1,
            force
        });
        if (!slotClaim.granted && !force) {
            logger.warn(`[GROWTH ORCHESTRATOR] Facebook publication skipped: slot claim not granted (${slotClaim.reason})`);
            return { action: 'skipped', reason: slotClaim.reason };
        }

        // Acquire process lock and durable distributed lock
        this._publishingLocks.facebook = true;
        await this.acquireDurableLock('facebook', todayIST);

        try {
            // 4. Fetch or dynamically generate today's 100% fresh content
            const dailyPackage = await contentGeneratorService.getOrGenerateDailyContent(now);
            const format = specificFormat || 'reel'; // 100% Reels for maximum organic reach and app downloads!
            const campaignId = `camp_${dailyPackage.themeId || 'daily'}_${Date.now()}`;
            const postId = `post_facebook_${Date.now()}`;

            logger.info(`[GROWTH ORCHESTRATOR] Facebook Scheduled: Topic="${dailyPackage.topic}", Format="${format}"`);

            let renderedReel = null;
            let renderedCarousel = null;

            // 5. Render Media: Reel (with strict RAM limits) or Carousel
            if (format === 'reel') {
                try {
                    logger.info(`[GROWTH ORCHESTRATOR] Rendering Low-RAM Reel for Facebook: "${dailyPackage.topic}" (${dailyPackage.modeName || 'Honest Twin'}, Format: ${dailyPackage.formatType || 'split'})...`);
                    renderedReel = await mediaRendererService.renderReel({
                        campaignId,
                        postId,
                        format_type: dailyPackage.formatType || 'split',
                        mode: dailyPackage.mode || 'dark',
                        modeName: dailyPackage.modeName || 'Honest / Dark Twin',
                        hook: dailyPackage.facebook.title || dailyPackage.hook,
                        tag: dailyPackage.category || 'SELF-AWARENESS',
                        userExcuse: dailyPackage.chatDialogue?.userDilemma || dailyPackage.linkedin?.slides?.[2]?.left?.user,
                        botReply: dailyPackage.chatDialogue?.standardBotReply || dailyPackage.linkedin?.slides?.[2]?.left?.ai,
                        twinReply: dailyPackage.chatDialogue?.twinModeReply || dailyPackage.linkedin?.slides?.[2]?.right?.ai,
                        shift: dailyPackage.chatDialogue?.shift,
                        split_screen: true,
                        competitorName: dailyPackage.theme?.competitorName || dailyPackage.competitorName || 'ChatGPT',
                        competitorBadge: dailyPackage.theme?.competitorBadge || dailyPackage.competitorBadge || 'CHATGPT (OPENAI)',
                        competitorTag: dailyPackage.theme?.competitorTag || dailyPackage.competitorTag || 'THE YES-MAN',
                        competitorPill: dailyPackage.theme?.competitorPill || dailyPackage.competitorPill || 'CHATGPT • FLATTERY TRAP • ZERO MEMORY',
                        competitorHeader: dailyPackage.theme?.competitorHeader || dailyPackage.competitorHeader || 'WHAT CHATGPT SAYS (THE FLATTERY TRAP)',
                        voiceHook: dailyPackage.facebook.voiceScript?.voiceHook,
                        voiceProblem: dailyPackage.facebook.voiceScript?.voiceProblem,
                        voiceSolution: dailyPackage.facebook.voiceScript?.voiceSolution,
                        voiceCta: dailyPackage.facebook.voiceScript?.voiceCta
                    });
                } catch (reelErr) {
                    logger.warn(`[GROWTH ORCHESTRATOR] Reel render failed (${reelErr.message}). Automatic failover to Carousel.`);
                }
            }

            // Render carousel slides as primary (for carousel format) or guaranteed failover (if reel render fails)
            if (!renderedReel) {
                logger.info(`[GROWTH ORCHESTRATOR] Rendering Carousel slides for Facebook: "${dailyPackage.topic}"...`);
                renderedCarousel = await mediaRendererService.renderCarousel({
                    campaignId,
                    postId,
                    slides: dailyPackage.facebook.slides || dailyPackage.linkedin.slides
                });
            }

            // 6. Publish to Facebook Page as Reel or Carousel with First Comment
            logger.info(`[GROWTH ORCHESTRATOR] Publishing ${renderedReel ? 'Reel' : 'Carousel'} directly to Facebook Page...`);
            await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.PUBLISHING);
            let publishResult;
            try {
                publishResult = await this.adapters.facebook.publish({
                    title: dailyPackage.facebook.title,
                    caption: dailyPackage.facebook.caption,
                    firstComment: dailyPackage.facebook.firstComment,
                    videoPath: renderedReel?.videoPath || null,
                    mediaPaths: renderedCarousel?.pngPaths || [],
                    format: renderedReel ? 'reel' : 'carousel'
                });
            } catch (netErr) {
                logger.error(`[GROWTH ORCHESTRATOR] Ambiguous timeout during Facebook publish: ${netErr.message}. Triggering reconciliation...`);
                const rec = await publicationSlotService.reconcileAmbiguousTimeout({
                    platform: 'facebook',
                    slotKey: slotClaim.slotKey,
                    adapter: this.adapters.facebook
                });
                if (rec.status === SlotStatus.PUBLISHED) {
                    publishResult = { success: true, postId: 'reconciled_after_timeout', url: 'https://facebook.com/TwinGenie' };
                } else {
                    throw netErr;
                }
            }

            // 7. Track published timestamp in Supabase & update debounce timer
            if (publishResult.success) {
                this._lastPublishedTimestamps.facebook = Date.now();
                await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.PUBLISHED, {
                    postId: publishResult.postId,
                    postUrl: publishResult.url
                });
                await this.commitDurableLedger('facebook', todayIST, publishResult.postId, publishResult.url);
            } else {
                await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.FAILED, {
                    errorMessage: publishResult.error?.message || 'Publishing rejected by Facebook'
                });
                await this.releaseDurableLock('facebook', todayIST);
            }

            // 8. Save to state
            const postRecord = {
                id: postId,
                campaignId,
                platform: 'facebook',
                format: renderedReel ? 'reel' : 'carousel',
                title: dailyPackage.facebook.title,
                caption: dailyPackage.facebook.caption,
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
                topic: dailyPackage.topic,
                error: publishResult.error
            };
        } catch (fbError) {
            await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.FAILED, {
                errorMessage: fbError.message
            });
            await this.releaseDurableLock('facebook', todayIST);
            throw fbError;
        } finally {
            await publicationSlotService.releaseSlot(slotClaim.slotKey);
            // Release lock unconditionally
            this._publishingLocks.facebook = false;
        }
    }

    /**
     * Publishes today's high-converting PDF Carousel to Ashwani Kumar's LinkedIn Personal Profile.
     * Generates fresh AI content, renders 1080x1350 multi-page PDF document carousel, and dispatches to LinkedIn.
     * @param {boolean} force - If true, bypasses the duplicate post throttle
     */
    async publishDailyLinkedInPersonal(force = false, specificThemeId = null) {
        logger.info(`[GROWTH ORCHESTRATOR] Starting daily LinkedIn Personal Profile carousel flow...`);
        const now = new Date();
        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

        // 1. Mutex Concurrency Lock: Prevent simultaneous executions in this process
        if (this._publishingLocks.linkedin) {
            logger.warn(`[GROWTH ORCHESTRATOR] LinkedIn publication already in progress! Rejecting duplicate concurrent trigger.`);
            return { action: 'skipped', reason: 'publish_in_progress' };
        }

        // 2. Debounce Cooldown: If published within the last 15 minutes, skip immediately
        if (!force && this._lastPublishedTimestamps.linkedin && (Date.now() - this._lastPublishedTimestamps.linkedin < 15 * 60 * 1000)) {
            logger.info(`[GROWTH ORCHESTRATOR] LinkedIn post published within the last 15 minutes. Skipping duplicate.`);
            return { action: 'skipped', reason: 'recently_published' };
        }

        // 3. Durable Distributed Idempotency Ledger Check (Supabase + local state)
        if (!force) {
            const ledgerCheck = await this.checkDurableLedger('linkedin', todayIST);
            if (ledgerCheck.isBlocked) {
                return { action: 'skipped', reason: ledgerCheck.reason };
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

            const alreadyPostedOnLI = await this.adapters.linkedin.hasPublishedTodayIST('personal');
            if (alreadyPostedOnLI) {
                logger.info(`[GROWTH ORCHESTRATOR] LinkedIn Personal Profile already has a post today (${todayIST}). Skipping duplicate.`);
                return { action: 'skipped', reason: 'already_published_today' };
            }
        }

        // Acquire persistent slot lease (State: RENDERING)
        const slotClaim = await publicationSlotService.claimSlot({
            platform: 'linkedin',
            slotDate: todayIST,
            slotIndex: 1,
            force
        });
        if (!slotClaim.granted && !force) {
            logger.warn(`[GROWTH ORCHESTRATOR] LinkedIn publication skipped: slot claim not granted (${slotClaim.reason})`);
            return { action: 'skipped', reason: slotClaim.reason };
        }

        // Acquire process lock and durable distributed lock
        this._publishingLocks.linkedin = true;
        await this.acquireDurableLock('linkedin', todayIST);

        try {
            // Determine calendar day number and schedule
            const schedule = contentGeneratorService.getDailySchedule(now);
            const dayNumber = schedule.dayNumber;

            // 50/30/20 Pillar rotation cycle
            const pillarCycle = [
                'pillar_1_psychology', 'pillar_1_psychology', 'pillar_2_generic_ai',
                'pillar_1_psychology', 'pillar_3_product_demo', 'pillar_1_psychology',
                'pillar_2_generic_ai', 'pillar_3_product_demo', 'pillar_1_psychology',
                'pillar_2_generic_ai'
            ];
            const assignedPillar = pillarCycle[dayNumber % 10];

            // Pair-matched A/B experiment assignment
            const armInfo = this.getExperimentAssignment({
                pillarId: assignedPillar,
                format: 'carousel_pdf',
                dayNumber,
                themeId: specificThemeId || schedule.theme?.id || 'daily'
            });

            logger.info(`🔬 [GROWTH ORCHESTRATOR] LinkedIn A/B Assignment: Arm "${armInfo.arm}" in bucket "${armInfo.bucketKey}" (Caption link: ${armInfo.includeCaptionLink}, Skip comment: ${armInfo.skipFirstComment})`);

            // 4. Fetch or dynamically generate today's content with experiment options
            const dailyPackage = await contentGeneratorService.getOrGenerateDailyContent(now, {
                includeCaptionLink: armInfo.includeCaptionLink,
                experimentArm: armInfo.arm,
                pillarId: assignedPillar,
                utmLink: armInfo.utmLink,
                specificThemeId
            });
            const campaignId = `camp_${dailyPackage.themeId || 'daily'}_${Date.now()}`;
            const postId = `post_linkedin_personal_${Date.now()}`;

            logger.info(`[GROWTH ORCHESTRATOR] Today's LinkedIn Topic: "${dailyPackage.topic}" (${dailyPackage.category})`);

            // 5. Render 1080x1350 Multi-Page PDF Carousel
            logger.info(`[GROWTH ORCHESTRATOR] Rendering Carousel & PDF for Ashwani Kumar's LinkedIn: "${dailyPackage.topic}"...`);
            const rendered = await mediaRendererService.renderCarousel({
                campaignId,
                postId,
                slides: dailyPackage.linkedin.slides
            });

            // 6. Publish to LinkedIn via official API (using dedicated postToPersonalProfile method)
            logger.info(`[GROWTH ORCHESTRATOR] Dispatching PDF document carousel to LinkedIn personal profile...`);
            await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.PUBLISHING);
            let publishResult;
            try {
                publishResult = await this.adapters.linkedin.postToPersonalProfile({
                    title: dailyPackage.linkedin.title,
                    caption: dailyPackage.linkedin.caption,
                    pdfPath: rendered.pdfPath,
                    pngPaths: rendered.pngPaths,
                    utmLink: armInfo.utmLink,
                    skipFirstComment: armInfo.skipFirstComment,
                    firstComment: armInfo.firstComment
                });
            } catch (netErr) {
                logger.error(`[GROWTH ORCHESTRATOR] Ambiguous timeout during LinkedIn publish: ${netErr.message}. Triggering reconciliation...`);
                const rec = await publicationSlotService.reconcileAmbiguousTimeout({
                    platform: 'linkedin',
                    slotKey: slotClaim.slotKey,
                    adapter: this.adapters.linkedin
                });
                if (rec.status === SlotStatus.PUBLISHED) {
                    publishResult = { success: true, postId: 'reconciled_after_timeout', url: 'https://linkedin.com/in/ashwanikumar' };
                } else {
                    throw netErr;
                }
            }

            // 7. Commit to Durable Distributed Ledger
            if (publishResult.success) {
                this._lastPublishedTimestamps.linkedin = Date.now();
                await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.PUBLISHED, {
                    postId: publishResult.postId,
                    postUrl: publishResult.url
                });
                await this.commitDurableLedger('linkedin', todayIST, publishResult.postId, publishResult.url);
            } else {
                await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.FAILED, {
                    errorMessage: publishResult.error?.message || 'Publishing rejected by LinkedIn'
                });
                await this.releaseDurableLock('linkedin', todayIST);
            }

            // 8. Save to local state
            const postRecord = {
                id: postId,
                campaignId,
                platform: 'linkedin',
                target: 'personal',
                format: 'carousel_pdf',
                title: dailyPackage.linkedin.title,
                caption: dailyPackage.linkedin.caption,
                pdfPath: rendered.pdfPath,
                mediaPaths: rendered.pngPaths,
                status: publishResult.success ? 'published' : 'failed',
                scheduledFor: now.toISOString(),
                publishedAt: publishResult.success ? now.toISOString() : null,
                platformPostId: publishResult.postId,
                platformPostUrl: publishResult.url,
                error: publishResult.error || null,
                retries: 0,
                experiment: {
                    name: 'linkedin_link_placement_v2',
                    arm: armInfo.arm,
                    matchedPairBucket: armInfo.bucketKey,
                    sampleStatus: armInfo.sampleStatus,
                    attribution: {
                        channel: 'linkedin',
                        medium: armInfo.arm === 'arm_a_caption' ? 'post_caption' : 'first_comment',
                        campaign: dailyPackage.pillarId || assignedPillar,
                        content: dailyPackage.themeId,
                        destination: 'google_play_store',
                        attributionLimitation: 'Play Install Referrer broadcast tracking; iOS organic search installs recorded as unknown_organic.'
                    }
                }
            };

            this.state.posts.push(postRecord);
            this._saveState();

            return {
                success: publishResult.success,
                postId: postRecord.id,
                platformPostId: publishResult.postId,
                url: publishResult.url,
                topic: dailyPackage.topic,
                totalSlides: rendered.totalSlides,
                pdfPath: rendered.pdfPath,
                error: publishResult.error
            };
        } catch (liError) {
            await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.FAILED, {
                errorMessage: liError.message
            });
            await this.releaseDurableLock('linkedin', todayIST);
            throw liError;
        } finally {
            await publicationSlotService.releaseSlot(slotClaim.slotKey);
            this._publishingLocks.linkedin = false;
        }
    }

    /**
     * Publishes today's high-converting Carousel or Reel to Instagram account @twingenie.app.
     * Alternates formats daily in strict lockstep with Facebook: (Day N: Carousel, Day N+1: Reel).
     * @param {boolean} force - If true, bypasses the duplicate post throttle
     * @param {string|null} specificFormat - Optional manual override ('carousel' | 'reel')
     */
    async publishDailyInstagram(force = false, specificFormat = null) {
        logger.info(`[GROWTH ORCHESTRATOR] Starting daily Instagram publishing flow...`);
        const now = new Date();
        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

        // 1. Mutex Concurrency Lock: Prevent simultaneous executions in this process
        if (this._publishingLocks.instagram) {
            logger.warn(`[GROWTH ORCHESTRATOR] Instagram publication already in progress! Rejecting duplicate concurrent trigger.`);
            return { action: 'skipped', reason: 'publish_in_progress' };
        }

        // 2. Debounce Cooldown: If published within the last 15 minutes, skip immediately
        if (!force && this._lastPublishedTimestamps.instagram && (Date.now() - this._lastPublishedTimestamps.instagram < 15 * 60 * 1000)) {
            logger.info(`[GROWTH ORCHESTRATOR] Instagram post published within the last 15 minutes. Skipping duplicate.`);
            return { action: 'recently_published' };
        }

        // 3. Durable Distributed Idempotency Ledger Check (Supabase + Instagram API verification)
        if (!force) {
            const ledgerCheck = await this.checkDurableLedger('instagram', todayIST);
            if (ledgerCheck.isBlocked) {
                return { action: 'skipped', reason: ledgerCheck.reason };
            }

            const alreadyPostedOnIG = await this.adapters.instagram.hasPublishedTodayIST();
            if (alreadyPostedOnIG) {
                logger.info(`[GROWTH ORCHESTRATOR] Instagram account @twingenie.app already has a post today (${todayIST}). Skipping duplicate.`);
                return { action: 'skipped', reason: 'already_published_today' };
            }
        }

        // Acquire persistent slot lease (State: RENDERING)
        const slotClaim = await publicationSlotService.claimSlot({
            platform: 'instagram',
            slotDate: todayIST,
            slotIndex: 1,
            force
        });
        if (!slotClaim.granted && !force) {
            logger.warn(`[GROWTH ORCHESTRATOR] Instagram publication skipped: slot claim not granted (${slotClaim.reason})`);
            return { action: 'skipped', reason: slotClaim.reason };
        }

        // Acquire process lock and durable distributed lock
        this._publishingLocks.instagram = true;
        await this.acquireDurableLock('instagram', todayIST);

        try {
            // 4. Fetch or dynamically generate today's 100% fresh content
            const dailyPackage = await contentGeneratorService.getOrGenerateDailyContent(now);
            // Locked to 100% REELS for maximum algorithmic distribution & installs
            const format = specificFormat || 'reel';
            const campaignId = `camp_ig_${dailyPackage.themeId || 'daily'}_${Date.now()}`;
            const postId = `post_instagram_${Date.now()}`;

            logger.info(`[GROWTH ORCHESTRATOR] Instagram Scheduled: Topic="${dailyPackage.topic}", Format="${format}"`);

            const igCaption = dailyPackage.facebook?.caption
                ? dailyPackage.facebook.caption
                : `${dailyPackage.hook || dailyPackage.topic} 🪞\n\n${dailyPackage.linkedin?.caption || ''}\n\n📲 Experience your AI Digital Twin free on Google Play. Link in bio!\n\n#TwinGenie #AICompanion #DigitalTwin #SelfReflection #MentalClarity #MindsetShift #Overthinking #PersonalGrowth #SelfAwareness`;

            let renderedReel = null;
            let renderedCarousel = null;

            // 5. Render Media: Reel (with strict RAM limits) or Carousel
            if (format === 'reel') {
                try {
                    logger.info(`[GROWTH ORCHESTRATOR] Rendering Low-RAM Reel for Instagram @twingenie.app: "${dailyPackage.topic}" (${dailyPackage.modeName || 'Honest Twin'}, Format: ${dailyPackage.formatType || 'split'})...`);
                    renderedReel = await mediaRendererService.renderReel({
                        campaignId,
                        postId,
                        format_type: dailyPackage.formatType || 'split',
                        mode: dailyPackage.mode || 'dark',
                        modeName: dailyPackage.modeName || 'Honest / Dark Twin',
                        hook: dailyPackage.facebook.title || dailyPackage.hook,
                        tag: dailyPackage.category || 'SELF-AWARENESS',
                        userExcuse: dailyPackage.chatDialogue?.userDilemma || dailyPackage.linkedin?.slides?.[2]?.left?.user,
                        botReply: dailyPackage.chatDialogue?.standardBotReply || dailyPackage.linkedin?.slides?.[2]?.left?.ai,
                        twinReply: dailyPackage.chatDialogue?.twinModeReply || dailyPackage.linkedin?.slides?.[2]?.right?.ai,
                        shift: dailyPackage.chatDialogue?.shift,
                        split_screen: true,
                        competitorName: dailyPackage.theme?.competitorName || dailyPackage.competitorName || 'ChatGPT',
                        competitorBadge: dailyPackage.theme?.competitorBadge || dailyPackage.competitorBadge || 'CHATGPT (OPENAI)',
                        competitorTag: dailyPackage.theme?.competitorTag || dailyPackage.competitorTag || 'THE YES-MAN',
                        competitorPill: dailyPackage.theme?.competitorPill || dailyPackage.competitorPill || 'CHATGPT • FLATTERY TRAP • ZERO MEMORY',
                        competitorHeader: dailyPackage.theme?.competitorHeader || dailyPackage.competitorHeader || 'WHAT CHATGPT SAYS (THE FLATTERY TRAP)',
                        voiceHook: dailyPackage.facebook.voiceScript?.voiceHook,
                        voiceProblem: dailyPackage.facebook.voiceScript?.voiceProblem,
                        voiceSolution: dailyPackage.facebook.voiceScript?.voiceSolution,
                        voiceCta: dailyPackage.facebook.voiceScript?.voiceCta
                    });
                } catch (reelErr) {
                    logger.warn(`[GROWTH ORCHESTRATOR] Instagram Reel render failed (${reelErr.message}). Automatic failover to Carousel.`);
                }
            }

            // Render carousel slides as primary (for carousel format) or guaranteed failover (if reel render fails)
            if (!renderedReel) {
                logger.info(`[GROWTH ORCHESTRATOR] Rendering Carousel slides for Instagram @twingenie.app: "${dailyPackage.topic}"...`);
                renderedCarousel = await mediaRendererService.renderCarousel({
                    campaignId,
                    postId,
                    slides: dailyPackage.facebook.slides || dailyPackage.linkedin.slides
                });
            }

            // 6. Dispatch to Instagram via official API
            logger.info(`[GROWTH ORCHESTRATOR] Dispatching ${renderedReel ? 'Reel' : 'Carousel'} to Instagram account @twingenie.app...`);
            await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.PUBLISHING);
            let publishResult;
            try {
                publishResult = await this.adapters.instagram.publish({
                    caption: igCaption,
                    videoUrl: renderedReel?.videoUrl || null,
                    pngUrls: renderedCarousel?.pngUrls || [],
                    format: renderedReel ? 'reel' : 'carousel'
                });
            } catch (netErr) {
                logger.error(`[GROWTH ORCHESTRATOR] Ambiguous timeout during Instagram publish: ${netErr.message}. Triggering reconciliation...`);
                const rec = await publicationSlotService.reconcileAmbiguousTimeout({
                    platform: 'instagram',
                    slotKey: slotClaim.slotKey,
                    adapter: this.adapters.instagram
                });
                if (rec.status === SlotStatus.PUBLISHED) {
                    publishResult = { success: true, postId: 'reconciled_after_timeout', url: 'https://instagram.com/twingenie.app' };
                } else {
                    throw netErr;
                }
            }

            // 7. Commit to Durable Distributed Ledger
            if (publishResult.success) {
                this._lastPublishedTimestamps.instagram = Date.now();
                await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.PUBLISHED, {
                    postId: publishResult.postId,
                    postUrl: publishResult.url
                });
                await this.commitDurableLedger('instagram', todayIST, publishResult.postId, publishResult.url);
            } else {
                await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.FAILED, {
                    errorMessage: publishResult.error?.message || 'Publishing rejected by Instagram'
                });
                await this.releaseDurableLock('instagram', todayIST);
            }

            // 8. Save to local state
            const postRecord = {
                id: postId,
                campaignId,
                platform: 'instagram',
                format: renderedReel ? 'reel' : 'carousel',
                title: dailyPackage.topic,
                caption: igCaption,
                videoUrl: renderedReel?.videoUrl || null,
                mediaUrls: renderedCarousel?.pngUrls || [],
                status: publishResult.success ? 'published' : 'failed',
                scheduledFor: now.toISOString(),
                publishedAt: publishResult.success ? now.toISOString() : null,
                platformPostId: publishResult.postId,
                platformPostUrl: publishResult.url,
                error: publishResult.error || null
            };

            this.state.posts.push(postRecord);
            this._saveState();

            return {
                success: publishResult.success,
                postId: postRecord.id,
                platformPostId: publishResult.postId,
                url: publishResult.url,
                format: postRecord.format,
                topic: dailyPackage.topic,
                error: publishResult.error
            };
        } catch (igError) {
            await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.FAILED, {
                errorMessage: igError.message
            });
            await this.releaseDurableLock('instagram', todayIST);
            throw igError;
        } finally {
            await publicationSlotService.releaseSlot(slotClaim.slotKey);
            this._publishingLocks.instagram = false;
        }
    }

    /**
     * Publishes today's high-engagement micro-reflection to Threads account @twingenie.app.
     * Enforces strict 500-character limits and natural conversational engagement.
     * @param {boolean} force - If true, bypasses the duplicate post throttle
     */
    async publishDailyThreads(force = false) {
        logger.info(`[GROWTH ORCHESTRATOR] Starting daily Threads publishing flow...`);
        const now = new Date();
        const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);

        // 1. Mutex Concurrency Lock: Prevent simultaneous executions in this process
        if (this._publishingLocks.threads) {
            logger.warn(`[GROWTH ORCHESTRATOR] Threads publication already in progress! Rejecting duplicate concurrent trigger.`);
            return { action: 'skipped', reason: 'publish_in_progress' };
        }

        // 2. Debounce Cooldown: If published within the last 15 minutes, skip immediately
        if (!force && this._lastPublishedTimestamps.threads && (Date.now() - this._lastPublishedTimestamps.threads < 15 * 60 * 1000)) {
            logger.info(`[GROWTH ORCHESTRATOR] Threads post published within the last 15 minutes. Skipping duplicate.`);
            return { action: 'recently_published' };
        }

        // 3. Durable Distributed Idempotency Ledger Check (Supabase + Threads API verification)
        if (!force) {
            const ledgerCheck = await this.checkDurableLedger('threads', todayIST);
            if (ledgerCheck.isBlocked) {
                return { action: 'skipped', reason: ledgerCheck.reason };
            }

            const alreadyPostedOnThreads = await this.adapters.threads.hasPublishedTodayIST();
            if (alreadyPostedOnThreads) {
                logger.info(`[GROWTH ORCHESTRATOR] Threads account @twingenie.app already has a post today (${todayIST}). Skipping duplicate.`);
                return { action: 'skipped', reason: 'already_published_today' };
            }
        }

        // Acquire persistent slot lease (State: RENDERING)
        const slotClaim = await publicationSlotService.claimSlot({
            platform: 'threads',
            slotDate: todayIST,
            slotIndex: 1,
            force
        });
        if (!slotClaim.granted && !force) {
            logger.warn(`[GROWTH ORCHESTRATOR] Threads publication skipped: slot claim not granted (${slotClaim.reason})`);
            return { action: 'skipped', reason: slotClaim.reason };
        }

        // Acquire process lock and durable distributed lock
        this._publishingLocks.threads = true;
        await this.acquireDurableLock('threads', todayIST);

        try {
            // 4. Fetch or dynamically generate today's content
            const dailyPackage = await contentGeneratorService.getOrGenerateDailyContent(now);
            const campaignId = `camp_th_${dailyPackage.themeId || 'daily'}_${Date.now()}`;
            const postId = `post_threads_${Date.now()}`;

            // Threads 500-character micro-essay format
            const hook = dailyPackage.hook || dailyPackage.facebook?.title || dailyPackage.topic;
            const insight = dailyPackage.facebook?.caption ? dailyPackage.facebook.caption.split('\n')[0] : 'Most AI tools flatter you. TwinGenie acts as a true cognitive mirror.';
            const playStoreLink = 'https://play.google.com/store/apps/details?id=com.asmind.app';

            let threadText = `${hook} 🪞\n\n${insight}\n\nMeet your AI digital twin free on Google Play:\n📲 ${playStoreLink}`;
            if (threadText.length > 500) {
                threadText = threadText.slice(0, 496) + '...';
            }

            logger.info(`[GROWTH ORCHESTRATOR] Dispatching micro-reflection to Threads account @twingenie.app...`);
            await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.PUBLISHING);
            let publishResult;
            try {
                publishResult = await this.adapters.threads.publish({
                    text: threadText
                });
            } catch (netErr) {
                logger.error(`[GROWTH ORCHESTRATOR] Ambiguous timeout during Threads publish: ${netErr.message}. Triggering reconciliation...`);
                const rec = await publicationSlotService.reconcileAmbiguousTimeout({
                    platform: 'threads',
                    slotKey: slotClaim.slotKey,
                    adapter: this.adapters.threads
                });
                if (rec.status === SlotStatus.PUBLISHED) {
                    publishResult = { success: true, postId: 'reconciled_after_timeout', url: 'https://threads.net/@twingenie.app' };
                } else {
                    throw netErr;
                }
            }

            // 5. Commit to Durable Distributed Ledger
            if (publishResult.success) {
                this._lastPublishedTimestamps.threads = Date.now();
                await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.PUBLISHED, {
                    postId: publishResult.postId,
                    postUrl: publishResult.url
                });
                await this.commitDurableLedger('threads', todayIST, publishResult.postId, publishResult.url);
            } else {
                await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.FAILED, {
                    errorMessage: publishResult.error?.message || 'Publishing rejected by Threads'
                });
                await this.releaseDurableLock('threads', todayIST);
            }

            // 6. Save to local state
            const postRecord = {
                id: postId,
                campaignId,
                platform: 'threads',
                format: 'text',
                title: dailyPackage.topic,
                caption: threadText,
                status: publishResult.success ? 'published' : 'failed',
                scheduledFor: now.toISOString(),
                publishedAt: publishResult.success ? now.toISOString() : null,
                platformPostId: publishResult.postId,
                platformPostUrl: publishResult.url,
                error: publishResult.error || null
            };

            this.state.posts.push(postRecord);
            this._saveState();

            return {
                success: publishResult.success,
                postId: postRecord.id,
                platformPostId: publishResult.postId,
                url: publishResult.url,
                topic: dailyPackage.topic,
                error: publishResult.error
            };
        } catch (thError) {
            await publicationSlotService.transitionStatus(slotClaim.slotKey, SlotStatus.FAILED, {
                errorMessage: thError.message
            });
            await this.releaseDurableLock('threads', todayIST);
            throw thError;
        } finally {
            await publicationSlotService.releaseSlot(slotClaim.slotKey);
            this._publishingLocks.threads = false;
        }
    }

    /**
     * Unified Daily Broadcast: Dispatches Facebook Reel, LinkedIn Carousel, Instagram Carousel & Threads.
     * @param {boolean} force - Force publish even if already published today
     */
    async publishDailyBroadcast(force = false) {
        logger.info(`🚀 [GROWTH ORCHESTRATOR] Initiating Unified Daily Broadcast (Facebook + LinkedIn + Instagram + Threads, force=${force})...`);
        const results = {
            timestamp: new Date().toISOString(),
            facebook: null,
            linkedin: null,
            instagram: null,
            threads: null
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

        try {
            results.instagram = await this.publishDailyInstagram(force);
        } catch (igErr) {
            logger.error('[GROWTH ORCHESTRATOR] Daily Instagram publish failed:', igErr);
            results.instagram = { success: false, error: igErr.message };
        }

        try {
            results.threads = await this.publishDailyThreads(force);
        } catch (thErr) {
            logger.error('[GROWTH ORCHESTRATOR] Daily Threads publish failed:', thErr);
            results.threads = { success: false, error: thErr.message };
        }

        logger.info(`✅ [GROWTH ORCHESTRATOR] Unified Daily Broadcast finished: FB success=${results.facebook?.success}, LI success=${results.linkedin?.success}, IG success=${results.instagram?.success}, Threads success=${results.threads?.success}`);
        return results;
    }
}

const growthOrchestratorService = new GrowthOrchestratorService();
export default growthOrchestratorService;
