import cron from 'node-cron';
import reminderService from '../services/reminderService.js';
import { runProactiveMessageCheck } from '../services/proactiveMessageService.js';
import { checkMilestones } from '../services/relationshipEvolutionService.js';
import insightsService from '../services/insightsService.js';
import { executeDripCampaignCheck } from '../services/dripCampaignService.js';
import acquisitionCampaignService from '../services/acquisitionCampaignService.js';
import prOutreachService from '../services/prOutreachService.js';
import investorOutreachService from '../services/investorOutreachService.js';
import { initGrowthJobs } from './growthSchedulerJob.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

const DEFAULT_TIMEZONE = process.env.CRON_TIMEZONE || 'Asia/Kolkata';

async function getRecentlyActiveUserIds(hours = 48, limit = 100) {
    const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseAdmin
        .from('chat_history')
        .select('user_id')
        .eq('sender', 'user')
        .gte('created_at', sinceIso)
        .limit(limit * 5);

    if (error) {
        logger.warn('Failed to fetch recently active users:', error.message);
        return [];
    }

    return Array.from(new Set((data || []).map((r) => r.user_id).filter(Boolean))).slice(0, limit);
}

/**
 * Initialize scheduled jobs with explicit timezones and valid interval timing
 */
export function initJobs() {
    logger.info(`Initializing scheduled jobs (timezone=${DEFAULT_TIMEZONE})...`);

    // Smart Reminders: 09:00 and 18:00 IST
    cron.schedule('0 9,18 * * *', async () => {
        logger.info('Running scheduled job: Smart Reminders');
        await reminderService.generateSmartReminders();
    }, { timezone: DEFAULT_TIMEZONE });

    // Proactive Messages: 08:00 and 19:00 IST
    cron.schedule('0 8,19 * * *', async () => {
        logger.info('Running scheduled job: Proactive Messages');
        try {
            await runProactiveMessageCheck();
        } catch (e) {
            logger.error('Proactive message check failed:', e);
        }
    }, { timezone: DEFAULT_TIMEZONE });

    // 7-Day Re-engagement Drip Campaign: 10:00 and 18:00 IST
    cron.schedule('0 10,18 * * *', async () => {
        logger.info('Running scheduled job: 7-Day Re-engagement Drip Campaign');
        try {
            await executeDripCampaignCheck();
        } catch (e) {
            logger.error('Drip campaign job failed:', e);
        }
    }, { timezone: DEFAULT_TIMEZONE });

    // Nightly Relationship Milestones: 23:00 IST (connected to active users)
    cron.schedule('0 23 * * *', async () => {
        logger.info('Running scheduled job: Relationship Milestones');
        try {
            const activeIds = await getRecentlyActiveUserIds(72, 100);
            for (const userId of activeIds) {
                await checkMilestones(userId).catch((e) =>
                    logger.warn(`Milestone check skipped for ${userId}: ${e.message}`)
                );
            }
            logger.info(`Relationship milestone check completed for ${activeIds.length} active users.`);
        } catch (e) {
            logger.error('Nightly relationship milestones job failed:', e);
        }
    }, { timezone: DEFAULT_TIMEZONE });

    // Nightly Daily Insights: 22:00 IST (connected to active users)
    cron.schedule('0 22 * * *', async () => {
        logger.info('Running scheduled job: Daily Insights');
        try {
            const activeIds = await getRecentlyActiveUserIds(24, 50);
            for (const userId of activeIds) {
                await insightsService.generateDailyInsight(userId).catch((e) =>
                    logger.warn(`Daily insight skipped for ${userId}: ${e.message}`)
                );
            }
            logger.info(`Nightly insights generated for ${activeIds.length} active users.`);
        } catch (e) {
            logger.error('Nightly daily insights job failed:', e);
        }
    }, { timezone: DEFAULT_TIMEZONE });

    if (process.env.NODE_ENV === 'development') {
        setTimeout(() => {
            logger.info('Running startup check for reminders (Dev Mode)');
            reminderService.generateSmartReminders();
        }, 10000);
    }

    // Keep-Alive every 5 minutes (valid standard cron step)
    const primaryRenderUrl = process.env.RENDER_EXTERNAL_URL || 'https://twingenie.app';
    const fallbackRenderUrl = 'https://twinmind-9l6x.onrender.com';

    cron.schedule('*/5 * * * *', async () => {
        try {
            for (const u of [primaryRenderUrl, fallbackRenderUrl]) {
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
    }, { timezone: DEFAULT_TIMEZONE });

    // Outreach internal backup ticks (using exact ms intervals instead of invalid/skewed */45, */50, */75 cron syntax)
    if (process.env.ENABLE_INTERNAL_OUTREACH_TIMERS !== 'false') {
        setInterval(() => {
            acquisitionCampaignService.executeTick().catch((e) =>
                logger.error('Acquisition campaign execution tick failed:', e)
            );
        }, 45 * 60 * 1000).unref();

        setInterval(() => {
            prOutreachService.executeTick().catch((e) =>
                logger.error('PR outreach execution tick failed:', e)
            );
        }, 50 * 60 * 1000).unref();

        setInterval(() => {
            investorOutreachService.executeTick().catch((e) =>
                logger.error('Investor outreach execution tick failed:', e)
            );
        }, 75 * 60 * 1000).unref();
    }

    initGrowthJobs();

    logger.info('✅ All scheduled jobs initialized (IST core schedules + exact outreach intervals + Growth)');
}

export default { initJobs };
