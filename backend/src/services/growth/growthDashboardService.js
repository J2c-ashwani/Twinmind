import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../../config/supabase.js';
import prOutreachService from '../prOutreachService.js';
import investorOutreachService from '../investorOutreachService.js';
import acquisitionCampaignService from '../acquisitionCampaignService.js';
import logger from '../../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DASHBOARD_LOG_PATH = path.join(__dirname, '../../../logs/daily_growth_metrics.json');

const INTERNAL_EMAIL_PATTERNS = [
    'test',
    'demo',
    'example',
    'twingenie.com',
    'admin',
    'john.doe',
    'tempmail',
    'edu.pl',
    'dummy',
    'join2campus',
    'ashw',
    'controlled_test',
];

function isCleanProductionAccount(u) {
    const email = (u.email || '').toLowerCase().trim();
    const createdDate = new Date(u.created_at);
    if (createdDate < new Date('2026-08-01')) return false;
    if (email.endsWith('@twingenie.app') || email.endsWith('@twingenie.test') || email.includes('ashwani')) return false;
    return !INTERNAL_EMAIL_PATTERNS.some((k) => email.includes(k));
}

async function fetchAllRows(table, selectColumns, pageSize = 1000) {
    const rows = [];
    let from = 0;

    while (true) {
        const { data, error } = await supabaseAdmin
            .from(table)
            .select(selectColumns)
            .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!Array.isArray(data) || data.length === 0) break;

        rows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
    }

    return rows;
}

function summarizeLeadStatuses(rows = []) {
    const summary = {
        total: rows.length,
        pending: 0,
        sending: 0,
        sent: 0,
        bounced: 0,
        failed: 0,
        unsubscribed: 0,
        skipped: 0,
    };

    for (const row of rows) {
        const st = String(row.status || '').toLowerCase();
        if (summary[st] !== undefined) {
            summary[st] += 1;
        }
    }

    return summary;
}

/**
 * Growth Dashboard Service
 * Aggregates measured KPIs across Signups, Onboarding, Activation, Retention, and Outbound Status.
 * Zero hardcoded claims; distinguishes recorded dispatches from verified delivery/replies.
 */
class GrowthDashboardService {
    async getWeeklyMetrics({ saveSnapshot = false } = {}) {
        let historicalTotalUsers = 0;
        let excludedInternalUsers = 0;
        let cleanProductionUsers = [];
        let cleanCompletedProfiles = 0;
        let cleanActivatedUsers = 0;
        let cleanMultiDayRetainedUsers = 0;
        let cleanUserAuthoredChats = 0;
        let cleanTotalChats = 0;
        let active30DayUsers = 0;
        let outboundByTrack = {
            pr: summarizeLeadStatuses([]),
            investor: summarizeLeadStatuses([]),
            acquisition: summarizeLeadStatuses([]),
        };
        let clickEventCount = 0;

        try {
            const [allUsers, allProfiles, allChats, allLeads, clickCountRes] = await Promise.all([
                fetchAllRows('users', 'id, email, created_at'),
                fetchAllRows('personality_profiles', 'user_id'),
                fetchAllRows('chat_history', 'user_id, sender, created_at'),
                fetchAllRows('outreach_campaign_leads', 'campaign_type, status'),
                supabaseAdmin
                    .from('acquisition_click_events')
                    .select('id', { count: 'exact', head: true })
                    .then((r) => r.count || 0)
                    .catch(() => 0),
            ]);

            historicalTotalUsers = allUsers.length;
            cleanProductionUsers = allUsers.filter(isCleanProductionAccount);
            excludedInternalUsers = Math.max(0, historicalTotalUsers - cleanProductionUsers.length);
            const cleanUserIds = new Set(cleanProductionUsers.map((u) => u.id));

            cleanCompletedProfiles = allProfiles.filter((p) => cleanUserIds.has(p.user_id)).length;

            const cleanChats = allChats.filter((c) => cleanUserIds.has(c.user_id));
            cleanTotalChats = cleanChats.length;
            const cleanUserMessages = cleanChats.filter((c) => c.sender === 'user');
            cleanUserAuthoredChats = cleanUserMessages.length;

            cleanActivatedUsers = new Set(cleanUserMessages.map((c) => c.user_id)).size;

            const userDays = {};
            for (const c of cleanUserMessages) {
                const day = String(c.created_at).slice(0, 10);
                if (!userDays[c.user_id]) userDays[c.user_id] = new Set();
                userDays[c.user_id].add(day);
            }
            cleanMultiDayRetainedUsers = Object.keys(userDays).filter((uid) => userDays[uid].size > 1).length;

            // Count ONLY human-authored messages for 30-day active users (exclude seeded AI messages)
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const recentHumanChats = cleanUserMessages.filter((c) => c.created_at >= thirtyDaysAgo);
            active30DayUsers = new Set(recentHumanChats.map((c) => c.user_id)).size;

            outboundByTrack = {
                pr: summarizeLeadStatuses(allLeads.filter((l) => l.campaign_type === 'pr')),
                investor: summarizeLeadStatuses(allLeads.filter((l) => l.campaign_type === 'investor')),
                acquisition: summarizeLeadStatuses(allLeads.filter((l) => l.campaign_type === 'acquisition')),
            };

            clickEventCount = clickCountRes;
        } catch (dbErr) {
            logger.warn(`[DASHBOARD] Could not query Supabase cleanly: ${dbErr.message}`);
        }

        const prStatus = prOutreachService.getStatus();
        const invStatus = investorOutreachService.getStatus();
        const maStatus = acquisitionCampaignService.getStatus();

        const totalDispatched =
            outboundByTrack.pr.sent + outboundByTrack.investor.sent + outboundByTrack.acquisition.sent;
        const totalBounced =
            outboundByTrack.pr.bounced + outboundByTrack.investor.bounced + outboundByTrack.acquisition.bounced;
        const totalFailed =
            outboundByTrack.pr.failed + outboundByTrack.investor.failed + outboundByTrack.acquisition.failed;
        const totalAttempts = totalDispatched + totalBounced + totalFailed;
        const observedNonBounceRate =
            totalAttempts > 0 ? (((totalAttempts - totalBounced - totalFailed) / totalAttempts) * 100).toFixed(1) + '%' : 'N/A';

        const prodCount = cleanProductionUsers.length;
        const onboardingRate = prodCount > 0 ? ((cleanCompletedProfiles / prodCount) * 100).toFixed(1) + '%' : '0%';
        const activationRate = prodCount > 0 ? ((cleanActivatedUsers / prodCount) * 100).toFixed(1) + '%' : '0%';
        const repeatRate =
            cleanActivatedUsers > 0 ? ((cleanMultiDayRetainedUsers / cleanActivatedUsers) * 100).toFixed(1) + '%' : '0%';

        const dashboard = {
            generatedAt: new Date().toISOString(),
            cohortAudit: {
                historicalDatabaseTotalUsers: historicalTotalUsers,
                internalDevDemoExcluded: excludedInternalUsers,
                cleanProductionSignups: prodCount,
                completedOnboarding: cleanCompletedProfiles,
                trueOnboardingCompletionRate: onboardingRate,
                activatedChatUsers: cleanActivatedUsers,
                trueFirstChatActivationRate: activationRate,
                multiDayRetainedUsers: cleanMultiDayRetainedUsers,
                repeatChatRate: repeatRate,
                thirtyDayActiveUsers: active30DayUsers,
                realUserAuthoredMessages: cleanUserAuthoredChats,
                totalRealChatInteractions: cleanTotalChats,
                attributedDownloadClicks: clickEventCount,
            },
            kpis: [
                {
                    area: 'Acquisition & Signups',
                    primaryKpi: 'Post-launch heuristic cohort (email/date filter)',
                    currentValue: `${prodCount} accounts (${excludedInternalUsers} internal/pre-launch excluded)`,
                    numerator: prodCount,
                    denominator: historicalTotalUsers,
                    status: `${clickEventCount} durable download click(s) recorded`,
                },
                {
                    area: 'Onboarding Funnel',
                    primaryKpi: 'Onboarding profile completion',
                    currentValue: `${cleanCompletedProfiles} / ${prodCount} (${onboardingRate})`,
                    numerator: cleanCompletedProfiles,
                    denominator: prodCount,
                    status: 'Measured on clean cohort accounts',
                },
                {
                    area: 'Activation',
                    primaryKpi: 'Users with >= 1 human-authored message',
                    currentValue: `${cleanActivatedUsers} / ${prodCount} (${activationRate})`,
                    numerator: cleanActivatedUsers,
                    denominator: prodCount,
                    status: 'Excludes AI-seeded opening messages',
                },
                {
                    area: 'Repeat Activity',
                    primaryKpi: 'Chatters active on > 1 UTC calendar day',
                    currentValue: `${cleanMultiDayRetainedUsers} / ${cleanActivatedUsers} (${repeatRate})`,
                    numerator: cleanMultiDayRetainedUsers,
                    denominator: cleanActivatedUsers,
                    status: `${active30DayUsers} distinct human chatter(s) in last 30 days`,
                },
                {
                    area: 'PR Outreach Dispatches',
                    primaryKpi: 'API-recorded email dispatches (inbox replies unmeasured)',
                    currentValue: `${outboundByTrack.pr.sent} sent, ${outboundByTrack.pr.bounced} bounced, ${outboundByTrack.pr.failed} failed, ${outboundByTrack.pr.pending} pending`,
                    status: prStatus.campaignEnabled ? 'Running (America/New_York business hours)' : 'Paused',
                },
                {
                    area: 'Investor Outreach Dispatches',
                    primaryKpi: 'API-recorded email dispatches (replies tracked manually)',
                    currentValue: `${outboundByTrack.investor.sent} sent, ${outboundByTrack.investor.bounced} bounced, ${outboundByTrack.investor.failed} failed, ${outboundByTrack.investor.pending} pending`,
                    status: invStatus.campaignEnabled ? 'Running (America/New_York business hours)' : 'Paused',
                },
                {
                    area: 'M&A Outreach Dispatches',
                    primaryKpi: 'API-recorded email dispatches (replies tracked manually)',
                    currentValue: `${outboundByTrack.acquisition.sent} sent, ${outboundByTrack.acquisition.bounced} bounced, ${outboundByTrack.acquisition.unsubscribed} unsubscribed, ${outboundByTrack.acquisition.pending} pending`,
                    status: maStatus.campaignEnabled ? 'Running (America/New_York business hours)' : 'Paused',
                },
                {
                    area: 'Outbound Dispatch Health',
                    primaryKpi: 'Recorded API acceptances vs recorded bounces/failures',
                    currentValue: `${totalDispatched} sent | ${totalBounced} bounced | ${totalFailed} failed | ${observedNonBounceRate} non-bounce rate`,
                    status: 'Reflects recorded API send outcomes; inbox placement is external',
                },
            ],
            outboundTracks: {
                pr: {
                    ...outboundByTrack.pr,
                    sentToday: prStatus.sentToday,
                    dailyLimit: prStatus.dailyLimit,
                    nextUp: prStatus.nextUp ? `${prStatus.nextUp.recipientName} (${prStatus.nextUp.publication})` : 'Queue empty',
                },
                investors: {
                    ...outboundByTrack.investor,
                    sentToday: invStatus.sentToday,
                    dailyLimit: invStatus.dailyLimit,
                    nextUp: invStatus.nextUp ? `${invStatus.nextUp.name} (${invStatus.nextUp.firm})` : 'Queue empty',
                },
                ma: {
                    ...outboundByTrack.acquisition,
                    sentToday: maStatus.sentToday,
                    dailyLimit: maStatus.dailyLimit,
                    nextUp: maStatus.nextUp ? `${maStatus.nextUp.recipientName || maStatus.nextUp.company} (${maStatus.nextUp.company})` : 'Queue empty',
                },
            },
        };

        if (saveSnapshot) {
            this._saveSnapshot(dashboard);
        }
        return dashboard;
    }

    _saveSnapshot(dashboard) {
        try {
            const dir = path.dirname(DASHBOARD_LOG_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(DASHBOARD_LOG_PATH, JSON.stringify(dashboard, null, 2), 'utf8');
        } catch (e) {
            logger.warn(`[DASHBOARD] Could not write snapshot: ${e.message}`);
        }
    }
}

const growthDashboardService = new GrowthDashboardService();
export default growthDashboardService;
