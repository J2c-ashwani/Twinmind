import cron from 'node-cron';
import reminderService from '../services/reminderService.js';
import { runProactiveMessageCheck } from '../services/proactiveMessageService.js';
import { checkMilestones } from '../services/relationshipEvolutionService.js';
import { executeDripCampaignCheck } from '../services/dripCampaignService.js';
import acquisitionCampaignService from '../services/acquisitionCampaignService.js';
import { initGrowthJobs } from './growthSchedulerJob.js';
import logger from '../config/logger.js';

/**
 * Initialize scheduled jobs
 */
export function initJobs() {
    logger.info('Initializing scheduled jobs...');

    // Run Smart Reminder generation every day at 9:00 AM and 6:00 PM
    cron.schedule('0 9,18 * * *', async () => {
        logger.info('Running scheduled job: Smart Reminders');
        await reminderService.generateSmartReminders();
    });

    // Run Proactive Messages check at 8:00 AM (morning check-in) and 7:00 PM (evening reflection)
    cron.schedule('0 8,19 * * *', async () => {
        logger.info('Running scheduled job: Proactive Messages');
        try {
            await runProactiveMessageCheck();
        } catch (e) {
            logger.error('Proactive message check failed:', e);
        }
    });

    // Run 7-Day Re-engagement Drip Campaign check twice daily at 10:00 AM and 6:00 PM
    cron.schedule('0 10,18 * * *', async () => {
        logger.info('Running scheduled job: 7-Day Re-engagement Drip Campaign');
        try {
            await executeDripCampaignCheck();
        } catch (e) {
            logger.error('Drip campaign job failed:', e);
        }
    });

    // Run Milestone checks once daily at 11:00 PM
    cron.schedule('0 23 * * *', async () => {
        logger.info('Running scheduled job: Relationship Milestones');
        // Note: In production, iterate all active users
        // For now, this runs the check for users who were active
    });

    // Run Daily Insights generation every night at 10:00 PM
    cron.schedule('0 22 * * *', async () => {
        logger.info('Running scheduled job: Daily Insights');
        // In a real app, we'd iterate all active users. 
        // For MVP, we'll rely on the service to find active users or trigger per user.
        // Here we'll just log placeholder as we need a way to get all user IDs in the service

        // Implementation note: Ideally create a bulk generation function in insightsService
    });

    // Also run once on startup for testing (in dev mode)
    if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
            logger.info('Running startup check for reminders (Dev Mode)');
            reminderService.generateSmartReminders();
        }, 10000); // Run 10 seconds after startup
    }

    // ============================================
    // 🔥 KEEP-ALIVE: Prevent Render free tier from sleeping (Active 24/7)
    // Pings Render router every 5 minutes (Render sleep threshold is 15 minutes)
    // Hits both the direct Render URL and custom domain to keep router active
    // ============================================
    const primaryRenderUrl = process.env.RENDER_EXTERNAL_URL || 'https://twingenie.app';
    const fallbackRenderUrl = 'https://twinmind-9l6x.onrender.com';

    cron.schedule('*/5 * * * *', async () => {
        try {
            const urls = [primaryRenderUrl, fallbackRenderUrl];
            for (const u of urls) {
                try {
                    const res = await fetch(`${u}/health`, { signal: AbortSignal.timeout(10000) });
                    logger.info(`🏓 [KEEP-ALIVE] Ping to ${u}/health: ${res.status}`);
                } catch (err) {
                    logger.warn(`[KEEP-ALIVE] Ping to ${u} failed: ${err.message}`);
                }
            }
        } catch (e) {
            logger.warn('[KEEP-ALIVE] Keep-alive routine error:', e?.message);
        }
    });

    // ============================================
    // 🚀 M&A ACQUISITION CAMPAIGN AUTONOMOUS RUNNER
    // Runs every 45 minutes, evaluating interval cooling (55m),
    // North Star business hours (Mon-Fri 9-5 EST), and daily caps (8/day).
    // Note: Boot trigger removed to prevent spamming on Render restarts.
    // ============================================
    cron.schedule('*/45 * * * *', async () => {
        try {
            logger.info('Running scheduled job: M&A Acquisition Campaign Tick');
            await acquisitionCampaignService.executeTick();
        } catch (e) {
            logger.error('Acquisition campaign execution tick failed:', e);
        }
    });

    // Initialize Four-Platform Growth Distribution Jobs
    initGrowthJobs();

    logger.info('✅ All scheduled jobs initialized (including keep-alive, M&A campaign, & Four-Platform Growth)');
}

export default { initJobs };

