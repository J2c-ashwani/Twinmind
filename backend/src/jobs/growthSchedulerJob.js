import cron from 'node-cron';
import logger from '../config/logger.js';
import growthOrchestratorService from '../services/growth/growthOrchestratorService.js';

/**
 * Growth Distribution Scheduler Job
 * Runs 24/7 on Render in the cloud.
 * - Every 15 minutes: checks and processes due posts for LinkedIn, Instagram, Facebook & YouTube.
 * - Daily at 06:00 AM IST: ensures the daily campaign bundle is generated and scheduled if queue is empty.
 */

export function initGrowthJobs() {
    logger.info('Initializing Growth Distribution Jobs...');

    // 1. Periodic Catchup Safeguard (Runs every 15 minutes to guarantee no missed broadcasts if server slept)
    cron.schedule('*/15 * * * *', async () => {
        try {
            const now = new Date();
            const nowIST = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            }).format(now);
            const [istHour, istMin] = nowIST.split(':').map(Number);
            const istTimeNum = istHour * 60 + (istMin || 0);

            // After 08:30 AM IST (510 min): ensure LinkedIn Personal Carousel is published
            if (istTimeNum >= 510) {
                await growthOrchestratorService.publishDailyLinkedInPersonal(false);
            }

            // After 04:00 PM IST (960 min): ensure Facebook Page Reel/Carousel is published
            if (istTimeNum >= 960) {
                await growthOrchestratorService.publishDailyFacebookReel(false);
            }
        } catch (e) {
            logger.error('[GROWTH JOB] Catchup processing error:', e);
        }
    });

    // 2. Daily 08:30 AM IST LinkedIn Personal Carousel Trigger
    cron.schedule('30 8 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 08:30 AM IST reached! Triggering automated daily LinkedIn Carousel...');
            await growthOrchestratorService.publishDailyLinkedInPersonal(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 08:30 AM LinkedIn broadcast error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 3. Daily 04:00 PM IST (16:00) Facebook Reel / Carousel Trigger
    cron.schedule('0 16 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 04:00 PM IST reached! Triggering automated daily Facebook broadcast...');
            await growthOrchestratorService.publishDailyFacebookReel(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 04:00 PM Facebook broadcast error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 4. Daily 08:30 PM IST (20:30) Evening Verification Trigger
    cron.schedule('30 20 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 08:30 PM IST reached! Evening verification for LinkedIn & Facebook...');
            await growthOrchestratorService.publishDailyLinkedInPersonal(false);
            await growthOrchestratorService.publishDailyFacebookReel(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 08:30 PM evening broadcast verification error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 5. Boot check: safely catch up any missed daily posts on wake/restart
    setTimeout(async () => {
        try {
            logger.info('🚀 [GROWTH JOB] Checking for missed daily triggers on server boot...');
            const now = new Date();
            const nowIST = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            }).format(now);
            const [istHour, istMin] = nowIST.split(':').map(Number);
            const istTimeNum = istHour * 60 + (istMin || 0);

            // After 08:30 AM IST (510 min): ensure LinkedIn Personal Carousel is published
            if (istTimeNum >= 510) {
                await growthOrchestratorService.publishDailyLinkedInPersonal(false);
            }

            // After 04:00 PM IST (960 min): ensure Facebook Page Reel/Carousel is published
            if (istTimeNum >= 960) {
                await growthOrchestratorService.publishDailyFacebookReel(false);
            }
        } catch (e) {
            logger.warn('[GROWTH JOB] Startup check warning:', e.message);
        }
    }, 15000); // 15 seconds after startup

    logger.info('✅ Growth distribution scheduler active (Dedicated Daily Broadcasts & Catchup)');
}

export default { initGrowthJobs };
