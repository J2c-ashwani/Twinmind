import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';
import { sendEmail } from './emailService.js';
import { supabaseAdmin } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE_PATH = path.join(__dirname, '../../logs/acquisition_campaign_state.json');

/**
 * Permanent Suppression List
 * Reconciled from Master Register & Handover rules.
 * Never send or retry these contacts.
 */
const PERMANENT_SUPPRESSION_LIST = new Set([
    'hello@kularion.com',
    'alliances@betterup.co',
    'founder@neuralpha.in',
    'john@yube.ai',
    'hello@appexit.com',
    'offer@appsbuyout.vc',
    'acquisitions@technologico.capital',
    'hello@codewisper.com',
    'partnerships@monoapps.co.uk',
    'hello@jaycue.co.uk',
    'marc@redtech.studio',
    'listings@oebdigital.com',
    'contact@approck.com',
    'aman@kalagato.co',
    'contactus@kalagato.co',
    '1@replika.com',
    'ceo@replika.com'
]);

/**
 * Clean Seed Targets
 * Verified decision-maker routes & dedicated M&A mailboxes.
 * Safe, accurate wording matching live code and handover facts.
 */
const SEED_TARGETS = [
    {
        id: 'tgt_a2apps',
        company: 'a2 apps',
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@a2apps.co',
        routeType: 'dedicated_m_and_a',
        thesis: 'Mobile application portfolio acquirer with dedicated submission channel',
        subject: 'a2 apps — would you review TwinGenie for product/IP acquisition?',
        bodyText: `Hi Team,

I saw a2 apps specializes in acquiring and operating consumer mobile applications, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), a personal AI companion and self-reflection product I’m looking to sell as a complete software and IP asset.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch stage). There is also a functional Next.js web application and a Flutter iOS project that is built but unreleased. The platform features shared pgvector memory, 35-question personality onboarding, and four prompt-based perspectives over one context pipeline.

Would you be open to reviewing it as a technology/product acquisition rather than a revenue-multiple deal?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_ytcventures',
        company: 'YTC Ventures',
        recipientName: 'Divestments Team',
        email: 'dinvestments@ytcventures.com',
        routeType: 'dedicated_m_and_a',
        thesis: 'Official seller-side divestment & acquisition route',
        subject: 'YTC Ventures — divestment opportunity: TwinGenie software & IP',
        bodyText: `Hi Team,

I noticed YTC Ventures evaluates divestment and acquisition opportunities in consumer software, so I’m reaching out through your divestment channel. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and guided reflection platform available for strategic acquisition.

TwinGenie is live on Google Play (released Aug 24; pre-revenue, ~40 organic downloads) with a working Next.js web platform and an unreleased Flutter iOS project. The engine includes a unified pgvector memory architecture, 35-question Big Five-inspired onboarding, and multi-mode AI routing.

Would your team be open to reviewing this as an early-stage product/IP asset acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_happyharbor',
        company: 'The Happy Harbor',
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@thehappyharbor.com',
        routeType: 'dedicated_m_and_a',
        thesis: 'Evaluates early software and product IP assets case-by-case',
        subject: 'The Happy Harbor — TwinGenie software & IP acquisition opportunity',
        bodyText: `Hi Team,

I saw The Happy Harbor acquires software and mobile app assets across stages, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and reflection platform.

Android is live on Google Play since Aug 24; the project is very early and pre-revenue with ~40 organic downloads. It includes a live Next.js web application, a built Flutter iOS codebase, 35-question onboarding model, and a shared pgvector memory pipeline with multi-perspective AI chat.

Would you be open to reviewing TwinGenie as a product/technology asset acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_appsmartz',
        company: 'AppSmartz',
        recipientName: 'Atul Sachdeva',
        email: 'atul@appsmartz.com',
        routeType: 'named_founder',
        thesis: 'Acquired unMix AI; experienced mobile AI operator',
        subject: 'Atul — would AppSmartz review TwinGenie for acquisition?',
        bodyText: `Hi Atul,

I saw AppSmartz’s acquisition and scaling of unMix AI, so I wanted to connect founder-to-founder. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and self-reflection app.

Android is live on Google Play since Aug 24 with ~40 organic downloads ($0 revenue, zero paid marketing), alongside a working Next.js web app and a built Flutter iOS project. It features longitudinal pgvector semantic memory, Big Five-inspired onboarding, and four conversational perspectives over a single context pipeline.

Would you be open to reviewing it as a software and IP acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_appmasters',
        company: 'App Masters',
        recipientName: 'Steve P. Young',
        email: 'steve@appmasters.co',
        routeType: 'named_founder',
        thesis: 'App portfolio acquisition and advisory',
        subject: 'Steve — would App Masters review TwinGenie for acquisition?',
        bodyText: `Hi Steve,

I follow your work across app growth and acquisitions, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie, an AI companion app that I’m looking to sell as a complete software and IP asset.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-revenue stage) with a functional Next.js web app and built Flutter iOS codebase. It uses shared pgvector memory, personality-based onboarding, and four prompt-based perspectives over one context pipeline.

Would you be open to taking a look as a product/technology acquisition?

Best,
Ashwani
Founder, TwinGenie`
    }
];

class AcquisitionCampaignService {
    constructor() {
        this.minIntervalMinutes = 75; // Minimum 75 minutes between outbound sends
        this.dailyLimit = parseInt(process.env.CAMPAIGN_DAILY_MAX, 10) || 12;
        this.senderEmail = process.env.RESEND_FROM_EMAIL || 'Ashwani <founder@twingenie.app>';
        this.replyTo = process.env.RESEND_REPLY_TO || process.env.FOUNDER_REPLY_TO || 'founder@twingenie.app';
        this.state = this._loadState();
    }

    _loadState() {
        try {
            if (fs.existsSync(STATE_FILE_PATH)) {
                const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
                return JSON.parse(raw);
            }
        } catch (e) {
            logger.warn('Could not read existing campaign state, initializing new state:', e.message);
        }

        const initial = {
            queue: SEED_TARGETS.map(t => ({
                ...t,
                status: 'pending', // pending, sent, failed, skipped
                attempts: 0,
                lastAttemptAt: null,
                resendId: null,
                error: null
            })),
            history: [],
            sentToday: 0,
            lastSentDate: new Date().toISOString().slice(0, 10),
            lastSentTimestamp: null
        };
        this._saveState(initial);
        return initial;
    }

    _saveState(state = this.state) {
        try {
            const dir = path.dirname(STATE_FILE_PATH);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(state, null, 2), 'utf8');
        } catch (e) {
            logger.error('Failed to write campaign state file:', e);
        }
    }

    _refreshDailyQuota() {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (this.state.lastSentDate !== todayStr) {
            this.state.sentToday = 0;
            this.state.lastSentDate = todayStr;
            this._saveState();
        }
    }

    getStatus() {
        this._refreshDailyQuota();
        const pendingCount = this.state.queue.filter(q => q.status === 'pending').length;
        const sentTotal = this.state.history.length;

        return {
            campaignEnabled: process.env.CAMPAIGN_AUTORUN !== 'false',
            senderEmail: this.senderEmail,
            replyTo: this.replyTo,
            sentToday: this.state.sentToday,
            dailyLimit: this.dailyLimit,
            lastSentTimestamp: this.state.lastSentTimestamp,
            pendingInQueue: pendingCount,
            totalSentHistory: sentTotal,
            nextUp: this.state.queue.find(q => q.status === 'pending') || null
        };
    }

    /**
     * Executes one scheduled tick of the campaign.
     * Evaluates spacing, daily limits, suppression, and sends next candidate.
     */
    async executeTick() {
        this._refreshDailyQuota();

        if (process.env.CAMPAIGN_AUTORUN === 'false') {
            logger.info('[CAMPAIGN] Autorun disabled via CAMPAIGN_AUTORUN=false');
            return { action: 'skipped', reason: 'autorun_disabled' };
        }

        // Check daily limit
        if (this.state.sentToday >= this.dailyLimit) {
            logger.info(`[CAMPAIGN] Daily limit reached (${this.state.sentToday}/${this.dailyLimit})`);
            return { action: 'skipped', reason: 'daily_limit_reached' };
        }

        // Check spacing interval
        if (this.state.lastSentTimestamp) {
            const lastSent = new Date(this.state.lastSentTimestamp).getTime();
            const now = Date.now();
            const diffMinutes = (now - lastSent) / (1000 * 60);

            if (diffMinutes < this.minIntervalMinutes) {
                const waitTime = Math.round(this.minIntervalMinutes - diffMinutes);
                logger.info(`[CAMPAIGN] Interval cooling active (${waitTime}m remaining before next send)`);
                return { action: 'cooling', remainingMinutes: waitTime };
            }
        }

        // Find next eligible candidate
        const candidateIndex = this.state.queue.findIndex(t => t.status === 'pending');
        if (candidateIndex === -1) {
            logger.info('[CAMPAIGN] No pending candidates in queue');
            return { action: 'idle', reason: 'queue_empty' };
        }

        const candidate = this.state.queue[candidateIndex];

        // Check suppression
        const normEmail = candidate.email.toLowerCase().trim();
        if (PERMANENT_SUPPRESSION_LIST.has(normEmail)) {
            logger.warn(`[CAMPAIGN] Candidate ${candidate.email} is in suppression list! Skipping.`);
            candidate.status = 'skipped';
            candidate.error = 'suppressed_contact';
            this._saveState();
            return { action: 'skipped', reason: 'suppressed', candidate: candidate.email };
        }

        // Format HTML (clean, human, personal formatting)
        const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #111827;">
${candidate.bodyText.split('\n\n').map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}
</div>
`.trim();

        logger.info(`[CAMPAIGN] Dispatching outreach to ${candidate.company} (${candidate.email})...`);

        try {
            const result = await sendEmail({
                to: candidate.email,
                subject: candidate.subject,
                text: candidate.bodyText,
                html: htmlContent,
                from: this.senderEmail,
                reply_to: this.replyTo
            });

            if (result.success) {
                const nowIso = new Date().toISOString();
                candidate.status = 'sent';
                candidate.sentAt = nowIso;
                candidate.resendId = result.id;
                candidate.lastAttemptAt = nowIso;

                this.state.sentToday += 1;
                this.state.lastSentTimestamp = nowIso;
                this.state.history.push({
                    id: candidate.id,
                    company: candidate.company,
                    email: candidate.email,
                    resendId: result.id,
                    sentAt: nowIso
                });

                this._saveState();

                logger.info(`🎉 [CAMPAIGN] Successfully delivered to ${candidate.company} (ID: ${result.id})`);
                return { action: 'sent', recipient: candidate.email, company: candidate.company, id: result.id };
            } else {
                candidate.attempts += 1;
                candidate.lastAttemptAt = new Date().toISOString();
                candidate.error = result.error || 'delivery_failed';
                this._saveState();

                logger.error(`❌ [CAMPAIGN] Delivery failure for ${candidate.email}:`, result.error);
                return { action: 'failed', error: result.error };
            }
        } catch (err) {
            candidate.attempts += 1;
            candidate.lastAttemptAt = new Date().toISOString();
            candidate.error = err.message;
            this._saveState();

            logger.error(`❌ [CAMPAIGN] Exception sending to ${candidate.email}:`, err);
            return { action: 'error', error: err.message };
        }
    }
}

const acquisitionCampaignService = new AcquisitionCampaignService();
export default acquisitionCampaignService;
