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

    // 1. Process Due Posts & Auto-Catchup Missed Daily Slots (Runs every 15 minutes)
    cron.schedule('*/15 * * * *', async () => {
        try {
            logger.info('[GROWTH JOB] Checking scheduled distribution queue...');
            const result = await growthOrchestratorService.processScheduledPosts();
            if (result.action === 'processed') {
                logger.info(`[GROWTH JOB] Processed ${result.results.length} posts.`);
            }

            // Active Catchup Safeguard (in case Render free tier was sleeping at exact trigger times)
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
            logger.error('[GROWTH JOB] Queue processing error:', e);
        }
    });

    // 2. Daily Campaign Auto-Replenishment (06:00 AM IST)
    cron.schedule('0 6 * * *', async () => {
        try {
            logger.info('[GROWTH JOB] Running daily content replenishment check...');
            const status = await growthOrchestratorService.getSystemStatus();
            if (status.queueSummary.scheduled === 0 && !status.isPaused) {
                logger.info('[GROWTH JOB] Queue empty. Auto-generating fresh 4-platform campaign bundle...');
                await growthOrchestratorService.generateAndQueueDailyCampaign();
            }
        } catch (e) {
            logger.error('[GROWTH JOB] Replenishment error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 3. Daily 08:30 AM IST LinkedIn Personal Carousel Trigger
    cron.schedule('30 8 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 08:30 AM IST reached! Triggering automated daily LinkedIn Carousel...');
            await growthOrchestratorService.publishDailyLinkedInPersonal(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 08:30 AM LinkedIn broadcast error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 4. Daily 04:00 PM IST (16:00) Facebook Reel Trigger
    cron.schedule('0 16 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 04:00 PM IST reached! Triggering automated daily Facebook Reel...');
            await growthOrchestratorService.publishDailyFacebookReel(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 04:00 PM Facebook Reel error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 5. Daily 08:30 PM IST (20:30) Evening LinkedIn Thought Leadership Trigger
    cron.schedule('30 20 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 08:30 PM IST reached! Evening check for LinkedIn carousel...');
            await growthOrchestratorService.publishDailyLinkedInPersonal(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 08:30 PM LinkedIn error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 6. Boot check: safely check scheduled queue & catch up any missed daily posts on wake
    setTimeout(async () => {
        try {
            logger.info('🚀 [GROWTH JOB] Checking for due posts and missed daily triggers on server boot...');
            await growthOrchestratorService.processScheduledPosts();

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

    logger.info('✅ Growth distribution scheduler active (15-min queue processor & daily replenishment)');
}

export default { initGrowthJobs };
