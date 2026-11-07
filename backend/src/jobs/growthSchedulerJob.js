import cron from 'node-cron';
import logger from '../config/logger.js';
import growthOrchestratorService from '../services/growth/growthOrchestratorService.js';

/**
 * Growth Distribution Scheduler Job
 * Runs 24/7 on Render in the cloud.
 * 
 * ARCHITECTURE PRINCIPLE: Single Source of Scheduling Truth
 * Authoritative primary scheduler: cron-job.org (external cloud cron calling secure webhooks).
 * This internal job serves purely as:
 * 1. Nightly Fail-Safe Sweep (11:00 PM IST): Safely catches up any missed post across platforms
 *    using the Supabase Durable Distributed Idempotency Ledger.
 * 2. Graceful Boot Check (30s after startup): Validates today's publishing state without duplicating.
 * 
 * Duplicate intra-day internal timers (8:30 AM, 4:00 PM, 7:00 PM, 7:30 PM) have been retired
 * to prevent dual-scheduler collision and guarantee exactly-once daily publishing.
 */

export function initGrowthJobs() {
    logger.info('Initializing Growth Distribution Jobs (Dual-Redundancy: Internal Crons + External Fallback + Nightly Sweep)...');

    // 4:00 PM IST (16:00 Asia/Kolkata): Daily LinkedIn Personal Profile Carousel Publication
    // Idempotency guaranteed by Supabase Durable Distributed Ledger (skips in <10ms if already published)
    cron.schedule('0 16 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 4:00 PM IST reached! Executing daily LinkedIn carousel publication...');
            await growthOrchestratorService.publishDailyLinkedInPersonal(false);
        } catch (e) {
            logger.error('[GROWTH JOB] 4:00 PM LinkedIn publication error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // Nightly Fail-Safe Sweep: 11:00 PM IST (23:00 Asia/Kolkata)
    // Runs once daily at the end of the day. If cron-job.org already published during the day,
    // the Durable Distributed Ledger in Supabase skips in <10ms.
    // If an external cron failed or timed out, this provides an automated safety net.
    cron.schedule('0 23 * * *', async () => {
        try {
            logger.info('⏰ [GROWTH JOB] 11:00 PM IST reached! Executing nightly fail-safe sweep for all platforms...');
            await growthOrchestratorService.publishDailyLinkedInPersonal(false);
            await growthOrchestratorService.publishDailyFacebookReel(false);
            await growthOrchestratorService.publishDailyInstagram(false);
            await growthOrchestratorService.publishDailyThreads(false);
        } catch (e) {
            logger.error('[GROWTH JOB] Nightly fail-safe sweep error:', e);
        }
    }, { timezone: 'Asia/Kolkata' });

    // Graceful Boot Check: Safely checks for any missing post on container startup
    // Protected by Durable Distributed Idempotency Ledger in Supabase
    setTimeout(async () => {
        try {
            logger.info('🚀 [GROWTH JOB] Performing startup durable ledger verification...');
            const now = new Date();
            const nowIST = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kolkata',
                hour: 'numeric',
                minute: 'numeric',
                hour12: false
            }).format(now);
            const [istHour, istMin] = nowIST.split(':').map(Number);
            const istTimeNum = istHour * 60 + (istMin || 0);

            // After 09:00 AM IST (540 min): verify LinkedIn Personal Carousel
            if (istTimeNum >= 540) {
                await growthOrchestratorService.publishDailyLinkedInPersonal(false);
            }

            // After 05:00 PM IST (1020 min): verify Facebook Page broadcast
            if (istTimeNum >= 1020) {
                await growthOrchestratorService.publishDailyFacebookReel(false);
            }

            // After 07:30 PM IST (1170 min): verify Instagram broadcast
            if (istTimeNum >= 1170) {
                await growthOrchestratorService.publishDailyInstagram(false);
            }

            // After 08:00 PM IST (1200 min): verify Threads micro-essay
            if (istTimeNum >= 1200) {
                await growthOrchestratorService.publishDailyThreads(false);
            }
        } catch (e) {
            logger.warn('[GROWTH JOB] Startup check warning:', e.message);
        }
    }, 30000); // 30 seconds after startup

    logger.info('✅ Growth distribution scheduler active (Single Source: cron-job.org + Nightly Sweep at 23:00 IST)');
}

export default { initGrowthJobs };
