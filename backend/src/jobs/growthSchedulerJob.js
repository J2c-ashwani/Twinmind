import cron from 'node-cron';
import logger from '../config/logger.js';
import growthOrchestratorService from '../services/growth/growthOrchestratorService.js';

/**
 * Growth Distribution Scheduler Job
 * Single-source schedule definitions aligned with external cron-job.org triggers (IST):
 * - LinkedIn Personal: 08:30 IST (03:00 UTC)
 * - Facebook Page Reel: 16:30 IST (11:00 UTC)
 * - Instagram Reel: 19:00 IST (13:30 UTC)
 * - Threads Micro-Essay: 19:30 IST (14:00 UTC)
 * - Nightly Fail-Safe Sweep: 23:00 IST (17:30 UTC)
 */
export function initGrowthJobs() {
    logger.info('Initializing Growth Distribution Jobs (aligned IST schedules + Boot Check + Nightly Sweep)...');

    // Note: External cron-job.org triggers primary webhooks. Set ENABLE_INTERNAL_GROWTH_TIMERS=true only if external cron is disabled.
    if (process.env.ENABLE_INTERNAL_GROWTH_TIMERS === 'true') {
        cron.schedule('30 8 * * *', async () => {
            try {
                await growthOrchestratorService.publishDailyLinkedInPersonal(false);
            } catch (e) {
                logger.error('[GROWTH JOB] 08:30 IST LinkedIn publication error:', e);
            }
        }, { timezone: 'Asia/Kolkata' });

        cron.schedule('30 16 * * *', async () => {
            try {
                await growthOrchestratorService.publishDailyFacebookReel(false);
            } catch (e) {
                logger.error('[GROWTH JOB] 16:30 IST Facebook publication error:', e);
            }
        }, { timezone: 'Asia/Kolkata' });

        cron.schedule('0 19 * * *', async () => {
            try {
                await growthOrchestratorService.publishDailyInstagram(false);
            } catch (e) {
                logger.error('[GROWTH JOB] 19:00 IST Instagram publication error:', e);
            }
        }, { timezone: 'Asia/Kolkata' });

        cron.schedule('30 19 * * *', async () => {
            try {
                await growthOrchestratorService.publishDailyThreads(false);
            } catch (e) {
                logger.error('[GROWTH JOB] 19:30 IST Threads publication error:', e);
            }
        }, { timezone: 'Asia/Kolkata' });
    }

    // Nightly Fail-Safe Sweep: 23:00 IST
    cron.schedule('0 23 * * *', async () => {
        try {
            if (growthOrchestratorService.isSystemPaused()) {
                logger.info('[GROWTH JOB] Nightly sweep skipped: system paused.');
                return;
            }
            logger.info('⏰ [GROWTH JOB] 23:00 IST Nightly fail-safe sweep...');
            await growthOrchestratorService.publishDailyLinkedInPersonal(false);
            await growthOrchestratorService.publishDailyFacebookReel(false);
            await growthOrchestratorService.publishDailyInstagram(false);
            await growthOrchestratorService.publishDailyThreads(false);
            await growthOrchestratorService.publishDailyYouTube(false);
        } catch (e) {
            logger.error('[GROWTH JOB] Nightly fail-safe sweep error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // Graceful Boot Check: respects pause state and aligned IST publication windows
    setTimeout(async () => {
        try {
            if (growthOrchestratorService.isSystemPaused()) {
                logger.info('⏸️ [GROWTH JOB] Boot check skipped: system is paused.');
                return;
            }
            logger.info('🚀 [GROWTH JOB] Performing startup durable ledger verification...');
            const nowIST = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false,
            }).format(new Date());
            const [istHour, istMin] = nowIST.split(':').map(Number);
            const istTimeNum = istHour * 60 + (istMin || 0);

            if (istTimeNum >= 510) await growthOrchestratorService.publishDailyLinkedInPersonal(false); // >= 08:30 IST
            if (istTimeNum >= 990) await growthOrchestratorService.publishDailyFacebookReel(false);      // >= 16:30 IST
            if (istTimeNum >= 1140) await growthOrchestratorService.publishDailyInstagram(false);        // >= 19:00 IST
            if (istTimeNum >= 1170) await growthOrchestratorService.publishDailyThreads(false);          // >= 19:30 IST
        } catch (e) {
            logger.warn('[GROWTH JOB] Startup check warning:', e.message);
        }
    }, 30000);

    logger.info('✅ Growth distribution scheduler active (IST aligned; external cron primary + Nightly Sweep 23:00 IST)');
}

export default { initGrowthJobs };
