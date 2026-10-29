import crypto from 'crypto';
import logger from '../../config/logger.js';
import { supabaseAdmin } from '../../config/supabase.js';

/**
 * SmartRouterService
 * High-performance, zero-latency device-aware routing & attribution engine.
 * Inspired by Dub.co: handles deep-link routing, social OpenGraph crawler previews,
 * and tracks real-time click attribution across Instagram, Facebook, LinkedIn, and Threads.
 */
class SmartRouterService {
    constructor() {
        this.PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.asmind.app';
        this.IOS_WAITLIST_URL = 'https://twingenie.app/#ios-waitlist';
        this.WEB_LANDING_URL = 'https://twingenie.app';

        // In-memory ring buffer (fast, low-RAM, persists across app lifetime)
        this.recentClicks = [];
        this.maxRecentClicks = 500;
        this.metrics = {
            totalClicks: 0,
            byPlatform: {
                instagram: 0,
                facebook: 0,
                linkedin: 0,
                threads: 0,
                direct: 0,
                other: 0
            },
            byDevice: {
                android: 0,
                ios: 0,
                desktop: 0
            },
            byCampaign: {},
            lastClickAt: null
        };
    }

    /**
     * Resolves client device from User-Agent
     */
    detectDevice(userAgent = '') {
        if (/Android/i.test(userAgent)) return 'android';
        if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
        return 'desktop';
    }

    /**
     * Detects social media crawlers that require OpenGraph HTML preview meta tags
     */
    isSocialCrawler(userAgent = '') {
        const crawlerRegex = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|WhatsApp|TelegramBot|Discordbot|Slackbot|Pinterest|SkypeUriPreview/i;
        return crawlerRegex.test(userAgent);
    }

    /**
     * Resolves traffic source from query parameters or HTTP Referer
     */
    detectPlatform(req) {
        const utmSource = (req.query.utm_source || '').toLowerCase().trim();
        if (utmSource.includes('insta')) return 'instagram';
        if (utmSource.includes('face') || utmSource.includes('fb')) return 'facebook';
        if (utmSource.includes('link')) return 'linkedin';
        if (utmSource.includes('thread')) return 'threads';
        if (utmSource.includes('yt') || utmSource.includes('youtube')) return 'youtube';
        if (utmSource) return utmSource;

        const referer = (req.headers.referer || req.headers.referrer || '').toLowerCase();
        if (referer.includes('instagram.com')) return 'instagram';
        if (referer.includes('facebook.com') || referer.includes('fb.com')) return 'facebook';
        if (referer.includes('linkedin.com')) return 'linkedin';
        if (referer.includes('threads.net')) return 'threads';
        if (referer.includes('t.co') || referer.includes('twitter.com') || referer.includes('x.com')) return 'twitter';

        return 'direct';
    }

    /**
     * Records a click event into the memory buffer and asynchronously into Supabase
     */
    recordClick(req, platform, device) {
        try {
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            const ipHash = crypto.createHash('md5').update(ip.split(',')[0].trim()).digest('hex').substring(0, 8);
            const campaign = (req.query.utm_campaign || 'organic').toString().trim();
            const medium = (req.query.utm_medium || 'direct').toString().trim();
            const content = (req.query.utm_content || '').toString().trim();
            const now = new Date();

            const clickEvent = {
                id: `clk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                timestamp: now.toISOString(),
                platform,
                medium,
                campaign,
                content,
                device,
                ipHash,
                userAgent: (req.headers['user-agent'] || '').substring(0, 100)
            };

            // Update in-memory metrics
            this.metrics.totalClicks++;
            this.metrics.lastClickAt = clickEvent.timestamp;
            this.metrics.byDevice[device] = (this.metrics.byDevice[device] || 0) + 1;
            
            const platKey = this.metrics.byPlatform[platform] !== undefined ? platform : 'other';
            this.metrics.byPlatform[platKey] = (this.metrics.byPlatform[platKey] || 0) + 1;

            if (campaign) {
                this.metrics.byCampaign[campaign] = (this.metrics.byCampaign[campaign] || 0) + 1;
            }

            // Ring buffer
            this.recentClicks.unshift(clickEvent);
            if (this.recentClicks.length > this.maxRecentClicks) {
                this.recentClicks.pop();
            }

            logger.info(`📲 [SMART ROUTER] App download click from ${platform} [${device}] (Campaign: ${campaign}, Total Clicks: ${this.metrics.totalClicks})`);

            // Non-blocking asynchronous logging to Supabase
            if (supabaseAdmin) {
                supabaseAdmin.from('usage_tracking').insert({
                    action_type: `growth_click:${platform}`,
                    metadata: {
                        platform,
                        device,
                        campaign,
                        medium,
                        ipHash,
                        timestamp: clickEvent.timestamp
                    }
                }).then(({ error }) => {
                    if (error) {
                        logger.warn('[SMART ROUTER] Non-blocking Supabase click log warning:', error.message);
                    }
                }).catch(() => {});
            }
        } catch (err) {
            logger.warn('[SMART ROUTER] Non-blocking click tracking error:', err.message);
        }
    }

    /**
     * Generates rich Open Graph HTML for social media crawler cards
     */
    generateCrawlerHtml(req) {
        const title = "TwinGenie — Your AI Digital Twin with 4 Cognitive Modes";
        const description = "Stop talking to AI that forgets you. Meet the personal AI companion with 35-question psychological onboarding, 4 distinct modes (Normal, Reflective, Honest, Future), and persistent vector memory.";
        const playStoreUrl = this.PLAY_STORE_URL;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${description}">

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://twingenie.app/download">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:site_name" content="TwinGenie">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">

    <meta http-equiv="refresh" content="0;url=${playStoreUrl}">
</head>
<body style="background:#0c091c;color:#fff;font-family:sans-serif;text-align:center;padding:50px;">
    <h2>Redirecting to TwinGenie on Google Play...</h2>
    <p><a href="${playStoreUrl}" style="color:#38bdf8;">Click here if you are not redirected automatically.</a></p>
</body>
</html>`;
    }

    /**
     * Primary express handler for /download, /open, /app
     */
    handleDownload(req, res) {
        const userAgent = req.headers['user-agent'] || '';
        const platform = this.detectPlatform(req);
        const device = this.detectDevice(userAgent);

        // Record click attribution
        this.recordClick(req, platform, device);

        // If social media scraper/crawler, serve Open Graph tags
        if (this.isSocialCrawler(userAgent)) {
            return res.type('html').send(this.generateCrawlerHtml(req));
        }

        // Device-Specific Smart Routing
        if (device === 'android') {
            return res.redirect(this.PLAY_STORE_URL);
        }

        if (device === 'ios') {
            return res.redirect(this.IOS_WAITLIST_URL);
        }

        // Desktop fallback: route to Google Play Store listing so users can install or inspect the app
        return res.redirect(this.PLAY_STORE_URL);
    }

    /**
     * Returns full click analytics for admin reporting
     */
    getAnalytics() {
        return {
            summary: {
                totalClicks: this.metrics.totalClicks,
                lastClickAt: this.metrics.lastClickAt
            },
            byPlatform: this.metrics.byPlatform,
            byDevice: this.metrics.byDevice,
            byCampaign: this.metrics.byCampaign,
            recentClicks: this.recentClicks.slice(0, 50)
        };
    }
}

const smartRouterService = new SmartRouterService();
export default smartRouterService;
