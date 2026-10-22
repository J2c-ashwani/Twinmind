import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';
import { sendEmail } from './emailService.js';


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
 * Strict North Star Business Hours check (Eastern Time, 9:00 AM - 5:00 PM, Mon-Fri)
 * Derived from the Canada Blog outreach architecture (/Users/ashwanikumar/Downloads/canadablog).
 * Ensures emails are only dispatched when executives and M&A decision makers are at their desks.
 */
function isNorthStarBusinessHours() {
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
            reason: `Eastern Time: ${weekdayStr} ${hour}:00 (Target window: Mon-Fri 9:00-17:00 EST)`
        };
    } catch (e) {
        return { isHours: true, reason: `Intl check fallback (${e.message})` };
    }
}

/**
 * Verified M&A Decision-Maker & Strategic Target Register
 * High-conviction, professional executive copy emphasizing turnkey cross-platform assets,
 * production Google Play presence, 78.8% assessment completion rate, and complete IP transfer.
 */
const SEED_TARGETS = [
    {
        id: 'tgt_a2apps',
        company: 'a2 apps',
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@a2apps.co',
        routeType: 'dedicated_m_and_a',
        thesis: 'Mobile application portfolio acquirer with dedicated submission channel',
        subject: 'a2 apps — would you review TwinGenie for software & IP acquisition?',
        bodyText: `Hi Team,

I saw a2 apps specializes in acquiring and operating consumer mobile applications, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI digital twin and self-reflection platform available for strategic software and IP acquisition.

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) alongside a built Flutter iOS codebase, a Next.js web application, and a Node/PostgreSQL backend with pgvector longitudinal memory. The product features a 35-question Big Five personality baseline (78.8% onboarding completion rate) and a proprietary 4-mode cognitive engine (Direct Mirror, Compassionate Guide, Devil’s Advocate, and Future Self).

We are selling 100% of the assets—including all codebases, architecture, models, brand, domain, and store listings—under a clean asset transfer.

Would your acquisitions team be open to reviewing TwinGenie as a product & IP acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
    },
    {
        id: 'tgt_ytcventures',
        company: 'YTC Ventures',
        recipientName: 'Divestments Team',
        email: 'divestments@ytcventures.com',
        routeType: 'dedicated_m_and_a',
        thesis: 'Official seller-side divestment & acquisition route',
        subject: 'YTC Ventures — divestment opportunity: TwinGenie software & IP',
        bodyText: `Hi Team,

I noticed YTC Ventures evaluates divestment and acquisition opportunities across consumer tech and software products, so I’m reaching out through your divestment channel. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and guided reflection platform available for strategic acquisition.

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with an unreleased Flutter iOS project, a Next.js web platform, and a pgvector semantic memory architecture. Our 35-question Big Five onboarding achieves a 78.8% completion rate, powering a 4-mode cognitive engine for daily self-reflection and decision support.

We are offering this as an early-stage asset acquisition including full code repositories, database schemas, AI pipelines, domains, and store assets.

Would your team be open to receiving our summary deck and reviewing this divestment opportunity?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie has a production Android application live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app), a built Flutter iOS codebase, a Next.js web platform, and a shared pgvector memory pipeline. Our 35-question personality onboarding sees a 78.8% completion rate, feeding into 4 distinct AI reflection perspectives.

We are structuring this as a clean, complete asset and IP sale.

Would you be open to reviewing TwinGenie as a product/technology asset acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) alongside a built Flutter iOS codebase, a Next.js web app, and persistent pgvector semantic memory. Our 35-question Big Five onboarding achieves a 78.8% completion rate, driving a 4-mode cognitive engine for structured reflection and decision support.

Given AppSmartz’s track record operating and scaling consumer AI utilities, I thought TwinGenie could be a compelling strategic addition. We are selling 100% of the IP, codebases, and digital assets.

Would you be open to reviewing it as a software and IP acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

I follow your work across app growth, portfolio scaling, and acquisitions, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion app that I’m looking to transition to the right acquirer.

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a functional Next.js web app and a built Flutter iOS codebase. It features longitudinal pgvector memory, a 35-question personality baseline with a 78.8% completion rate, and four prompt-based cognitive perspectives over a unified context pipeline.

I'm looking for a clean technology and IP asset sale (full transfer of codebases, Google Play app, domain, and architecture).

Would you be open to taking a look or connecting me with interested buyers in your network?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

I've been following Limitless's development of personalized AI memory systems, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), a personal AI companion and self-reflection app available for strategic acquisition.

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS project, Next.js web platform, and a unified pgvector longitudinal memory architecture. Our 35-question personality model achieves a 78.8% onboarding completion rate, enabling users to converse across four specialized cognitive modes (including a Future Self projection).

We are selling 100% of the software, IP, and memory pipeline assets.

Would your team be open to reviewing it as a technology and IP acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

I saw Aura’s platform bringing together mental wellness, mindfulness, and self-reflection tools, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI digital twin and reflection app available for strategic acquisition.

The Android app is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) alongside a built Flutter iOS codebase and a Next.js web application. It includes persistent pgvector semantic memory, a 35-question Big Five onboarding assessment (78.8% completion rate), and four distinct conversational reflection modes over a single context pipeline.

Given Aura's focus on premium mindfulness and emotional wellness, TwinGenie’s cognitive reflection engine would make a natural portfolio addition. We are offering a complete transfer of all codebases, IP, and store listings.

Would your team be open to reviewing TwinGenie for acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

I’ve followed Wysa’s pioneering work in conversational mental wellbeing, so I wanted to connect founder-to-founder. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI companion and self-reflection product available for strategic acquisition.

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS codebase, a Next.js web application, and longitudinal pgvector memory. Our 35-question personality profiling boasts a 78.8% completion rate, feeding into four cognitive perspectives designed to help users process stress, decisions, and personal growth.

We are seeking a clean asset and technology transfer (complete IP, codebases, and assets).

Would you be open to evaluating it as an early-stage product & technology acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

I follow Brain.fm’s work at the intersection of cognitive performance and science-backed mental tools, so I thought it was worth reaching out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), an AI self-reflection companion available for strategic acquisition.

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS codebase and a Next.js web app. It combines persistent pgvector memory with a 35-question Big Five baseline (78.8% onboarding completion rate) and four cognitive modes (Direct Mirror, Compassionate Guide, Devil’s Advocate, and Future Self).

We are offering 100% of the IP, codebases, and digital assets under a clean asset sale.

Would you be open to reviewing TwinGenie as a product & IP acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS project, Next.js web app, and unified pgvector memory. Our 35-question Big Five personality baseline sees a 78.8% onboarding completion rate, powering multi-mode reflection for daily mental clarity.

We are selling the complete software, brand, and IP assets under a straightforward asset transfer.

Would you be open to evaluating it as a product and technology asset acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) alongside a built Flutter iOS codebase and a Next.js web application. It features longitudinal pgvector semantic memory, a 35-question personality baseline (78.8% completion rate), and four cognitive perspectives over a single context pipeline.

We are structuring a clean asset and IP transfer covering all codebases, models, and infrastructure.

Would you be open to reviewing TwinGenie as a technology/product acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS codebase and a Next.js web platform. It features longitudinal pgvector memory, a 35-question personality baseline with a 78.8% onboarding completion rate, and four conversational perspectives for personal growth and mental calibration.

We are selling 100% of the software and IP assets.

Would you be open to reviewing it as a software and IP asset acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS codebase, a Next.js web application, and pgvector long-term memory. The product features 35-question personality onboarding (78.8% completion rate) and a 4-mode cognitive engine for structured thinking.

We are structuring this as a complete asset and IP sale including all codebases, domains, branding, and Google Play listing.

Would Tiny be open to reviewing this as an early product/technology asset acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

I saw WeMakeApp specializes in acquiring and operating consumer mobile applications, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app), a personal AI companion and reflection app available for strategic acquisition.

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS codebase, Next.js web application, and shared pgvector memory. Our 35-question personality model achieves a 78.8% onboarding completion rate, feeding into 4 conversational perspectives over a single context pipeline.

We are selling 100% of the software and IP assets under a clean asset purchase.

Would you be open to reviewing it as a mobile product & technology acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie has an active Android production app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app), a built Flutter iOS codebase, and a Next.js web app. It combines longitudinal pgvector memory, a 35-question Big Five baseline (78.8% completion rate), and four distinct cognitive modes (Direct Mirror, Compassionate Guide, Devil’s Advocate, and Future Self).

We are seeking a strategic acquirer for 100% of the technology, IP, and codebases.

Would you be open to reviewing TwinGenie as a product/technology acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS codebase, Next.js web app, and longitudinal pgvector memory. Our 35-question Big Five onboarding achieves a 78.8% completion rate, powering four prompt-based cognitive perspectives.

Given Habitify's focus on user consistency and self-improvement, TwinGenie’s reflection architecture offers strong synergy. We are offering a full asset transfer of all codebases, IP, and store assets.

Would you be open to reviewing it as a product and IP asset acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS project, Next.js web platform, and unified pgvector memory. Our 35-question Big Five onboarding assessment achieves a 78.8% completion rate, feeding into four conversational perspectives over a single context pipeline.

We are selling 100% of the product, codebases, and IP assets under a clean asset transfer.

Would you be open to reviewing TwinGenie as a product/technology asset acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS project, Next.js web app, and shared pgvector memory. Our 35-question onboarding model achieves a 78.8% completion rate, driving four prompt-based perspectives over one pipeline.

We are looking for an asset acquisition of 100% of the codebases, IP, and digital assets.

Would you be open to reviewing it as a product/technology acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS codebase, Next.js web platform, and longitudinal pgvector memory. Our 35-question onboarding achieves a 78.8% completion rate, powering four prompt-based perspectives over a single pipeline.

We are offering 100% of the software and IP assets under a clean transfer.

Would your team be open to reviewing TwinGenie as an early-stage product/IP asset acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
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

TwinGenie is live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) with a built Flutter iOS codebase, Next.js web product, and shared pgvector memory. Our 35-question personality baseline achieves a 78.8% completion rate, driving four prompt-based perspectives over one pipeline.

We are selling 100% of the software, brand, and IP assets.

Would you be open to reviewing it as a product/technology acquisition?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
    }
];

class AcquisitionCampaignService {
    constructor() {
        this.minIntervalMinutes = 55; // Paced to deliver 8 to 12 emails per business day
        this.dailyLimit = parseInt(process.env.CAMPAIGN_DAILY_MAX, 10) || 12;
        this.senderEmail = process.env.RESEND_FROM_EMAIL || 'Ashwani <founder@twingenie.app>';
        this.replyTo = 'founder@twingenie.app'; // Fixed to founder@twingenie.app (mirrors Canada Blog architecture)
        this.state = this._loadState();
    }

    _loadState() {
        try {
            if (fs.existsSync(STATE_FILE_PATH)) {
                const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
                const state = JSON.parse(raw);

                // Auto-sync: Update pending queued targets with refreshed high-conviction templates and corrected emails
                for (const item of (state.queue || [])) {
                    if (item.status === 'pending') {
                        const seed = SEED_TARGETS.find(s => s.id === item.id);
                        if (seed) {
                            item.subject = seed.subject;
                            item.bodyText = seed.bodyText;
                            item.email = seed.email;
                            item.recipientName = seed.recipientName;
                            item.company = seed.company;
                        }
                    }
                }

                // Auto-replenish: Ensure any SEED_TARGETS not yet queued or sent are enqueued
                const existingIds = new Set([
                    ...(state.queue || []).map(q => q.id),
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
                }
                this._saveState(state);
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
        const pendingCount = (this.state.queue || []).filter(q => q.status === 'pending').length;
        const sentTotal = (this.state.history || []).length;
        const windowCheck = isNorthStarBusinessHours();

        return {
            campaignEnabled: process.env.CAMPAIGN_AUTORUN !== 'false',
            businessHours: windowCheck,
            senderEmail: this.senderEmail,
            replyTo: this.replyTo,
            sentToday: this.state.sentToday,
            dailyLimit: this.dailyLimit,
            lastSentTimestamp: this.state.lastSentTimestamp,
            pendingInQueue: pendingCount,
            totalSentHistory: sentTotal,
            nextUp: (this.state.queue || []).find(q => q.status === 'pending') || null
        };
    }

    /**
     * Executes one scheduled tick of the campaign.
     * Evaluates North Star business hours, spacing, daily limits, suppression, and sends next candidate.
     */
    async executeTick(force = false) {
        this._refreshDailyQuota();

        if (process.env.CAMPAIGN_AUTORUN === 'false' && !force) {
            logger.info('[CAMPAIGN] Autorun disabled via CAMPAIGN_AUTORUN=false');
            return { action: 'skipped', reason: 'autorun_disabled' };
        }

        // ⏰ Strict Business Hours Gate (Canada Blog pattern: Eastern Time Mon-Fri 9:00 - 17:00)
        const windowCheck = isNorthStarBusinessHours();
        if (!windowCheck.isHours && !force && process.env.FORCE_CAMPAIGN_SEND !== 'true') {
            logger.info(`[CAMPAIGN] Outside North Star business hours (${windowCheck.reason}). Holding outreach queue.`);
            return { action: 'skipped', reason: 'outside_business_hours', details: windowCheck.reason };
        }

        // Check daily limit
        if (this.state.sentToday >= this.dailyLimit && !force) {
            logger.info(`[CAMPAIGN] Daily limit reached (${this.state.sentToday}/${this.dailyLimit})`);
            return { action: 'skipped', reason: 'daily_limit_reached' };
        }

        // Check spacing interval
        if (this.state.lastSentTimestamp && !force) {
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
        const candidateIndex = (this.state.queue || []).findIndex(t => t.status === 'pending');
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

        // Format HTML container (Mirrors Canada Blog: max-width 600px, #334155 text color, clean paragraphs)
        const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
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
                reply_to: this.replyTo,
                tags: [
                    { name: 'type', value: 'acquisition-outreach' },
                    { name: 'company', value: (candidate.company || 'Unknown').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50) }
                ]
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
