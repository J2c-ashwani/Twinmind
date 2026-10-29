import cron from 'node-cron';
import logger from '../config/logger.js';
import growthOrchestratorService from '../services/growth/growthOrchestratorService.js';

/**
 * Growth Distribution Scheduler Job
 * Runs 24/7 on Render in the cloud.
 * Dedicated scheduled daily broadcasts:
 * - 08:30 AM IST: LinkedIn Personal Carousel
 * - 04:00 PM IST: Facebook Reel / Carousel
 * - 07:00 PM IST: Instagram Carousel (@twingenie.app)
 * - 08:30 PM IST: Evening Verification (safely catches up any missed post across all platforms)
 */

export function initGrowthJobs() {
    logger.info('Initializing Growth Distribution Jobs...');

    // 1. Daily 08:30 AM IST LinkedIn Personal Carousel Trigger
    cron.schedule('30 8 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 08:30 AM IST reached! Triggering automated daily LinkedIn Carousel...');
            await growthOrchestratorService.publishDailyLinkedInPersonal(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 08:30 AM LinkedIn broadcast error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 2. Daily 04:00 PM IST (16:00) Facebook Reel / Carousel Trigger
    cron.schedule('0 16 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 04:00 PM IST reached! Triggering automated daily Facebook broadcast...');
            await growthOrchestratorService.publishDailyFacebookReel(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 04:00 PM Facebook broadcast error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 3. Daily 07:00 PM IST (19:00) Instagram Carousel Trigger
    cron.schedule('0 19 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 07:00 PM IST reached! Triggering automated daily Instagram broadcast...');
            await growthOrchestratorService.publishDailyInstagram(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 07:00 PM Instagram broadcast error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 4. Daily 08:30 PM IST (20:30) Evening Verification Trigger
    // Runs once daily to safely catch up any missed daily post across platforms
    cron.schedule('30 20 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 08:30 PM IST reached! Evening verification for LinkedIn, Facebook & Instagram...');
            await growthOrchestratorService.publishDailyLinkedInPersonal(false);
            await growthOrchestratorService.publishDailyFacebookReel(false);
            await growthOrchestratorService.publishDailyInstagram(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 08:30 PM evening broadcast verification error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // 5. Boot check: safely catch up any missed daily posts on wake/restart (with mutex & date protection)
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

            // After 07:00 PM IST (1140 min): ensure Instagram Carousel is published
            if (istTimeNum >= 1140) {
                await growthOrchestratorService.publishDailyInstagram(false);
            }
        } catch (e) {
            logger.warn('[GROWTH JOB] Startup check warning:', e.message);
        }
    }, 20000); // 20 seconds after startup

    logger.info('✅ Growth distribution scheduler active (Dedicated Daily Broadcasts & Evening Catchup)');
}

export default { initGrowthJobs };
