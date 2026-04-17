import cron from 'node-cron';
import reminderService from '../services/reminderService.js';
import { runProactiveMessageCheck } from '../services/proactiveMessageService.js';
import { checkMilestones } from '../services/relationshipEvolutionService.js';
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
    // 🔥 KEEP-ALIVE: Prevent Render free tier from sleeping
    // Pings own health endpoint every 14 minutes
    // Render sleeps after 15 min of inactivity — this prevents it
    // ============================================
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || process.env.WEB_APP_URL || 'http://localhost:3001';
    cron.schedule('*/14 * * * *', async () => {
        try {
            const response = await fetch(`${RENDER_URL}/health`);
            logger.info(`🏓 Keep-alive ping: ${response.status}`);
        } catch (e) {
            logger.warn('Keep-alive ping failed:', e?.message);
        }
    });

    logger.info('✅ All scheduled jobs initialized (including keep-alive)');
}

export default { initJobs };

