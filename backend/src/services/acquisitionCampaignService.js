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
    'acquisitions@a2apps.co',
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
 * High-converting, skimmable executive copy answering "Why Exit?" upfront:
 * Engineering founder running agency (FSI Digital), lacking B2C consumer distribution,
 * seeking an experienced mobile operator for clean 100% IP & asset acquisition.
 * Low-friction CTA: "Can I send over our 1-page asset teardown and summary deck?"
 */
const SEED_TARGETS = [
    {
        id: 'tgt_ytcventures',
        company: 'YTC Ventures',
        recipientName: 'Divestments Team',
        email: 'divestments@ytcventures.com',
        routeType: 'dedicated_m_and_a',
        thesis: 'Official seller-side divestment & acquisition route',
        subject: 'YTC Ventures — divestment opportunity: TwinGenie software & IP',
        bodyText: `Hi Team,

I saw YTC Ventures evaluates consumer software acquisitions, so I wanted to reach out through your divestment channel. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store submission
• Node.js & Next.js backend with pgvector longitudinal memory
• 35-question Big Five personality baseline with a 78.8% completion rate

Why sell? I am an engineering founder running a digital agency (FSI Digital), and I don't have the consumer marketing bandwidth to scale B2C distribution. I'm looking for an experienced operator to take over 100% of the IP, codebases, and store listings under a clean asset sale.

If this aligns with your criteria, can I send over our 1-page asset teardown and summary deck?

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

I saw The Happy Harbor acquires software and mobile app assets, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store submission
• Full Next.js web application & Node.js backend
• Longitudinal pgvector semantic memory engine
• 35-question Big Five personality baseline (78.8% onboarding completion rate)

Why exit? I am an engineering founder running my digital agency (FSI Digital), and I lack the consumer distribution channels to scale B2C growth. I’m looking to transition 100% of the IP, codebases, and digital assets under a clean asset sale.

If this fits your acquisition criteria, can I send over our 1-page asset teardown and summary deck?

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

I saw AppSmartz’s acquisition and scaling of unMix AI, so I wanted to reach out founder-to-founder. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store submission
• Modern Next.js web application & persistent pgvector memory
• 35-question Big Five personality model with a 78.8% completion rate

Why exit? I’m an engineering founder running my digital agency (FSI Digital), and I don't have the consumer acquisition bandwidth to scale B2C growth. Given AppSmartz’s expertise operating and scaling mobile AI apps, I thought this could be a high-synergy addition to your portfolio. We are selling 100% of the IP, codebases, and store listings under a clean transfer.

If this sounds interesting, can I send over our 1-page asset teardown?

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

I follow your work across app growth and acquisitions, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store release
• Next.js web application with pgvector longitudinal memory
• 35-question Big Five personality baseline with a 78.8% completion rate

Why exit? I am a technical founder running a digital agency (FSI Digital), and I don't have the B2C distribution engine to scale consumer growth. I’m looking to transition 100% of the software and IP assets to an experienced operator who knows how to scale app portfolios.

If this aligns with what you evaluate, can I send over our 1-page asset teardown?

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

I've been following Limitless's pioneering work in personalized AI memory, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie around a longitudinal memory pipeline for personal growth:
• Android production app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS project ready for submission
• Next.js web platform & pgvector semantic memory engine
• 4 distinct cognitive modes (Direct Mirror, Compassionate Guide, Devil's Advocate, and Future Self)
• 35-question Big Five baseline (78.8% onboarding completion rate)

Why sell? I am an engineering founder running my digital agency (FSI Digital), and I don't have the consumer distribution bandwidth to scale B2C growth. We are seeking a technology & IP acquisition for 100% of the codebases, memory architecture, and store assets.

If this is relevant to Limitless’s roadmap, can I send over our 1-page asset teardown?

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

I saw Aura’s platform bringing together mental wellness and self-reflection tools, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a structured AI companion for self-reflection and mental clarity:
• Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for store release
• Next.js web application with persistent pgvector memory
• 35-question Big Five personality baseline (78.8% completion rate)
• 4 conversational reflection perspectives over a single context pipeline

Why exit? I’m a technical founder running my digital agency (FSI Digital), and I lack the consumer distribution channels to scale B2C growth. Given Aura's leadership in mindfulness and mental wellbeing, TwinGenie’s cognitive reflection engine would make a natural portfolio asset. We are selling 100% of the IP and codebases under a clean asset transfer.

If this aligns with Aura’s acquisition focus, can I send over our 1-page summary teardown?

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

I’ve followed Wysa’s pioneering work in conversational mental wellbeing, so I wanted to reach out founder-to-founder. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as an AI companion for self-reflection and personal growth:
• Live Android app on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store submission
• Next.js web application & Node.js backend
• Longitudinal pgvector memory architecture
• 35-question personality profiling with a 78.8% completion rate

Why sell? I am an engineering founder running a digital agency (FSI Digital), and I don't have the consumer acquisition bandwidth to scale B2C mental health distribution. We are offering 100% of the technology, codebases, and IP assets under a clean asset sale.

If this aligns with Wysa’s roadmap, can I send over our 1-page asset teardown?

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

I follow Brain.fm’s work at the intersection of cognitive performance and science-backed tools, so I thought it was worth reaching out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as an AI self-reflection companion for mental clarity:
• Android production app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store release
• Next.js web app & Node.js backend with persistent pgvector memory
• 35-question Big Five personality baseline (78.8% onboarding completion rate)

Why sell? I am a technical founder running my digital agency (FSI Digital), and I don't have the B2C distribution bandwidth to scale consumer acquisition. We are offering 100% of the IP, codebases, and store listings under a clean asset sale.

If this is of interest, can I send over our 1-page asset teardown?

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

I’ve followed Intellect’s expansion across digital mental health and behavioral reflection, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a conversational companion for guided reflection:
• Live Android app on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS project ready for submission
• Next.js web application with unified pgvector memory
• 35-question Big Five personality baseline (78.8% completion rate)
• 4-mode cognitive engine for structured reflection

Why exit? I am an engineering founder running a digital agency (FSI Digital), and I don't have the B2C marketing channels to scale consumer growth. We are looking to sell 100% of the software, brand, and IP assets under a straightforward asset transfer.

If this aligns with Intellect’s expansion, can I send over our 1-page asset teardown?

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

I’ve followed Mem’s focus on personalized memory and self-organizing AI, so I wanted to reach out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as an AI companion powered by longitudinal memory:
• Android production app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for store release
• Next.js web application & persistent pgvector semantic memory
• 35-question personality baseline (78.8% onboarding completion rate)

Why sell? I am a technical founder running a digital agency (FSI Digital), and I lack the consumer distribution channels to scale B2C growth. We are offering 100% of the IP, codebases, and memory pipelines under a clean asset sale.

If this aligns with Mem’s technology interests, can I send over our 1-page asset teardown?

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

I saw Endel’s focus on adaptive, personalized AI environments for mindfulness and focus, so I thought it was worth reaching out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a personal AI companion for daily self-reflection:
• Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store submission
• Next.js web platform & longitudinal pgvector memory
• 35-question Big Five personality baseline (78.8% completion rate)

Why exit? I am an engineering founder running my digital agency (FSI Digital), and I don't have the consumer marketing bandwidth to scale B2C distribution. We are selling 100% of the software and IP assets under a clean asset purchase.

If this fits what Endel explores, can I send over our 1-page asset teardown?

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

I saw Tiny acquires and operates consumer internet and software assets, so I’m reaching out to your acquisitions group. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store release
• Next.js web application with pgvector longitudinal memory
• 35-question Big Five personality onboarding with a 78.8% completion rate

Why sell? I am an engineering founder running a digital agency (FSI Digital), and I don't have the consumer acquisition engine to scale B2C distribution. I’m looking to transition 100% of the IP, codebases, and store listings under a clean asset sale.

If this fits your acquisition criteria, can I send over our 1-page asset teardown and deck?

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

I saw WeMakeApp specializes in acquiring and operating consumer mobile applications, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store submission
• Next.js web application with shared pgvector memory
• 35-question Big Five personality baseline (78.8% completion rate)

Why sell? I am a technical founder running a digital agency (FSI Digital), and I don't have the consumer marketing bandwidth to scale B2C growth. We are selling 100% of the software and IP assets under a clean asset purchase.

If this aligns with your portfolio criteria, can I send over our 1-page asset teardown?

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

I follow Woebot’s pioneering work in conversational mental health, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as an AI companion for self-reflection and cognitive clarity:
• Active Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for submission
• Next.js web app with persistent pgvector memory
• 35-question Big Five baseline (78.8% completion rate)
• 4 cognitive reflection modes over a single context pipeline

Why exit? I am an engineering founder running a digital agency (FSI Digital), and I don't have the B2C distribution bandwidth to scale consumer growth. We are seeking an acquirer for 100% of the technology, codebases, and IP assets.

If this is of interest to Woebot, can I send over our 1-page asset teardown?

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

I follow Habitify’s work in personal growth and habit building, so I wanted to reach out founder-to-founder. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Android production app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store submission
• Next.js web app with longitudinal pgvector memory
• 35-question Big Five onboarding with a 78.8% completion rate

Why exit? I am a technical founder running my digital agency (FSI Digital), and I don't have the consumer acquisition bandwidth to scale B2C growth. Given Habitify's focus on user consistency and self-improvement, TwinGenie offers strong portfolio synergy. We are offering 100% of the codebases, IP, and store listings under a clean asset sale.

If this sounds interesting, can I send over our 1-page asset teardown?

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

I saw WithFeeling AI’s work building personalized AI companions, so I thought it was worth reaching out directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as an AI companion powered by longitudinal memory:
• Android production app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store submission
• Next.js web platform & pgvector semantic memory engine
• 35-question Big Five onboarding with a 78.8% completion rate

Why sell? I am an engineering founder running a digital agency (FSI Digital), and I don't have the B2C distribution channels to scale consumer growth. We are selling 100% of the software, codebases, and IP assets under a clean asset transfer.

If this aligns with your acquisition roadmap, can I send over our 1-page asset teardown?

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

I saw Appspree acquires mobile applications in consumer and lifestyle categories, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store release
• Next.js web application with shared pgvector memory
• 35-question Big Five personality baseline (78.8% completion rate)

Why exit? I am a technical founder running a digital agency (FSI Digital), and I don't have the consumer marketing bandwidth to scale B2C distribution. We are seeking an asset acquisition of 100% of the codebases, IP, and digital assets.

If this aligns with your criteria, can I send over our 1-page asset teardown and deck?

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

I saw Nalasoft acquires and operates consumer mobile app portfolios, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Android production app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store release
• Next.js web platform & longitudinal pgvector memory
• 35-question Big Five personality baseline with a 78.8% completion rate

Why exit? I am an engineering founder running a digital agency (FSI Digital), and I don't have the consumer acquisition engine to scale B2C growth. We are offering 100% of the software and IP assets under a clean asset sale.

If this fits your acquisition criteria, can I send over our 1-page asset teardown?

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

I saw Blueberry Apps specializes in acquiring and operating mobile software products, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a turnkey AI self-reflection companion:
• Production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Built Flutter iOS codebase ready for App Store submission
• Next.js web product & shared pgvector memory
• 35-question Big Five personality baseline with a 78.8% completion rate

Why exit? I am a technical founder running my digital agency (FSI Digital), and I don't have the consumer marketing bandwidth to scale B2C distribution. We are selling 100% of the software, brand, and IP assets under a clean asset purchase.

If this aligns with your portfolio focus, can I send over our 1-page asset teardown?

Best,
Ashwani
Founder, TwinGenie
founder@twingenie.app`
    }
];

class AcquisitionCampaignService {
    constructor() {
        this.minIntervalMinutes = 55; // Paced to deliver max 1 email per hour during business hours
        const rawLimit = parseInt(process.env.CAMPAIGN_DAILY_MAX, 10);
        // Hard-clamp to max 8 emails/day to strictly preserve Resend free quota (100 total across app)
        this.dailyLimit = (rawLimit && rawLimit > 0 && rawLimit <= 10) ? rawLimit : 8;
        this.senderEmail = process.env.RESEND_FROM_EMAIL || 'Ashwani <founder@twingenie.app>';
        this.replyTo = 'founder@twingenie.app'; // Fixed to founder@twingenie.app (mirrors Canada Blog architecture)
        this.state = this._loadState();
    }

    _loadState() {
        try {
            if (fs.existsSync(STATE_FILE_PATH)) {
                const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
                const state = JSON.parse(raw);

                // Auto-cleanup: Suppress any bounced or permanently suppressed contacts in existing queue
                for (const item of (state.queue || [])) {
                    const normEmail = (item.email || '').toLowerCase().trim();
                    if (PERMANENT_SUPPRESSION_LIST.has(normEmail) || item.id === 'tgt_a2apps') {
                        item.status = 'skipped';
                        item.error = 'suppressed_or_bounced';
                    }
                }

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

        const nowIso = new Date().toISOString();
        // ALWAYS stamp lastSentTimestamp to strictly enforce 55-minute cooldown between any outreach attempts
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
                    { name: 'type', value: 'acquisition-outreach' },
                    { name: 'company', value: (candidate.company || 'Unknown').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50) }
                ]
            });

            // Resend API quota error detection
            const errorMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error || {});
            const isQuotaError = errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate_limit') || errorMsg.toLowerCase().includes('limit');

            if (isQuotaError) {
                logger.error(`🚨 [CAMPAIGN] Resend daily quota reached! Halting outreach for today. Details: ${errorMsg}`);
                this.state.sentToday = this.dailyLimit; // Lock further sends today
                candidate.attempts += 1;
                candidate.lastAttemptAt = nowIso;
                candidate.error = 'resend_daily_quota_reached';
                this._saveState();
                return { action: 'quota_halt', reason: 'daily_quota_reached', error: errorMsg };
            }

            if (result.success) {
                candidate.status = 'sent';
                candidate.sentAt = nowIso;
                candidate.resendId = result.id;
                candidate.lastAttemptAt = nowIso;

                this.state.sentToday += 1;
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
                candidate.lastAttemptAt = nowIso;
                candidate.error = errorMsg || 'delivery_failed';

                // CRITICAL FIX: Mark as failed so the queue moves forward and NEVER retries in a tight loop!
                candidate.status = 'failed';
                this.state.sentToday += 1; // Count against daily attempt budget
                this._saveState();

                logger.error(`❌ [CAMPAIGN] Delivery failure for ${candidate.email}:`, errorMsg);
                return { action: 'failed', error: errorMsg, recipient: candidate.email };
            }
        } catch (err) {
            candidate.attempts += 1;
            candidate.lastAttemptAt = nowIso;
            candidate.error = err.message;
            candidate.status = 'failed'; // Mark as failed so queue advances!
            this.state.sentToday += 1;
            this._saveState();

            logger.error(`❌ [CAMPAIGN] Exception sending to ${candidate.email}:`, err);
            return { action: 'error', error: err.message, recipient: candidate.email };
        }
    }
}

const acquisitionCampaignService = new AcquisitionCampaignService();
export default acquisitionCampaignService;
