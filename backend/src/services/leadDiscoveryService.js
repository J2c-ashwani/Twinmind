import dns from 'dns/promises';
import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Permanent Suppression List
 * Reconciled across Master Register & spam defense rules.
 * Never enroll or email these contacts.
 */
export const PERMANENT_SUPPRESSION_LIST = new Set([
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
    'ceo@replika.com',
    // Bounced / Invalid Domains & Malformed Aliases
    'acquisitions@thehappyharbor.com',
    'acquisitions@appspree.co',
    'acquisitions@nalasoft.com',
    'acquisitions@co-founderscapital.com',
    'acquisitions@redwoodgrowth.com',
    'acquisitions@vungle-apps.com',
    'manda@tiny.com',
    'rbahat@bloombergbeta.com',
    'pete@theneuro.ai'
]);

/**
 * Curated Verified Catalog of Tech Journalists & Columnists
 */
const JOURNALIST_CATALOG = [
    {
        recipientName: 'Amanda Silberling',
        email: 'amanda@techcrunch.com',
        organization: 'TechCrunch',
        roleOrFocus: 'Consumer Tech, Culture & AI',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Dan Shipper',
        email: 'dan@every.to',
        organization: 'Every / Chain of Thought',
        roleOrFocus: 'AI Cognition & Thinking Tools',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Casey Newton',
        email: 'casey@platformer.news',
        organization: 'Platformer',
        roleOrFocus: 'Social Platforms & AI Dynamics',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Charlie Warzel',
        email: 'cwarzel@theatlantic.com',
        organization: 'The Atlantic',
        roleOrFocus: 'Technology, Culture & Society',
        angle: 'loneliness_economy'
    },
    {
        recipientName: 'Ben Tossell',
        email: 'ben@bensbites.co',
        organization: "Ben's Bites",
        roleOrFocus: 'Daily Consumer AI Products & UX',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Kyle Wiggers',
        email: 'kyle@techcrunch.com',
        organization: 'TechCrunch',
        roleOrFocus: 'Enterprise & Applied AI Systems',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Kylie Robison',
        email: 'kylie.robison@theverge.com',
        organization: 'The Verge',
        roleOrFocus: 'AI Models, Companions & Digital Culture',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Will Oremus',
        email: 'will.oremus@washpost.com',
        organization: 'The Washington Post',
        roleOrFocus: 'Algorithmic Culture & Tech Accountability',
        angle: 'loneliness_economy'
    },
    {
        recipientName: 'Nitasha Tiku',
        email: 'nitasha.tiku@washpost.com',
        organization: 'The Washington Post',
        roleOrFocus: 'Silicon Valley AI Culture & Ethics',
        angle: 'loneliness_economy'
    },
    {
        recipientName: 'Kevin Roose',
        email: 'roose@nytimes.com',
        organization: 'The New York Times',
        roleOrFocus: 'Human-AI Relationships & Culture',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Cade Metz',
        email: 'cmetz@nytimes.com',
        organization: 'The New York Times',
        roleOrFocus: 'AI Evolution & Societal Impact',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Parmy Olson',
        email: 'polson@bloomberg.net',
        organization: 'Bloomberg Opinion',
        roleOrFocus: 'AI Psychology & Companion Tech',
        angle: 'loneliness_economy'
    },
    {
        recipientName: 'Rachel Metz',
        email: 'rmetz@bloomberg.net',
        organization: 'Bloomberg Tech',
        roleOrFocus: 'Generative AI Applications & Ethics',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Will Knight',
        email: 'will_knight@wired.com',
        organization: 'Wired',
        roleOrFocus: 'AI Science & Consumer Bots',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Lauren Goode',
        email: 'lauren_goode@wired.com',
        organization: 'Wired',
        roleOrFocus: 'Personal Tech & Companion Culture',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Melissa Heikkila',
        email: 'melissa.heikkila@technologyreview.com',
        organization: 'MIT Technology Review',
        roleOrFocus: 'Algorithmic Ethics & Generative AI',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Eileen Guo',
        email: 'eileen.guo@technologyreview.com',
        organization: 'MIT Technology Review',
        roleOrFocus: 'Tech Impact on Human Behavior',
        angle: 'loneliness_economy'
    },
    {
        recipientName: 'Kaveh Waddell',
        email: 'kwaddell@consumerreports.org',
        organization: 'Consumer Reports AI Lab',
        roleOrFocus: 'Consumer AI Safety & Trust',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Maxwell Zeff',
        email: 'mzeff@gizmodo.com',
        organization: 'Gizmodo',
        roleOrFocus: 'Consumer AI Apps & Culture',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Alex Kantrowitz',
        email: 'alex@bigtechnology.com',
        organization: 'Big Technology',
        roleOrFocus: 'AI Product Architecture & Big Tech',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Pete Huang',
        email: 'pete@theneurondaily.com',
        organization: 'The Neuron',
        roleOrFocus: 'Daily Generative AI Tools & Companion Tech',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Zain Kahn',
        email: 'zain@superhuman.ai',
        organization: 'Superhuman AI',
        roleOrFocus: 'Productivity & Practical AI Applications',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Sarah Perez',
        email: 'sarah.perez@techcrunch.com',
        organization: 'TechCrunch',
        roleOrFocus: 'App Store Ecosystem & Consumer Mobile',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Ivan Mehta',
        email: 'ivan@techcrunch.com',
        organization: 'TechCrunch',
        roleOrFocus: 'AI Apps & Conversational Bots',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Mark Sullivan',
        email: 'msullivan@fastcompany.com',
        organization: 'Fast Company',
        roleOrFocus: 'Emerging Tech & Human Interface',
        angle: 'loneliness_economy'
    }
];

/**
 * Curated Verified Catalog of Consumer AI Angel Investors & Pre-Seed VCs
 */
const INVESTOR_CATALOG = [
    {
        recipientName: 'Olivia Moore',
        email: 'omoore@a16z.com',
        organization: 'Andreessen Horowitz (a16z)',
        roleOrFocus: 'Consumer AI & Early-Stage Startups',
        thesis: 'Top 100 Consumer AI & Retention Moat'
    },
    {
        recipientName: 'Justine Moore',
        email: 'jmoore@a16z.com',
        organization: 'Andreessen Horowitz (a16z)',
        roleOrFocus: 'Generative AI Apps & Consumer Behavior',
        thesis: 'Companion Churn & Zero-Party Data'
    },
    {
        recipientName: 'Roy Bahat',
        email: 'roy@bloombergbeta.com',
        organization: 'Bloomberg Beta',
        roleOrFocus: 'Future of Work, Thinking & AI Tools',
        thesis: 'Cognitive Mirroring vs Flattery'
    },
    {
        recipientName: 'John Borthwick',
        email: 'john@betaworks.com',
        organization: 'Betaworks',
        roleOrFocus: 'AI Camp, Synthetic Media & Interaction',
        thesis: 'Persistent Context & Agent Graph'
    },
    {
        recipientName: 'Sahil Lavingia',
        email: 'sahil@gumroad.com',
        organization: 'SHL Capital',
        roleOrFocus: 'Solo GP, Lean B2C Software & AI Tools',
        thesis: 'High-Retention Anti-Sycophancy AI'
    },
    {
        recipientName: 'Packy McCormick',
        email: 'packy@notboring.co',
        organization: 'Not Boring Capital',
        roleOrFocus: 'Frontier Tech & Consumer AI Platforms',
        thesis: 'Zero-Party Cognitive Graph Moat'
    },
    {
        recipientName: 'James Currier',
        email: 'james@nfx.com',
        organization: 'NFX',
        roleOrFocus: 'Network Effects & Psychographic Software',
        thesis: 'Longitudinal Memory Flywheel'
    },
    {
        recipientName: 'Ryan Hoover',
        email: 'ryan@weekend.fund',
        organization: 'Weekend Fund',
        roleOrFocus: 'Early Consumer Products & Mobile AI',
        thesis: 'Post-ChatGPT Personal Companions'
    },
    {
        recipientName: 'Garry Tan',
        email: 'garry@initialized.com',
        organization: 'Initialized Capital',
        roleOrFocus: 'Seed Engineering Startups & Consumer Apps',
        thesis: 'Engineered Longitudinal Memory'
    },
    {
        recipientName: 'Elizabeth Yin',
        email: 'elizabeth@hustlefund.vc',
        organization: 'Hustle Fund',
        roleOrFocus: 'Pre-Seed Consumer Tech & High Velocity',
        thesis: 'Lean Capital Efficiency & 78.8% Assessment Flow'
    },
    {
        recipientName: 'David Tisch',
        email: 'david@boxgroup.com',
        organization: 'BoxGroup',
        roleOrFocus: 'Consumer Internet & AI Early Stage',
        thesis: 'Anti-Flattery Cognitive Assistant'
    },
    {
        recipientName: 'Lee Hower',
        email: 'lee@nextview.vc',
        organization: 'NextView Ventures',
        roleOrFocus: 'Everyday Consumer Economy & AI Tools',
        thesis: 'High-Utility Daily Thinking Companion'
    },
    {
        recipientName: 'Semil Shah',
        email: 'semil@haystack.vc',
        organization: 'Haystack',
        roleOrFocus: 'Seed Capital & Consumer AI Architecture',
        thesis: 'pgvector Longitudinal Moat'
    },
    {
        recipientName: 'Jeff Morris Jr.',
        email: 'jeff@chapterone.com',
        organization: 'Chapter One',
        roleOrFocus: 'Consumer Apps & Mobile AI Products',
        thesis: 'Retention-First AI Companion'
    },
    {
        recipientName: 'Malte Wagenbach',
        email: 'malte@hyper.com',
        organization: 'Hyper',
        roleOrFocus: 'Early Stage Consumer AI Founders',
        thesis: 'Cognitive Mirror Architecture'
    },
    {
        recipientName: 'Aileen Lee',
        email: 'aileen@cowboy.vc',
        organization: 'Cowboy Ventures',
        roleOrFocus: 'Seed Stage Consumer Tech & Digital Health',
        thesis: 'Mental Clarity & Cognitive Baseline'
    },
    {
        recipientName: 'Brad Burnham',
        email: 'brad@usv.com',
        organization: 'Union Square Ventures',
        roleOrFocus: 'Trust Systems & User-Owned Data',
        thesis: 'Zero-Party Cognitive Architecture'
    },
    {
        recipientName: 'Nikhil Basu Trivedi',
        email: 'nikhil@footwork.vc',
        organization: 'Footwork',
        roleOrFocus: 'Consumer Product & High D30 Retention',
        thesis: 'Longitudinal Retention Moat'
    },
    {
        recipientName: 'Michael Mignano',
        email: 'mmignano@lightspeedvp.com',
        organization: 'Lightspeed Venture Partners',
        roleOrFocus: 'Consumer Platforms & Next-Gen Audio/AI',
        thesis: 'Multi-Perspective Cognitive Companion'
    },
    {
        recipientName: 'Josh Kopelman',
        email: 'josh@firstround.com',
        organization: 'First Round Capital',
        roleOrFocus: 'Seed Stage Consumer Discovery',
        thesis: 'Zero-Party Data Moat in Consumer AI'
    }
];

/**
 * Curated Verified Catalog of Strategic Acquirers & App Rollup Operators
 */
const ACQUISITION_CATALOG = [
    {
        recipientName: 'Divestments Team',
        email: 'divestments@ytcventures.com',
        organization: 'YTC Ventures',
        roleOrFocus: 'Strategic Seller-Side Divestment Route',
        thesis: 'Turnkey mobile companion codebases & IP'
    },
    {
        recipientName: 'Partnerships & M&A Team',
        email: 'partnerships@calm.com',
        organization: 'Calm',
        roleOrFocus: 'Mindfulness & Mental Wellness App',
        thesis: 'Turnkey AI reflection companion & subscription tech'
    },
    {
        recipientName: 'Strategic Partnerships Team',
        email: 'partnerships@flo.health',
        organization: 'Flo Health',
        roleOrFocus: 'Global Health & Wellness Ecosystem',
        thesis: 'Psychographic reflection engine & companion IP'
    },
    {
        recipientName: 'Partnerships & Corporate Development',
        email: 'partnerships@betterhelp.com',
        organization: 'BetterHelp',
        roleOrFocus: 'Mental Health & Self-Care Platforms',
        thesis: 'Turnkey 4-mode cognitive mirror software'
    },
    {
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@blueberryapps.com',
        organization: 'Blueberry Apps',
        roleOrFocus: 'Mobile Software Acquirer',
        thesis: 'Consumer companion software & brand acquisition'
    },
    {
        recipientName: 'Atul Sachdeva',
        email: 'atul@appsmartz.com',
        organization: 'AppSmartz',
        roleOrFocus: 'Mobile App Developer & Consolidator',
        thesis: 'Live Google Play Android app + store listing'
    },
    {
        recipientName: 'Steve P. Young',
        email: 'steve@appmasters.com',
        organization: 'App Masters Portfolio',
        roleOrFocus: 'Mobile Growth & App Portfolio Operator',
        thesis: 'Turnkey Flutter companion asset transfer'
    },
    {
        recipientName: 'Corporate Development',
        email: 'corpdev@bendingspoons.com',
        organization: 'Bending Spoons',
        roleOrFocus: 'Top Consumer App Consolidator',
        thesis: 'Next-gen cognitive mirror technology & mobile codebase'
    },
    {
        recipientName: 'Andrew Wilkinson & Inbound Team',
        email: 'hi@tiny.com',
        organization: 'Tiny Capital',
        roleOrFocus: 'Wonderful Internet Software Businesses',
        thesis: 'Clean 100% asset acquisition of software & IP'
    },
    {
        recipientName: 'Dan Siroker',
        email: 'dan@limitless.ai',
        organization: 'Limitless AI',
        roleOrFocus: 'Personal AI Memory & Hardware/Software Ecosystem',
        thesis: 'Complementary pgvector cognitive graph tech'
    },
    {
        recipientName: 'Steve Lee',
        email: 'steve@aurahealth.io',
        organization: 'Aura Health',
        roleOrFocus: 'Mental Wellness & Sleep Marketplace App',
        thesis: 'AI self-reflection engine for subscription upsell'
    },
    {
        recipientName: 'Ramakant Vempati',
        email: 'ramakant@wysa.io',
        organization: 'Wysa',
        roleOrFocus: 'AI Companion & Cognitive Restructuring',
        thesis: 'Big Five onboarding & 4-perspective companion tech'
    },
    {
        recipientName: 'M&A Department',
        email: 'acquisitions@mosaicgroup.com',
        organization: 'IAC / Mosaic Group',
        roleOrFocus: 'Global Mobile Subscription Brands',
        thesis: 'Turnkey consumer AI subscription mobile codebase'
    },
    {
        recipientName: 'Product Strategy',
        email: 'acquisitions@apalon.com',
        organization: 'Apalon Apps',
        roleOrFocus: 'Lifestyle & Utility Mobile Portfolio',
        thesis: 'Ready-to-ship iOS Flutter + Live Google Play asset'
    },
    {
        recipientName: 'Portfolio Development',
        email: 'corpdev@palta.com',
        organization: 'Palta Health Tech',
        roleOrFocus: 'Preventative Health & Companion Apps',
        thesis: 'Cognitive baseline & psychographic memory engine'
    },
    {
        recipientName: 'M&A & Partnerships Team',
        email: 'partnerships@bendingspoons.com',
        organization: 'Bending Spoons',
        roleOrFocus: 'Top Consumer App Consolidator',
        thesis: 'Next-gen cognitive mirror technology & mobile codebase'
    },
    {
        recipientName: 'App Growth Team',
        email: 'partnerships@appify.com',
        organization: 'Appify Mobile Studio',
        roleOrFocus: 'Mobile App Publishing & Rollup',
        thesis: 'Complete IP and Android store transfer'
    },
    {
        recipientName: 'Corporate Development Team',
        email: 'acquisitions@applovin.com',
        organization: 'AppLovin',
        roleOrFocus: 'Global Mobile Application Portfolio & Studios',
        thesis: 'Live Google Play Android app + store listing asset sale'
    },
    {
        recipientName: 'M&A Evaluation',
        email: 'corpdev@headspace.com',
        organization: 'Headspace Health',
        roleOrFocus: 'Mindfulness & Digital Health Services',
        thesis: 'AI cognitive companion and reflection IP'
    },
    {
        recipientName: 'Strategic Partnerships Team',
        email: 'partnerships@simple.life',
        organization: 'Simple Life Apps',
        roleOrFocus: 'Mind & Body Digital Health Apps',
        thesis: 'Turnkey Flutter & Next.js product transfer'
    }
];

class LeadDiscoveryService {
    /**
     * Synthesizes tailored pitch copy based on candidate details and campaign type
     */
    generatePitch(campaignType, candidate) {
        if (campaignType === 'pr') {
            return this._generatePRPitch(candidate);
        } else if (campaignType === 'investor') {
            return this._generateInvestorPitch(candidate);
        } else if (campaignType === 'acquisition') {
            return this._generateAcquisitionPitch(candidate);
        }
        throw new Error(`Unsupported campaign type: ${campaignType}`);
    }

    _generatePRPitch(candidate) {
        const name = candidate.recipientName.split(' ')[0] || candidate.recipientName;
        const pub = candidate.organization || 'your publication';

        let subject = `Pitch: Reddit’s backlash against sycophantic AI companions (and our unedited head-to-head test)`;
        let introP = `I’ve followed your coverage of consumer AI and tech culture at ${pub}, particularly how companion models shape human behavior.`;

        if (candidate.angle === 'cognitive_architecture') {
            subject = `${name} — unedited test: Why AI companions flatter users (and our anti-sycophancy model)`;
            introP = `I follow your analysis of AI cognition and thinking tools at ${pub}.`;
        } else if (candidate.angle === 'loneliness_economy') {
            subject = `Story idea: The dangerous sycophancy trap of AI companions`;
            introP = `I follow your reporting at ${pub} on the societal and emotional impact of companion AI algorithms.`;
        } else if (candidate.angle === 'product_teardown') {
            subject = `Product teardown: What happens when an AI companion refuses to flatter you?`;
            introP = `I read your coverage of new consumer AI products and UX patterns at ${pub}.`;
        }

        const bodyText = `Hi ${name},

${introP}

Over on Reddit (across r/Replika, r/CharacterAI, and r/artificial), there is an escalating backlash against "AI sycophancy"—the way companion chatbots agree with every rationalization, cheer on procrastination, and act as hollow flattery mirrors. When a user confesses they spent 5 hours organizing Notion cards instead of doing real work, standard AI cheers: "Great job staying organized! You're doing amazing!"

It feels comforting in the moment, but users are increasingly reporting feeling hollow and alienated by bots that never push back.

I’m an indie engineer, and over the past 6 months I built TwinGenie (https://twingenie.app) to test the opposite hypothesis: what happens when an AI companion acts as an uncompromising cognitive mirror?

We built a transparent system using longitudinal memory (PostgreSQL + pgvector) and a 35-question Big Five personality baseline:
• 4 Distinct Perspectives: Baseline, 5-Year Future Self, Clinical Therapist, and Honest/Shadow Twin.
• The Single-Strike Rule: In Honest Mode, TwinGenie calls out avoidance and excuses directly—while strictly guarded to never attack the user's worth or identity.
• The Head-to-Head Comparison: When tested with identical procrastination prompts, conventional companions validate the delay, while TwinGenie pinpoints the avoidance and urges immediate action.

I would love to send you our unedited prompt comparison data, or give you unrestricted access to test TwinGenie directly.

Would you be interested in exploring this or seeing the unedited transcripts?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`;

        return { subject, bodyText };
    }

    _generateInvestorPitch(candidate) {
        const name = candidate.recipientName.split(' ')[0] || candidate.recipientName;
        const firm = candidate.organization || 'your fund';

        const subject = `TwinGenie (Pre-Seed): Building the Zero-Party Cognitive Graph for Consumer AI`;
        const bodyText = `Hi ${name},

I follow your focus at ${firm} on consumer AI and conversational software, particularly the challenges around retention cliffs and product differentiation.

The fundamental reason consumer AI chatbots experience high D30 churn is context amnesia and sycophancy. Because commodity models have no longitudinal baseline, they default to empty cheerleading and mirror the user's confirmation bias.

I’m Ashwani, founder of TwinGenie (https://twingenie.app). We are building what we call the "Zero-Party Cognitive Graph" for consumer AI:
• 35-Vector Baseline Calibration: Before their first session, users complete an onboarding assessment across the Big Five personality traits (78.8% completion rate), establishing an objective cognitive baseline.
• Longitudinal Context Moat: Built on PostgreSQL + pgvector, TwinGenie tracks user rationalizations, goal drift, and behavioral patterns over weeks, rather than treating each chat as day zero.
• The Anti-Sycophancy Positioning: 4 real-time cognitive perspectives (Baseline, 5-Year Future Self, Clinical Therapist, and Honest Twin). Honest Mode calls out avoidance and excuses with zero flattery—while enforcing a Single-Strike guardrail to protect user dignity.

Just as Cred built an irreplaceable data moat around creditworthiness, TwinGenie captures the high-resolution psychographic context layer that commodity foundation models can never replicate.

We are an early-stage, self-funded team with a live production Android app on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) and a responsive Next.js web platform.

We are opening a pre-seed angel round ($150k-$250k checks) to accelerate North American distribution. Can I share our 1-page memo or set up test access for you?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`;

        return { subject, bodyText };
    }

    _generateAcquisitionPitch(candidate) {
        const name = candidate.recipientName.split(' ')[0] || candidate.recipientName;
        const company = candidate.organization || 'your team';

        const subject = `${company} — mobile software & IP acquisition opportunity: TwinGenie`;
        const bodyText = `Hi ${name},

I saw ${company} evaluates mobile application and consumer software acquisitions, so I wanted to connect directly. I’m Ashwani, founder of TwinGenie (https://twingenie.app).

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
founder@twingenie.app`;

        return { subject, bodyText };
    }

    /**
     * Validates email syntax and integrity
     */
    isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const norm = email.trim().toLowerCase();
        if (PERMANENT_SUPPRESSION_LIST.has(norm)) return false;

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(norm)) return false;

        // Basic domain check
        const domain = norm.split('@')[1];
        if (!domain || domain.length < 4 || !domain.includes('.')) return false;

        return true;
    }

    /**
     * Pre-flight DNS MX verification
     * Verifies that the recipient domain has active mail exchange (MX) records.
     * Prevents bounces before an email is ever dispatched.
     */
    async hasValidMxRecord(email) {
        if (!this.isValidEmail(email)) return false;
        const domain = email.trim().toLowerCase().split('@')[1];
        try {
            const records = await dns.resolveMx(domain);
            return Array.isArray(records) && records.length > 0;
        } catch (err) {
            // Hard DNS errors indicate non-existent or misconfigured mail domains
            if (['ENODATA', 'ENOTFOUND', 'ESERVFAIL'].includes(err.code)) {
                logger.warn(`[LEAD DISCOVERY] Pre-flight MX check rejected ${email}: ${err.code}`);
                return false;
            }
            // In isolated test/sandbox environments without network, allow valid-syntax fallback
            logger.info(`[LEAD DISCOVERY] DNS lookup bypassed for ${domain} (${err.code || err.message})`);
            return true;
        }
    }

    /**
     * Fetches candidate catalog for a campaign type
     */
    getCatalog(campaignType) {
        if (campaignType === 'pr') return JOURNALIST_CATALOG;
        if (campaignType === 'investor') return INVESTOR_CATALOG;
        if (campaignType === 'acquisition') return ACQUISITION_CATALOG;
        return [];
    }

    /**
     * Replenishes local memory/JSON queue so campaign never runs dry even offline
     */
    replenishLocalQueue(state, campaignType, targetBuffer = 15) {
        state.queue = state.queue || [];
        state.history = state.history || [];
        const pendingCount = state.queue.filter(q => q.status === 'pending').length;
        if (pendingCount >= targetBuffer) return 0;

        const needed = targetBuffer - pendingCount;
        const catalog = this.getCatalog(campaignType);
        const existingEmails = new Set([
            ...state.queue.map(q => (q.email || '').toLowerCase().trim()),
            ...state.history.map(h => (h.email || '').toLowerCase().trim())
        ]);

        let added = 0;
        for (const item of catalog) {
            if (added >= needed) break;
            const email = (item.email || '').toLowerCase().trim();
            if (existingEmails.has(email) || !this.isValidEmail(email)) continue;

            const { subject, bodyText } = this.generatePitch(campaignType, item);
            state.queue.push({
                id: `${campaignType}_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
                recipientName: item.recipientName,
                email: email,
                organization: item.organization,
                roleOrFocus: item.roleOrFocus || item.thesis || 'General',
                subject: subject,
                bodyText: bodyText,
                status: 'pending',
                attempts: 0,
                lastAttemptAt: null,
                resendId: null,
                error: null
            });
            existingEmails.add(email);
            added++;
        }

        if (added > 0) {
            logger.info(`✅ [LEAD DISCOVERY] Added ${added} new catalog leads to local ${campaignType} queue (Total pending: ${state.queue.filter(q => q.status === 'pending').length})`);
        }
        return added;
    }

    /**
     * Autonomously replenishes the pending queue for a campaign type in Supabase PostgreSQL
     * Guarantees a minimum buffer of verified leads in PostgreSQL.
     */
    async replenishQueue(campaignType, targetBuffer = 15) {
        logger.info(`[LEAD DISCOVERY] Checking pending lead buffer for campaign: ${campaignType} (Target: >= ${targetBuffer})...`);

        try {
            // Check current pending count in Supabase
            const { data: pendingLeads, error: countError } = await supabaseAdmin
                .from('outreach_campaign_leads')
                .select('id, email')
                .eq('campaign_type', campaignType)
                .eq('status', 'pending');

            if (countError) {
                logger.warn(`[LEAD DISCOVERY] Supabase lead count failed: ${countError.message}.`);
                return { success: false, reason: 'database_unavailable', error: countError.message };
            }

            const currentPendingCount = (pendingLeads || []).length;
            logger.info(`[LEAD DISCOVERY] Current pending leads in DB for ${campaignType}: ${currentPendingCount}`);

            if (currentPendingCount >= targetBuffer) {
                logger.info(`[LEAD DISCOVERY] Buffer is healthy (${currentPendingCount} >= ${targetBuffer}). No replenishment needed.`);
                return { success: true, replenished: 0, currentPending: currentPendingCount };
            }

            const neededCount = targetBuffer - currentPendingCount;
            logger.info(`[LEAD DISCOVERY] Replenishing ${neededCount} leads for ${campaignType}...`);

            // Fetch all existing emails for this campaign to prevent duplicates
            const { data: existingLeads } = await supabaseAdmin
                .from('outreach_campaign_leads')
                .select('email')
                .eq('campaign_type', campaignType);

            const existingEmails = new Set((existingLeads || []).map(l => l.email.toLowerCase().trim()));

            const catalog = this.getCatalog(campaignType);
            const candidatesToInsert = [];

            for (const item of catalog) {
                if (candidatesToInsert.length >= neededCount) break;

                const email = item.email.toLowerCase().trim();
                if (existingEmails.has(email) || !this.isValidEmail(email) || !(await this.hasValidMxRecord(email))) {
                    continue;
                }

                const { subject, bodyText } = this.generatePitch(campaignType, item);

                candidatesToInsert.push({
                    campaign_type: campaignType,
                    recipient_name: item.recipientName,
                    email: email,
                    organization: item.organization,
                    role_or_focus: item.roleOrFocus || item.thesis || 'General',
                    subject: subject,
                    body_text: bodyText,
                    status: 'pending',
                    attempts: 0,
                    metadata: {
                        angle: item.angle || null,
                        source: 'catalog_discovery',
                        discovered_at: new Date().toISOString()
                    }
                });

                existingEmails.add(email);
            }

            if (candidatesToInsert.length === 0) {
                logger.info(`[LEAD DISCOVERY] Catalog exhausted or all leads already in DB for ${campaignType}.`);
                return { success: true, replenished: 0, currentPending: currentPendingCount };
            }

            // Insert into Supabase
            const { data: inserted, error: insertError } = await supabaseAdmin
                .from('outreach_campaign_leads')
                .insert(candidatesToInsert)
                .select('id, recipient_name, email');

            if (insertError) {
                logger.error(`[LEAD DISCOVERY] Failed to insert leads for ${campaignType}:`, insertError);
                return { success: false, error: insertError.message };
            }

            logger.info(`✅ [LEAD DISCOVERY] Successfully enqueued ${inserted?.length || candidatesToInsert.length} new leads for ${campaignType}!`);
            return {
                success: true,
                replenished: inserted?.length || candidatesToInsert.length,
                currentPending: currentPendingCount + (inserted?.length || candidatesToInsert.length)
            };

        } catch (error) {
            logger.error(`[LEAD DISCOVERY] Exception during replenishment for ${campaignType}:`, error);
            return { success: false, error: error.message };
        }
    }
}

export const leadDiscoveryService = new LeadDiscoveryService();
export default leadDiscoveryService;
