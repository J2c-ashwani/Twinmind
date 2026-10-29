import express from 'express';
import growthOrchestratorService from '../services/growth/growthOrchestratorService.js';
import mediaRendererService from '../services/growth/mediaRendererService.js';
import contentGeneratorService, { CAMPAIGN_THEMES } from '../services/growth/contentGeneratorService.js';
import linkedinAdapter from '../services/growth/adapters/linkedinAdapter.js';
import facebookAdapter from '../services/growth/adapters/facebookAdapter.js';
import instagramAdapter from '../services/growth/adapters/instagramAdapter.js';
import threadsAdapter from '../services/growth/adapters/threadsAdapter.js';
import prOutreachService from '../services/prOutreachService.js';
import investorOutreachService from '../services/investorOutreachService.js';
import acquisitionCampaignService from '../services/acquisitionCampaignService.js';
import growthDashboardService from '../services/growth/growthDashboardService.js';
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
 * GET & POST /api/admin/growth/publish/linkedin
 * Dedicated LinkedIn pipeline trigger for Personal Profile or Company Page
 * Query/Body: { target: 'personal' | 'company', themeId?: string }
 */
router.all('/publish/linkedin', requireAdminSecret, async (req, res) => {
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

        const accessToken = req.body?.accessToken || req.query?.accessToken;
        const authorUrn = req.body?.authorUrn || req.query?.authorUrn;

        logger.info(`[GROWTH ROUTE] Publishing to LinkedIn ${target}...`);
        const publishResult = await linkedinAdapter.publish({
            title: content.title,
            caption: content.caption,
            pdfPath: rendered.pdfPath,
            pngPaths: rendered.pngPaths,
            utmLink: content.utmLink,
            accessToken,
            authorUrn,
            target
        });

        res.json({ success: true, target, publishResult, rendered });
    } catch (error) {
        logger.error('[GROWTH ROUTE] LinkedIn publish failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/publish/facebook
 * Dedicated Facebook pipeline trigger (Multi-Photo Carousel or Reel)
 * Body/Query: { format?: 'carousel' | 'reel', themeId?: string }
 */
router.all('/publish/facebook', requireAdminSecret, async (req, res) => {
    try {
        const format = req.body?.format || req.query?.format || 'carousel';
        const themeId = req.body?.themeId;
        const theme = CAMPAIGN_THEMES.find(t => t.id === themeId) || CAMPAIGN_THEMES[0];
        const campaignId = `camp_${theme.id}_${Date.now()}`;
        const content = contentGeneratorService._generateFacebookContent(theme, campaignId, format);

        let mediaPaths = [];
        let videoPath = null;

        if (format === 'carousel') {
            logger.info(`[GROWTH ROUTE] Rendering multi-image carousel for Facebook...`);
            const rendered = await mediaRendererService.renderCarousel({
                campaignId,
                postId: `post_facebook_carousel_${Date.now()}`,
                slides: content.slides
            });
            mediaPaths = rendered.pngPaths;
        } else {
            logger.info(`[GROWTH ROUTE] Rendering Reel video for Facebook...`);
            const rendered = await mediaRendererService.renderReel({
                campaignId,
                postId: `post_facebook_reel_${Date.now()}`,
                hook: content.title || theme.hook,
                tag: content.tag || theme.tag
            });
            videoPath = rendered.videoPath;
        }

        logger.info(`[GROWTH ROUTE] Publishing to Facebook Page...`);
        const publishResult = await facebookAdapter.publish({
            title: content.title,
            caption: content.caption,
            firstComment: content.firstComment,
            mediaPaths,
            videoPath,
            utmLink: content.utmLink,
            format
        });

        res.json({ success: true, format, publishResult });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Facebook publish failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/publish/instagram
 * Dedicated Instagram pipeline trigger (Multi-Photo Carousel or Reel)
 * Body/Query: { format?: 'carousel' | 'reel', themeId?: string }
 */
router.all('/publish/instagram', requireAdminSecret, async (req, res) => {
    try {
        const format = req.body?.format || req.query?.format || 'carousel';
        const themeId = req.body?.themeId;
        const theme = CAMPAIGN_THEMES.find(t => t.id === themeId) || CAMPAIGN_THEMES[0];
        const campaignId = `camp_ig_${theme.id}_${Date.now()}`;
        const content = contentGeneratorService._generateInstagramContent(theme, campaignId);

        let pngUrls = [];
        let videoUrl = null;

        if (format === 'carousel') {
            logger.info(`[GROWTH ROUTE] Rendering multi-image carousel for Instagram...`);
            const rendered = await mediaRendererService.renderCarousel({
                campaignId,
                postId: `post_ig_carousel_${Date.now()}`,
                slides: content.slides
            });
            pngUrls = rendered.pngUrls;
        } else {
            logger.info(`[GROWTH ROUTE] Rendering Reel video for Instagram...`);
            const rendered = await mediaRendererService.renderReel({
                campaignId,
                postId: `post_ig_reel_${Date.now()}`,
                hook: content.title || theme.hook,
                tag: content.tag || theme.tag
            });
            videoUrl = rendered.videoUrl;
        }

        logger.info(`[GROWTH ROUTE] Publishing to Instagram @twingenie.app...`);
        const publishResult = await instagramAdapter.publish({
            caption: content.caption,
            pngUrls,
            videoUrl,
            format
        });

        res.json({ success: true, platform: 'instagram', format, publishResult });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Instagram publish failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/growth/instagram/status
 * Check Instagram connection health
 */
router.get('/instagram/status', requireAdminSecret, async (req, res) => {
    const health = await instagramAdapter.getHealthStatus();
    res.json({ success: true, health });
});

/**
 * GET & POST /api/admin/growth/publish/threads
 * Dedicated Threads pipeline trigger (Text micro-essay or Image post)
 * Body/Query: { text?: string, linkAttachment?: string }
 */
router.all('/publish/threads', requireAdminSecret, async (req, res) => {
    try {
        const text = req.body?.text || req.query?.text;
        const linkAttachment = req.body?.linkAttachment || req.query?.linkAttachment;
        
        let threadText = text;
        if (!threadText) {
            const dailyPackage = await contentGeneratorService.getOrGenerateDailyContent(new Date());
            const hook = dailyPackage.hook || dailyPackage.facebook?.title || dailyPackage.topic;
            const insight = dailyPackage.facebook?.caption ? dailyPackage.facebook.caption.split('\n')[0] : 'Most AI tools flatter you. TwinGenie acts as a true cognitive mirror.';
            const playStoreLink = 'https://play.google.com/store/apps/details?id=com.asmind.app';
            threadText = `${hook} 🪞\n\n${insight}\n\nMeet your AI digital twin free on Google Play:\n📲 ${playStoreLink}`;
        }

        logger.info(`[GROWTH ROUTE] Publishing to Threads @twingenie.app...`);
        const publishResult = await threadsAdapter.publish({
            text: threadText,
            linkAttachment
        });

        res.json({ success: true, platform: 'threads', publishResult });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Threads publish failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/growth/threads/status
 * Check Threads connection health
 */
router.get('/threads/status', requireAdminSecret, async (req, res) => {
    const health = await threadsAdapter.getHealthStatus();
    res.json({ success: true, health });
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
 * GET /api/admin/growth/oauth/linkedin/callback
 * Handles OAuth 2.0 authorization code redirect from LinkedIn.
 * Automatically exchanges code for long-lived Access Token and retrieves Person/Org URNs.
 */
router.get('/oauth/linkedin/callback', async (req, res) => {
    try {
        const { code, error, error_description } = req.query;

        if (error) {
            return res.status(400).send(`<h3>LinkedIn OAuth Error</h3><p>${error}: ${error_description}</p>`);
        }

        if (!code) {
            return res.status(400).send(`<h3>Missing Code</h3><p>No authorization code received from LinkedIn.</p>`);
        }

        const isCompany = req.query.state === 'company';
        const clientId = isCompany
            ? (process.env.LINKEDIN_COMPANY_CLIENT_ID || process.env.LINKEDIN_CLIENT_ID)
            : (process.env.LINKEDIN_PERSONAL_CLIENT_ID || process.env.LINKEDIN_CLIENT_ID);
        const clientSecret = isCompany
            ? (process.env.LINKEDIN_COMPANY_CLIENT_SECRET || process.env.LINKEDIN_CLIENT_SECRET)
            : (process.env.LINKEDIN_PERSONAL_CLIENT_SECRET || process.env.LINKEDIN_CLIENT_SECRET);
            
        // Explicitly force exact HTTPS matching URL registered in LinkedIn Developer Portal
        const redirectUri = 'https://twinmind-9l6x.onrender.com/api/admin/growth/oauth/linkedin/callback';

        if (!clientId || !clientSecret) {
            return res.status(500).send(`<h3>Server Missing Credentials</h3><p>Ensure LINKEDIN_PERSONAL_CLIENT_ID and LINKEDIN_PERSONAL_CLIENT_SECRET are set in environment variables.</p>`);
        }

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret
        });

        const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });

        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            return res.status(500).json({ error: 'Token exchange failed', details: tokenData });
        }

        const accessToken = tokenData.access_token;
        let personUrn = null;
        let orgUrns = [];

        // Fetch User Info
        try {
            const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                personUrn = `urn:li:person:${userData.sub}`;
            }
        } catch (e) {
            logger.warn('Failed to fetch userinfo:', e.message);
        }

        // Return HTML display for immediate setup
        res.send(`
            <html>
                <body style="font-family: -apple-system, sans-serif; background: #0c091c; color: #fff; padding: 40px; max-width: 700px; margin: 0 auto; line-height: 1.6;">
                    <h2 style="color: #38bdf8;">🎉 LinkedIn Authorization Successful!</h2>
                    <p style="color: #cbd5e1;">Copy these environment variables directly into Render dashboard:</p>
                    
                    <div style="background: #15102e; border: 1px solid #7c3aed; padding: 20px; border-radius: 12px; margin: 20px 0; word-break: break-all;">
                        <p style="color: #a855f7; margin: 0 0 8px 0; font-weight: bold;">LINKEDIN_ACCESS_TOKEN:</p>
                        <code style="background: #24194c; padding: 8px 12px; border-radius: 6px; display: block; color: #fff;">${accessToken}</code>
                        
                        ${personUrn ? `
                            <p style="color: #38bdf8; margin: 16px 0 8px 0; font-weight: bold;">LINKEDIN_PERSON_URN:</p>
                            <code style="background: #24194c; padding: 8px 12px; border-radius: 6px; display: block; color: #fff;">${personUrn}</code>
                        ` : ''}
                        
                        <p style="color: #34d399; margin: 16px 0 8px 0; font-weight: bold;">LINKEDIN_ORGANIZATION_URN:</p>
                        <code style="background: #24194c; padding: 8px 12px; border-radius: 6px; display: block; color: #fff;">urn:li:organization:145288585</code>
                    </div>

                    <p style="color: #94a3b8; font-size: 14px;">Token expires in ${Math.round(tokenData.expires_in / 86400)} days.</p>
                </body>
            </html>
        `);
    } catch (err) {
        logger.error('[LINKEDIN OAUTH] Callback error:', err);
        res.status(500).send(`<h3>Internal Server Error</h3><p>${err.message}</p>`);
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
        const theme = req.query.theme || req.body?.theme || null;
        const format = req.query.format || req.body?.format || null;
        logger.info(`[GROWTH CRON] Triggering automated daily Facebook publication (force=${force}, theme=${theme || 'auto'}, format=${format || 'auto'})...`);
        const result = await growthOrchestratorService.publishDailyFacebookReel(force, theme, format);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] Daily Reel automated publication failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/daily-linkedin
 * Automated webhook called by cron-job.org daily at 4:00 PM IST (10:30 UTC)
 * Renders 1080x1350 multi-page PDF document carousel and publishes to Ashwani Kumar's LinkedIn.
 */
router.all('/cron/daily-linkedin', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        const theme = req.query.theme || req.body?.theme || null;
        logger.info(`[GROWTH CRON] Triggering automated daily LinkedIn Personal Carousel publication (force=${force}, theme=${theme || 'auto'})...`);
        const result = await growthOrchestratorService.publishDailyLinkedInPersonal(force, theme);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] Daily LinkedIn carousel publication failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/daily-instagram
 * Automated webhook called by cron-job.org daily
 * Renders daily carousel slides and publishes to @twingenie.app on Instagram.
 */
router.all('/cron/daily-instagram', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        logger.info(`[GROWTH CRON] Triggering automated daily Instagram Carousel publication (force=${force})...`);
        const result = await growthOrchestratorService.publishDailyInstagram(force);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] Daily Instagram automated publication failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/daily-threads
 * Automated webhook called by cron-job.org daily at 7:30 PM IST (10:00 AM EDT)
 * Publishes daily 500-char micro-reflection to @twingenie.app on Threads.
 */
router.all('/cron/daily-threads', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        logger.info(`[GROWTH CRON] Triggering automated daily Threads publication (force=${force})...`);
        const result = await growthOrchestratorService.publishDailyThreads(force);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] Daily Threads automated publication failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/daily-publish
 * Unified Daily 4:00 PM IST Broadcast Trigger
 * Publishes both Facebook Reel and Ashwani Kumar's LinkedIn Personal Carousel.
 */
router.all('/cron/daily-publish', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        logger.info(`[GROWTH CRON] Triggering Unified Daily Broadcast (Facebook + LinkedIn, force=${force})...`);
        const result = await growthOrchestratorService.publishDailyBroadcast(force);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] Unified Daily Broadcast failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/growth/fresh-preview
 * Previews today's 100% fresh AI-generated daily thought leadership content
 */
router.get('/fresh-preview', requireAdminSecret, async (req, res) => {
    try {
        const content = await contentGeneratorService.getOrGenerateDailyContent(new Date());
        res.json({ success: true, content });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Fresh preview failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/process-queue
 * Webhook called by cron-job.org periodically
 * Deprecated queue safely defanged; confirms dedicated broadcasts are active.
 */
router.all('/cron/process-queue', requireAdminSecret, async (req, res) => {
    try {
        logger.info('[GROWTH CRON] Queue ping received (legacy queue safely defanged).');
        res.json({ success: true, message: 'Queue is deprecated. Dedicated daily broadcasts handle all publishing.' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/growth/pr/status
 * Check status, pending journalist queue, and dispatch history for US PR outreach
 */
router.get('/pr/status', requireAdminSecret, (req, res) => {
    try {
        const status = prOutreachService.getStatus();
        res.json({ success: true, status });
    } catch (error) {
        logger.error('[GROWTH ROUTE] PR status check failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/growth/pr/tick
 * Triggers the next PR journalist pitch (respects 45m cooldown unless force=true)
 */
router.all('/pr/tick', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        const result = await prOutreachService.executeTick(force);
        res.json({ success: true, result, status: prOutreachService.getStatus() });
    } catch (error) {
        logger.error('[GROWTH ROUTE] PR execution tick failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/pr-outreach
 * Webhook for automated PR outreach ticks via external cron or internal scheduler
 */
router.all('/cron/pr-outreach', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        const result = await prOutreachService.executeTick(force);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] PR outreach webhook failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/growth/investor/status
 * Check status, pending investor queue, and dispatch history for Seed/Angel investor outreach
 */
router.get('/investor/status', requireAdminSecret, (req, res) => {
    try {
        const status = investorOutreachService.getStatus();
        res.json({ success: true, status });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Investor status check failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/admin/growth/investor/tick
 * Triggers the next investor pitch (respects 75m cooldown unless force=true)
 */
router.all('/investor/tick', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        const result = await investorOutreachService.executeTick(force);
        res.json({ success: true, result, status: investorOutreachService.getStatus() });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Investor execution tick failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/investor-outreach
 * Webhook for automated investor outreach ticks via external cron or internal scheduler
 */
router.all('/cron/investor-outreach', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        const result = await investorOutreachService.executeTick(force);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] Investor outreach webhook failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET & POST /api/admin/growth/cron/acquisition-outreach
 * Webhook for automated M&A acquisition / divestment outreach ticks via external cron
 */
router.all('/cron/acquisition-outreach', requireAdminSecret, async (req, res) => {
    try {
        const force = req.query.force === 'true' || req.body?.force === true;
        const result = await acquisitionCampaignService.executeTick(force);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('[GROWTH CRON] Acquisition outreach webhook failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/admin/growth/dashboard
 * Aggregates weekly KPIs across Organic Growth, Activation, Retention, PR, Fundraising, and M&A
 */
router.get('/dashboard', requireAdminSecret, async (req, res) => {
    try {
        const metrics = await growthDashboardService.getWeeklyMetrics();
        res.json({ success: true, dashboard: metrics });
    } catch (error) {
        logger.error('[GROWTH ROUTE] Dashboard retrieval failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
