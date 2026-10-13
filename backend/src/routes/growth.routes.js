import express from 'express';
import growthOrchestratorService from '../services/growth/growthOrchestratorService.js';
import mediaRendererService from '../services/growth/mediaRendererService.js';
import logger from '../config/logger.js';

const router = express.Router();

// Strict server-level secret check for high-risk growth administration
const requireAdminSecret = (req, res, next) => {
    const adminKey = req.headers['x-admin-key'] || req.headers['x-admin-secret'];
    const expectedKey = process.env.ADMIN_API_KEY || process.env.ADMIN_SECRET_KEY;

    if (!expectedKey) {
        return res.status(503).json({ 
            error: 'Growth admin endpoints disabled: ADMIN_API_KEY is not configured in server environment' 
        });
    }

    if (!adminKey || adminKey !== expectedKey) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing X-Admin-Key header' });
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

export default router;
