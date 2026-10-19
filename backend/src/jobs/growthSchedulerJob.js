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

    // 1. Process Due Posts (Runs every 15 minutes)
    cron.schedule('*/15 * * * *', async () => {
        try {
            logger.info('[GROWTH JOB] Checking scheduled distribution queue...');
            const result = await growthOrchestratorService.processScheduledPosts();
            if (result.action === 'processed') {
                logger.info(`[GROWTH JOB] Processed ${result.results.length} posts.`);
            }
        } catch (e) {
            logger.error('[GROWTH JOB] Queue processing error:', e);
        }
    });

    // 2. Daily Campaign Auto-Replenishment (06:00 AM IST = 00:30 UTC)
    cron.schedule('30 0 * * *', async () => {
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
    });

    // 3. Boot check: generate starter campaign & immediately dispatch any due/unposted ready platforms
    setTimeout(async () => {
        try {
            const status = await growthOrchestratorService.getSystemStatus();
            if (status.queueSummary.scheduled === 0 && status.queueSummary.published === 0) {
                logger.info('🚀 [GROWTH JOB] Seeding initial 4-platform campaign bundle on server boot...');
                await growthOrchestratorService.generateAndQueueDailyCampaign();
            }

            // Immediately check and process due posts on boot!
            logger.info('🚀 [GROWTH JOB] Checking for due posts on server boot...');
            await growthOrchestratorService.processScheduledPosts();
        } catch (e) {
            logger.warn('[GROWTH JOB] Startup check warning:', e.message);
        }
    }, 15000); // 15 seconds after startup

    logger.info('✅ Growth distribution scheduler active (15-min queue processor & daily replenishment)');
}

export default { initGrowthJobs };
