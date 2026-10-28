import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';
import { sendEmail } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE_PATH = path.join(__dirname, '../../logs/investor_outreach_state.json');

/**
 * US Business Hours check (Eastern / Pacific window: Mon-Fri 9:00 AM - 5:00 PM EST)
 * Ensures investor outreach reaches angels and VCs when they are reviewing dealflow.
 */
function isUSInvestorBusinessHours() {
    try {
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            hour12: false,
            weekday: 'short'
        });
        const parts = formatter.formatToParts(new Date());

        let hourStr = '';
        let weekdayStr = '';
        for (const part of parts) {
            if (part.type === 'hour') hourStr = part.value;
            if (part.type === 'weekday') weekdayStr = part.value;
        }

        const hour = parseInt(hourStr, 10);
        const isWeekend = weekdayStr === 'Sat' || weekdayStr === 'Sun';
        const isHours = hour >= 9 && hour < 17 && !isWeekend;

        return {
            isHours,
            reason: `US Eastern Time: ${weekdayStr} ${hour}:00 (Target window: Mon-Fri 9:00-17:00 EST)`
        };
    } catch (e) {
        return { isHours: true, reason: `Intl fallback (${e.message})` };
    }
}

/**
 * Verified Pre-Seed & Seed Consumer AI Investors & Angels
 * Narrative:
 * 1. The Context Amnesia Problem: Generic foundation models lack longitudinal memory and default to sycophancy.
 * 2. The Zero-Party Cognitive Graph (Data Moat): 35-vector Big Five onboarding baseline + pgvector longitudinal tracking.
 * 3. Defensibility: Generic chatbots cannot clone TwinGenie's retention moat because they don't own the user's historical baseline.
 * 4. Status: Production Android app on Google Play, Next.js web platform, self-funded MVP.
 */
const INVESTOR_TARGETS = [
    {
        id: 'inv_olivia_moore',
        name: 'Olivia Moore',
        email: 'omoore@a16z.com',
        firm: 'Andreessen Horowitz (a16z)',
        focus: 'Consumer AI & Early-Stage Startups',
        subject: 'TwinGenie (Pre-Seed): Building the zero-party cognitive graph for consumer AI',
        bodyText: `Hi Olivia,

I follow your research at a16z on the Top 100 Consumer AI apps, particularly your analysis of retention cliffs in companion and conversational AI.

The core reason consumer AI chatbots experience high D30 churn is context amnesia and sycophancy. Because models have no longitudinal baseline, they default to empty cheerleading and mirror the user's confirmation bias.

I’m Ashwani, founder of TwinGenie (https://twingenie.app). We are building what we call the "Zero-Party Cognitive Graph" for consumer AI:
• 35-Vector Baseline Calibration: Before their first session, users complete an onboarding assessment across the Big Five personality traits (94.0% completion rate), establishing an objective cognitive baseline.
• Longitudinal Context Moat: Built on PostgreSQL + pgvector, TwinGenie tracks user rationalizations, goal drift, and behavioral patterns over weeks, rather than treating each chat as day zero.
• The Anti-Sycophancy Positioning: 4 real-time cognitive perspectives (Baseline, 5-Year Future Self, Clinical Therapist, and Honest Twin). Honest Mode calls out avoidance and excuses with zero flattery—while enforcing a Single-Strike guardrail to protect user dignity.

Just as Cred built an irreplaceable data moat around creditworthiness, TwinGenie captures the high-resolution psychographic context layer that commodity foundation models can never replicate.

We are an early-stage, self-funded team with a live production Android app on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) and a responsive Next.js web platform.

We are opening a pre-seed angel round to accelerate North American distribution. Can I share our 1-page memo or set up test access for you?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'inv_justine_moore',
        name: 'Justine Moore',
        email: 'jmoore@a16z.com',
        firm: 'Andreessen Horowitz (a16z)',
        focus: 'AI Applications & Foundation Models',
        subject: 'TwinGenie (Pre-Seed): The defensible personalization layer above commodity LLMs',
        bodyText: `Hi Justine,

I follow your work at a16z mapping out the application layer of generative AI.

While foundation models continue to commoditize, the defensibility battle is shifting to proprietary context: whoever captures deep zero-party user data owns retention.

I built TwinGenie (https://twingenie.app) to solve the sycophancy and amnesia problem in consumer AI:
1. Calibrated Cognitive Baseline: A 35-question Big Five onboarding maps the user's blind spots before chat begins.
2. Longitudinal Semantic Graph: Powered by pgvector, TwinGenie stores behavioral memory across time to detect recurring excuses, avoidance, and goal divergence.
3. 4-Perspective Interface: Users examine dilemmas through Baseline, 5-Year Future Self, Therapist, and an uncompromising Honest Twin.

This zero-party psychographic graph creates an un-cloneable switching barrier: once a user builds 60 days of calibrated cognitive history in TwinGenie, starting fresh with ChatGPT feels like talking to a stranger.

Live Android app is in production on Google Play and web app is active.

We’re raising a lean pre-seed round to scale US acquisition. Would you be open to reviewing our 1-page memo?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'inv_roy_bahat',
        name: 'Roy Bahat',
        email: 'roy@bloombergbeta.com',
        firm: 'Bloomberg Beta',
        focus: 'Future of Work, Personal Intelligence & AI',
        subject: 'Roy — TwinGenie (Pre-Seed): Cognitive reflection without the sycophancy trap',
        bodyText: `Hi Roy,

I’ve followed Bloomberg Beta’s investments in personal intelligence and tools that make humans more capable and self-aware.

Most conversational AI is optimized for conversational appeasement: it tells users whatever flatters their comfort zone. If someone spends hours procrastinating or rationalizing self-sabotage, standard chatbots cheerfully validate the avoidance.

I built TwinGenie (https://twingenie.app) as an uncompromising cognitive mirror:
• Baseline Architecture: 35-question Big Five onboarding benchmarks cognitive baseline upfront (94.0% completion rate).
• Persistent Memory: Built with pgvector to track long-term behavioral drift, calling out repeated contradictions over time.
• 4 Distinct Lenses: Baseline, 5-Year Future Self, Therapist, and Honest Shadow.

The core asset is our longitudinal zero-party data graph—capturing the evolving psychographic and behavioral patterns of individuals over time.

We are completely self-funded, with a live Android app on Google Play and a Next.js web application. We're assembling a group of high-conviction angels for our pre-seed round.

Can I send over our 1-page investment summary?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'inv_john_borthwick',
        name: 'John Borthwick',
        email: 'john@betaworks.com',
        firm: 'Betaworks',
        focus: 'AI Companions, Synthetic Humans & Interface Evolution',
        subject: 'John — TwinGenie (Pre-Seed): Moving beyond agreeable AI companions',
        bodyText: `Hi John,

I follow Betaworks’ pioneering thesis around AI companions, synthetic humans, and personal computing interfaces.

The first generation of companion AI (Replika, Character.ai) grew rapidly by optimizing for emotional validation. But users are now experiencing "sycophancy fatigue"—conversational agents that agree with every delusion feel intellectually hollow.

TwinGenie (https://twingenie.app) is engineered around self-reflection and radical candor:
• Calibrated Baseline: 35-question Big Five psychographic baseline before chat begins.
• Longitudinal Context Moat: PostgreSQL + pgvector tracks behavioral patterns, broken commitments, and excuses across weeks.
• 4 Cognitive Modes: Baseline, 5-Year Future Self, Clinical Therapist, and Honest Twin (single-strike guardrail: challenges avoidance without attacking self-worth).

By owning the user’s historical cognitive graph, TwinGenie builds a defensible retention moat above commodity LLMs.

Live production Android app on Google Play and responsive web platform. We're kicking off pre-seed discussions with consumer AI specialists.

Would you be open to a 10-minute demo or reviewing our 1-page memo?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'inv_sahil_lavingia',
        name: 'Sahil Lavingia',
        email: 'sahil@shl.vc',
        firm: 'SHL Capital',
        focus: 'Solo Technical Founders & Consumer Software',
        subject: 'Sahil — TwinGenie (Pre-Seed): An AI that refuses to flatter you (live on Google Play)',
        bodyText: `Hi Sahil,

I love your minimalist entrepreneurship ethos and your focus on technical founders who ship real code rather than pitch decks.

I built TwinGenie (https://twingenie.app) as a solo technical founder:
• What it is: A personal AI twin that refuses to validate your excuses.
• The Engine: 35-question Big Five onboarding baseline + pgvector longitudinal memory that catches your serial procrastination over weeks.
• Status: 100% self-funded, production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app), working Next.js web app.
• Positioning: Less validation. More self-understanding.

We’re raising a small pre-seed angel round (\$150k-\$250k checks) to kickstart US creator and video distribution.

Can I send over our 1-page teardown and metrics?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'inv_packy_mccormick',
        name: 'Packy McCormick',
        email: 'packy@notboring.co',
        firm: 'Not Boring Capital',
        focus: 'Contrarian Consumer Tech & Data Moats',
        subject: 'Packy — TwinGenie (Pre-Seed): The zero-party cognitive graph',
        bodyText: `Hi Packy,

I’m an avid reader of Not Boring and your essays on technological defensibility and the search for authentic product moats.

In consumer AI, foundation models are already commoditized. The real moat isn't the model weights; it’s the proprietary context layer that sits between the human and the model.

I built TwinGenie (https://twingenie.app) to capture the "Zero-Party Cognitive Graph":
• Baseline Calibration: 35-question Big Five onboarding mapping the user's cognitive baseline.
• Longitudinal Context Moat: pgvector semantic memory that tracks user drift, excuses, and recurring rationalizations over time.
• Anti-Sycophancy: 4 perspective engines (Baseline, 5-Year Future Self, Therapist, Honest Shadow) that challenge user blind spots rather than flattering them.

Like Cred did with credit data, TwinGenie captures the high-resolution psychographic context layer that turns a generic chatbot into an un-cloneable personal mirror.

Self-funded MVP live on Google Play and web. We’re opening pre-seed angel discussions.

Can I send our 1-page memo your way?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'inv_james_currier',
        name: 'James Currier',
        email: 'james@nfx.com',
        firm: 'NFX',
        focus: 'Network Effects & Data Moats',
        subject: 'James — TwinGenie (Pre-Seed): Personal data moats in the age of commodity AI',
        bodyText: `Hi James,

I’ve studied NFX’s frameworks on network effects, particularly your writings on "Data Network Effects" and why simple data accumulation doesn't create defensibility unless it changes the user experience dynamically.

In consumer conversational AI, generic chatbots have zero data moat because they reset context every session.

I built TwinGenie (https://twingenie.app) around a dynamic personal data moat:
• 35-Vector Big Five Calibration: High-intent onboarding benchmarking cognitive blind spots (94.0% completion rate).
• Longitudinal Context Moat: Powered by pgvector, TwinGenie's responses become exponentially more tailored and challenging the longer you use it—detecting behavioral drift across weeks.
• 4 Perspective Lenses: Baseline, 5-Year Future Self, Clinical Therapist, and an Honest Twin that cuts through excuses.

The switching cost becomes insurmountable: users cannot export 60 days of calibrated psychological reflection into ChatGPT.

Android app in production on Google Play and Next.js web platform live. We’re initiating pre-seed conversations.

Can I share our 1-page memo?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    }
];

class InvestorOutreachService {
    constructor() {
        this.minIntervalMinutes = 75; // 75-minute cooling between investor sends (ultra-targeted, human-paced)
        this.dailyLimit = 3; // Max 3 investor pitches per day to maintain exclusive dealflow perception
        this.senderEmail = process.env.RESEND_FROM_EMAIL || 'Ashwani <founder@twingenie.app>';
        this.replyTo = 'founder@twingenie.app';
        this.state = this._loadState();
    }

    _loadState() {
        try {
            if (fs.existsSync(STATE_FILE_PATH)) {
                const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
                const state = JSON.parse(raw);

                const existingIds = new Set([
                    ...(state.queue || []).map(q => q.id),
                    ...(state.history || []).map(h => h.id)
                ]);

                for (const t of INVESTOR_TARGETS) {
                    if (!existingIds.has(t.id)) {
                        state.queue.push({
                            ...t,
                            status: 'pending',
                            attempts: 0,
                            lastAttemptAt: null,
                            resendId: null,
                            error: null
                        });
                        existingIds.add(t.id);
                    }
                }
                return state;
            }
        } catch (e) {
            logger.warn(`[INVESTOR OUTREACH] Could not load state: ${e.message}. Initializing fresh state.`);
        }

        return {
            lastSentDate: null,
            sentToday: 0,
            lastSentTimestamp: null,
            queue: INVESTOR_TARGETS.map(t => ({
                ...t,
                status: 'pending',
                attempts: 0,
                lastAttemptAt: null,
                resendId: null,
                error: null
            })),
            history: []
        };
    }

    _saveState() {
        try {
            const dir = path.dirname(STATE_FILE_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf8');
        } catch (e) {
            logger.error(`[INVESTOR OUTREACH] Failed to save state file: ${e.message}`);
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
        const pendingCount = (this.state.queue || []).filter(q => q.status === 'pending').length;
        const sentTotal = (this.state.history || []).length;
        const windowCheck = isUSInvestorBusinessHours();

        return {
            campaignEnabled: process.env.INVESTOR_CAMPAIGN_AUTORUN !== 'false',
            businessHours: windowCheck,
            senderEmail: this.senderEmail,
            replyTo: this.replyTo,
            sentToday: this.state.sentToday,
            dailyLimit: this.dailyLimit,
            lastSentTimestamp: this.state.lastSentTimestamp,
            pendingInQueue: pendingCount,
            totalSentHistory: sentTotal,
            nextUp: (this.state.queue || []).find(q => q.status === 'pending') || null,
            recentSent: (this.state.history || []).slice(-3)
        };
    }

    /**
     * Executes one scheduled pitch to the next investor in line.
     * Respects US business hours, 75m cooling intervals, and authentic founder pacing.
     */
    async executeTick(force = false) {
        this._refreshDailyQuota();

        if (process.env.INVESTOR_CAMPAIGN_AUTORUN === 'false' && !force) {
            logger.info('[INVESTOR OUTREACH] Autorun disabled via INVESTOR_CAMPAIGN_AUTORUN=false');
            return { action: 'skipped', reason: 'autorun_disabled' };
        }

        const windowCheck = isUSInvestorBusinessHours();
        if (!windowCheck.isHours && !force && process.env.FORCE_INVESTOR_SEND !== 'true') {
            logger.info(`[INVESTOR OUTREACH] Outside US business hours (${windowCheck.reason}). Holding queue.`);
            return { action: 'skipped', reason: 'outside_business_hours', details: windowCheck.reason };
        }

        if (this.state.sentToday >= this.dailyLimit && !force) {
            logger.info(`[INVESTOR OUTREACH] Daily limit reached (${this.state.sentToday}/${this.dailyLimit})`);
            return { action: 'skipped', reason: 'daily_limit_reached' };
        }

        if (this.state.lastSentTimestamp && !force) {
            const lastSent = new Date(this.state.lastSentTimestamp).getTime();
            const now = Date.now();
            const diffMinutes = (now - lastSent) / (1000 * 60);

            if (diffMinutes < this.minIntervalMinutes) {
                const waitTime = Math.round(this.minIntervalMinutes - diffMinutes);
                logger.info(`[INVESTOR OUTREACH] Cooling active (${waitTime}m remaining before next pitch)`);
                return { action: 'cooling', remainingMinutes: waitTime };
            }
        }

        const candidateIndex = (this.state.queue || []).findIndex(t => t.status === 'pending');
        if (candidateIndex === -1) {
            logger.info('[INVESTOR OUTREACH] No pending investors in queue');
            return { action: 'idle', reason: 'queue_empty' };
        }

        const candidate = this.state.queue[candidateIndex];

        const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #1e293b; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
${candidate.bodyText.split('\n\n').map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}
<p style="margin: 24px 0 0 0; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px;">
TwinGenie (https://twingenie.app) • Pre-seed founder correspondence • If you prefer not to receive updates, reply with 'unsubscribe' to be permanently excluded.
</p>
</div>
`.trim();

        logger.info(`[INVESTOR OUTREACH] Dispatching pitch to ${candidate.name} at ${candidate.firm} (${candidate.email})...`);

        const nowIso = new Date().toISOString();
        this.state.lastSentTimestamp = nowIso;

        try {
            const result = await sendEmail({
                to: candidate.email,
                subject: candidate.subject,
                text: candidate.bodyText,
                html: htmlContent,
                from: this.senderEmail,
                reply_to: this.replyTo,
                tags: [
                    { name: 'type', value: 'investor-pitch' },
                    { name: 'firm', value: (candidate.firm || 'Angel').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50) }
                ]
            });

            if (result.success) {
                logger.info(`✅ [INVESTOR OUTREACH] Successfully sent pitch to ${candidate.name} (${candidate.email})! Resend ID: ${result.id}`);
                candidate.status = 'sent';
                candidate.sentAt = nowIso;
                candidate.resendId = result.id;
                this.state.sentToday += 1;

                this.state.queue.splice(candidateIndex, 1);
                this.state.history.push({ ...candidate });
                this._saveState();

                return {
                    action: 'sent',
                    recipient: candidate.name,
                    email: candidate.email,
                    firm: candidate.firm,
                    subject: candidate.subject,
                    resendId: result.id
                };
            } else {
                logger.error(`❌ [INVESTOR OUTREACH] Failed to send to ${candidate.email}:`, result.error);
                candidate.attempts += 1;
                candidate.lastAttemptAt = nowIso;
                candidate.error = JSON.stringify(result.error);
                this._saveState();
                return { action: 'error', candidate: candidate.email, error: result.error };
            }
        } catch (err) {
            logger.error(`🚨 [INVESTOR OUTREACH] Exception sending to ${candidate.email}:`, err);
            candidate.attempts += 1;
            candidate.lastAttemptAt = nowIso;
            candidate.error = err.message;
            this._saveState();
            return { action: 'exception', candidate: candidate.email, error: err.message };
        }
    }
}

const investorOutreachService = new InvestorOutreachService();
export default investorOutreachService;
