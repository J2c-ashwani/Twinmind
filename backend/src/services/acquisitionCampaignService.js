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
    },
    {
        id: 'tgt_limitless',
        company: 'Limitless AI',
        recipientName: 'Dan Siroker',
        email: 'dan@limitless.ai',
        routeType: 'named_founder',
        thesis: 'Pioneering personalized memory & AI companion systems',
        subject: 'Dan — would Limitless review TwinGenie for technology/IP acquisition?',
        bodyText: `Hi Dan,

I've been following Limitless's development of personalized AI memory systems, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and guided self-reflection app that I am looking to sell as a complete software and IP asset.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch stage) with a working Next.js web platform and a built Flutter iOS project. It features unified pgvector longitudinal memory, 35-question personality onboarding, and four cognitive perspectives over a single context pipeline.

Would you be open to reviewing it as a technology/product acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_aurahealth',
        company: 'Aura Health',
        recipientName: 'Steve Lee',
        email: 'steve@aurahealth.io',
        routeType: 'named_founder',
        thesis: 'Operator & aggregator of mental wellness, self-care and mindfulness apps',
        subject: 'Steve — would Aura review TwinGenie for product/IP acquisition?',
        bodyText: `Hi Steve,

I saw Aura’s platform bringing together mental wellness and self-reflection tools, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI digital twin and reflection app available for strategic acquisition.

The Android app has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-revenue) alongside a working Next.js web app and a built Flutter iOS codebase. It includes persistent pgvector semantic memory, 35-question Big Five onboarding, and four distinct conversational perspectives over one context pipeline.

Would your team be open to reviewing TwinGenie as a product and IP asset acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_wysa',
        company: 'Wysa',
        recipientName: 'Ramakant Vempati',
        email: 'ramakant@wysa.io',
        routeType: 'named_founder',
        thesis: 'Conversational AI companion & mental wellbeing pioneer',
        subject: 'Ramakant — would Wysa review TwinGenie for technology/IP acquisition?',
        bodyText: `Hi Ramakant,

I’ve followed Wysa’s pioneering work in conversational mental wellbeing, so I wanted to connect founder-to-founder. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and self-reflection product I’m looking to sell as a complete software/IP asset.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch) with a working Next.js web application and a built Flutter iOS codebase. It features longitudinal pgvector memory, 35-question personality profiling, and four cognitive perspectives over a single context pipeline.

Would you be open to reviewing it as an early-stage product/technology acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_brainfm',
        company: 'Brain.fm',
        recipientName: 'Dan Clark',
        email: 'dan@brain.fm',
        routeType: 'named_founder',
        thesis: 'Cognitive performance and science-backed wellness tools',
        subject: 'Dan — would Brain.fm review TwinGenie for product/IP acquisition?',
        bodyText: `Hi Dan,

I follow Brain.fm’s work at the intersection of cognitive performance and science-backed tools, so I thought it was worth reaching out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI self-reflection companion available for strategic acquisition.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch stage) with a working Next.js web product and a built Flutter iOS codebase. It features persistent pgvector memory, 35-question Big Five onboarding, and four conversational perspectives over one context pipeline.

Would you be open to reviewing TwinGenie as a software and IP acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_intellect',
        company: 'Intellect',
        recipientName: 'Theodoric Chew',
        email: 'theodoric@intellect.co',
        routeType: 'named_founder',
        thesis: 'Digital mental health and behavioral reflection app platform',
        subject: 'Theodoric — would Intellect review TwinGenie for product/IP acquisition?',
        bodyText: `Hi Theodoric,

I’ve followed Intellect’s expansion across digital mental health and behavioral reflection, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and self-reflection app looking for the right acquirer.

Android is live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch) with a working Next.js web platform and a built Flutter iOS project. It features unified pgvector memory, 35-question Big Five personality baseline, and four prompt-based perspectives over one pipeline.

Would you be open to evaluating it as an early product/technology asset acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_memai',
        company: 'Mem AI',
        recipientName: 'Kevin Moody',
        email: 'kevin@mem.ai',
        routeType: 'named_founder',
        thesis: 'Personalized memory and self-organizing personal AI',
        subject: 'Kevin — would Mem review TwinGenie for technology/IP acquisition?',
        bodyText: `Hi Kevin,

I’ve followed Mem’s focus on personalized memory and self-organizing AI, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), a personal AI companion and guided reflection platform available for strategic acquisition.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-revenue stage) alongside a working Next.js web application and a built Flutter iOS project. It features longitudinal pgvector semantic memory, 35-question onboarding, and four cognitive perspectives over a single context pipeline.

Would you be open to reviewing TwinGenie as a technology/product acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_endel',
        company: 'Endel',
        recipientName: 'Oleg Stavitsky',
        email: 'oleg@endel.io',
        routeType: 'named_founder',
        thesis: 'Personalized adaptive audio environments and wellness AI',
        subject: 'Oleg — would Endel review TwinGenie for product/IP acquisition?',
        bodyText: `Hi Oleg,

I saw Endel’s focus on adaptive, personalized AI environments for mindfulness and focus, so I thought it was worth reaching out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), a personal AI companion and self-reflection product.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch) with a working Next.js web platform and a built Flutter iOS codebase. It features longitudinal pgvector memory, 35-question personality profiling, and four conversational perspectives over one context pipeline.

Would you be open to reviewing it as a software and IP asset acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_tiny',
        company: 'Tiny Capital',
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@tiny.com',
        routeType: 'dedicated_m_and_a',
        thesis: 'Consumer internet and software asset consolidator',
        subject: 'Tiny — early-stage product/IP acquisition opportunity: TwinGenie',
        bodyText: `Hi Team,

I saw Tiny acquires and operates consumer internet and software assets, so I’m reaching out to your acquisitions group. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and self-reflection product available for strategic acquisition.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-revenue) with a functional Next.js web application and a built Flutter iOS codebase. It features shared pgvector memory, 35-question personality onboarding, and four prompt-based perspectives over one context pipeline.

Would Tiny be open to reviewing it as an early product/technology asset acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_wemakeapp',
        company: 'WeMakeApp',
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@wemakeapp.com',
        routeType: 'dedicated_m_and_a',
        thesis: 'Dedicated mobile application portfolio acquirer',
        subject: 'WeMakeApp — mobile product/IP acquisition opportunity: TwinGenie',
        bodyText: `Hi Team,

I saw WeMakeApp specializes in acquiring and operating consumer mobile applications, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), a personal AI companion and reflection app I’m looking to sell as a complete software and IP asset.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch) with a working Next.js web platform and built Flutter iOS codebase. It features shared pgvector memory, 35-question onboarding, and four prompt-based perspectives over one context pipeline.

Would you be open to reviewing it as a technology/product acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_woebot',
        company: 'Woebot Health',
        recipientName: 'Alison Darcy',
        email: 'alison@woebothealth.com',
        routeType: 'named_founder',
        thesis: 'Conversational mental health and digital self-reflection pioneer',
        subject: 'Alison — would Woebot review TwinGenie for technology/IP acquisition?',
        bodyText: `Hi Alison,

I follow Woebot’s pioneering work in conversational mental health and digital CBT, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and self-reflection app available for strategic acquisition.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch stage) with a working Next.js web application and built Flutter iOS codebase. It features longitudinal pgvector memory, 35-question Big Five onboarding, and four distinct conversational perspectives over one pipeline.

Would you be open to reviewing TwinGenie as a product/technology acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_habitify',
        company: 'Habitify',
        recipientName: 'Peter Nguyen',
        email: 'peter@habitify.me',
        routeType: 'named_founder',
        thesis: 'Self-improvement and habit tracking app studio',
        subject: 'Peter — would Habitify review TwinGenie for product/IP acquisition?',
        bodyText: `Hi Peter,

I follow Habitify’s work in personal growth and habit building, so I wanted to reach out founder-to-founder. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and guided reflection platform looking for an acquirer.

Android is live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-revenue) with a functional Next.js web application and built Flutter iOS codebase. It features longitudinal pgvector memory, 35-question Big Five onboarding, and four prompt-based perspectives over one pipeline.

Would you be open to reviewing it as a product and IP asset acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_withfeeling',
        company: 'WithFeeling AI / Paradot',
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@withfeeling.ai',
        routeType: 'dedicated_m_and_a',
        thesis: 'Personalized AI companion studio',
        subject: 'WithFeeling AI — AI companion software/IP acquisition: TwinGenie',
        bodyText: `Hi Team,

I saw WithFeeling AI’s work building personalized AI companion experiences, so I thought it was worth reaching out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI digital twin and reflection app.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch stage) with a working Next.js web platform and a built Flutter iOS project. It features unified pgvector memory, 35-question Big Five onboarding, and four conversational perspectives over one context pipeline.

Would you be open to reviewing TwinGenie as a product/technology asset acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_appspree',
        company: 'Appspree',
        recipientName: 'M&A Team',
        email: 'acquisitions@appspree.co',
        routeType: 'dedicated_m_and_a',
        thesis: 'Mobile application portfolio consolidator',
        subject: 'Appspree — mobile app software & IP acquisition: TwinGenie',
        bodyText: `Hi Team,

I saw Appspree evaluates and acquires mobile applications in consumer and lifestyle categories, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and self-reflection product.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch stage) with a functional Next.js web product and a built Flutter iOS project. It features shared pgvector memory, 35-question onboarding, and four prompt-based perspectives over one pipeline.

Would you be open to reviewing it as a product/technology acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_nalasoft',
        company: 'Nalasoft Mobile Brands',
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@nalasoft.com',
        routeType: 'dedicated_m_and_a',
        thesis: 'Consumer mobile app portfolio acquirer',
        subject: 'Nalasoft — mobile software & IP acquisition opportunity: TwinGenie',
        bodyText: `Hi Team,

I saw Nalasoft acquires and operates consumer mobile app portfolios, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and self-reflection app.

Android has been live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-revenue) alongside a working Next.js web platform and built Flutter iOS codebase. It features longitudinal pgvector memory, 35-question onboarding, and four prompt-based perspectives over one context pipeline.

Would your team be open to reviewing TwinGenie as an early-stage product/IP asset acquisition?

Best,
Ashwani
Founder, TwinGenie`
    },
    {
        id: 'tgt_blueberryapps',
        company: 'Blueberry Apps',
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@blueberryapps.com',
        routeType: 'dedicated_m_and_a',
        thesis: 'Mobile software product acquirer',
        subject: 'Blueberry Apps — mobile product & IP acquisition: TwinGenie',
        bodyText: `Hi Team,

I saw Blueberry Apps specializes in acquiring and operating mobile software products, so I’m reaching out through your acquisition route. I’m Ashwani, founder of TwinGenie (https://twingenie.app), a personal AI companion and reflection platform.

Android is live on Google Play since Aug 24 (~40 organic downloads, $0 revenue, pre-launch stage) with a working Next.js web product and built Flutter iOS codebase. It features shared pgvector memory, 35-question personality baseline, and four prompt-based perspectives over one pipeline.

Would you be open to reviewing it as a product/technology acquisition?

Best,
Ashwani
Founder, TwinGenie`
    }
];

class AcquisitionCampaignService {
    constructor() {
        this.minIntervalMinutes = 55; // Paced to deliver 12 to 15 emails per day
        this.dailyLimit = parseInt(process.env.CAMPAIGN_DAILY_MAX, 10) || 15;
        this.senderEmail = process.env.RESEND_FROM_EMAIL || 'Ashwani <founder@twingenie.app>';
        this.replyTo = process.env.RESEND_REPLY_TO || process.env.FOUNDER_REPLY_TO || 'founder@twingenie.app';
        this.state = this._loadState();
    }

    _loadState() {
        try {
            if (fs.existsSync(STATE_FILE_PATH)) {
                const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
                const state = JSON.parse(raw);
                
                // Auto-replenish: Ensure any SEED_TARGETS not yet queued or sent are enqueued
                const existingIds = new Set([
                    ...state.queue.map(q => q.id),
                    ...(state.history || []).map(h => h.id)
                ]);

                let addedCount = 0;
                for (const t of SEED_TARGETS) {
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
                        addedCount += 1;
                    }
                }

                if (addedCount > 0) {
                    logger.info(`[CAMPAIGN] Auto-enqueued ${addedCount} new verified M&A candidates into active queue.`);
                    this._saveState(state);
                }

                return state;
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
