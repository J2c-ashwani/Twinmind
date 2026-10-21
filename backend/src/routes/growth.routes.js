import express from 'express';
import growthOrchestratorService from '../services/growth/growthOrchestratorService.js';
import mediaRendererService from '../services/growth/mediaRendererService.js';
import contentGeneratorService, { CAMPAIGN_THEMES } from '../services/growth/contentGeneratorService.js';
import linkedinAdapter from '../services/growth/adapters/linkedinAdapter.js';
import logger from '../config/logger.js';

const router = express.Router();

// Strict server-level secret check for high-risk growth administration
const requireAdminSecret = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const bearerKey = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const adminKey = req.headers['x-admin-key'] || req.headers['x-admin-secret'] || req.query.secret || req.query.key || bearerKey;
    
    const validKeys = [
        process.env.ADMIN_API_KEY,
        process.env.ADMIN_SECRET_KEY,
        process.env.CRONJOB_API_KEY,
        process.env.CRON_JOB_API_KEY
    ].filter(Boolean);

    if (validKeys.length === 0) {
        return res.status(503).json({ 
            error: 'Growth admin endpoints disabled: Neither ADMIN_API_KEY nor CRONJOB_API_KEY is configured in server environment' 
        });
    }

    if (!adminKey || !validKeys.includes(adminKey)) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing secret key' });
    }

    next();
};

/**
 * GET /api/admin/growth/status
 * Health check & adapter connection status for LinkedIn, Instagram, Facebook, YouTube
 */
router.get('/status', requireAdminSecret, async (req, res) => {
    try {
        const status = await growthOrchestratorService.getSystemStatus();
        res.json({ success: true, status });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Status check failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/growth/diagnostic
 * Verifies system binaries (ffmpeg, python3, edge-tts, PIL) for video engine
 */
router.get('/diagnostic', requireAdminSecret, async (req, res) => {
    const { execSync } = await import('child_process');
    const diag = { nodeVersion: process.version };
    try { diag.python3 = execSync('python3 --version').toString().trim(); } catch (e) { diag.python3 = e.message; }
    try { diag.ffmpeg = execSync('ffmpeg -version').toString().split('\n')[0].trim(); } catch (e) { diag.ffmpeg = e.message; }
    try { diag.ffprobe = execSync('ffprobe -version').toString().split('\n')[0].trim(); } catch (e) { diag.ffprobe = e.message; }
    try { diag.edgeTts = execSync('edge-tts --version').toString().trim(); } catch (e) { diag.edgeTts = e.message; }
    try { diag.pillow = execSync('python3 -c "import PIL; print(PIL.__version__)"').toString().trim(); } catch (e) { diag.pillow = e.message; }
    res.json({ success: true, diagnostic: diag });
});

/**
 * GET /api/admin/growth/queue
 * Returns full queue of scheduled, published, and draft posts
 */
router.get('/queue', requireAdminSecret, (req, res) => {
    try {
        res.json({
            success: true,
            campaigns: growthOrchestratorService.state.campaigns,
            posts: growthOrchestratorService.state.posts
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/growth/generate
 * Trigger AI generation and media rendering of a new 4-platform campaign bundle
 */
router.post('/generate', requireAdminSecret, async (req, res) => {
    try {
        const { themeId } = req.body || {};
        const result = await growthOrchestratorService.generateAndQueueDailyCampaign(themeId);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Campaign generation failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/growth/publish/:id
 * Force publish a specific post immediately
 */
router.post('/publish/:id', requireAdminSecret, async (req, res) => {
    try {
        const result = await growthOrchestratorService.publishPostNow(req.params.id);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Force publish failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/growth/publish/linkedin
 * Dedicated LinkedIn pipeline trigger for Personal Profile or Company Page
 * Body: { target: 'personal' | 'company', themeId?: string }
 */
router.post('/publish/linkedin', requireAdminSecret, async (req, res) => {
    try {
        const target = req.body?.target || req.query?.target || 'personal';
        const themeId = req.body?.themeId;
        const theme = CAMPAIGN_THEMES.find(t => t.id === themeId) || CAMPAIGN_THEMES[0];
        const campaignId = `camp_${theme.id}_${Date.now()}`;
        const content = target === 'personal'
            ? contentGeneratorService._generateLinkedInPersonalContent(theme, campaignId)
            : contentGeneratorService._generateLinkedInContent(theme, campaignId, 'company');

        logger.info(`[GROWTH ROUTE] Rendering carousel for LinkedIn ${target}...`);
        const rendered = await mediaRendererService.renderCarousel({
            campaignId,
            postId: `post_linkedin_${target}_${Date.now()}`,
            slides: content.slides
        });

        logger.info(`[GROWTH ROUTE] Publishing to LinkedIn ${target}...`);
        const publishResult = await linkedinAdapter.publish({
            title: content.title,
            caption: content.caption,
            pdfPath: rendered.pdfPath,
            pngPaths: rendered.pngPaths,
            utmLink: content.utmLink,
            target
        });

        res.json({ success: true, target, publishResult, rendered });
    } catch (error) {
        logger.error('[GROWTH ROUTE] LinkedIn publish failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/growth/toggle-pause
 * Emergency pause or resume the distribution scheduler
 */
router.post('/toggle-pause', requireAdminSecret, (req, res) => {
    try {
        growthOrchestratorService.state.isPaused = !growthOrchestratorService.state.isPaused;
        growthOrchestratorService._saveState();
        res.json({ success: true, isPaused: growthOrchestratorService.state.isPaused });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/growth/render-test
 * Quick test rendering of a 5-slide carousel and multi-page PDF
 */
router.post('/render-test', requireAdminSecret, async (req, res) => {
    try {
        const rendered = await mediaRendererService.renderCarousel({
            campaignId: 'test_render',
            postId: Date.now(),
            slides: [
                { title: 'The Flattery Trap', content: 'Most AI bots agree with everything you say.', highlight: 'CONFIRMATION BIAS', tag: 'COGNITIVE ARCHITECTURE' },
                { title: 'Normal vs Honest Mode', content: 'Switch to Honest mode when you need real truth.', highlight: '4 TWIN MODES', tag: 'TWINGENIE APP' },
                { title: 'Longitudinal Memory', content: 'pgvector memory connects insights across weeks.', highlight: 'DEEP CONTEXT', tag: 'MEMORY PIPELINE' }
            ]
        });
        res.json({ success: true, rendered });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/daily-reel
 * Automated webhook called by cron-job.org daily at a fixed time
 * Generates fresh campaign content, renders 8Mbps CBR 1080x1920 Reel with neural voiceover,
 * and publishes directly to Facebook Reels.
 */
router.all('/cron/daily-reel', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        logger.info(`[GROWTH CRON] Triggering automated daily Facebook Reel publication (force=${force})...`);
        const result = await growthOrchestratorService.publishDailyFacebookReel(force);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] Daily Reel automated publication failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/process-queue
 * Automated webhook called by cron-job.org periodically (e.g. every 30 mins)
 * Dispatches any scheduled posts that have reached their target time.
 */
router.all('/cron/process-queue', requireAdminSecret, async (req, res) => {
    try {
        logger.info('[GROWTH CRON] Processing scheduled distribution queue via external cron trigger...');
        const result = await growthOrchestratorService.processScheduledPosts();
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] Queue processing trigger failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
