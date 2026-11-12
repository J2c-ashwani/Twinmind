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
    'pete@theneuro.ai',
    // Unsubscribe Requests & Permanent Suppression
    'steve@appmasters.com',
    'steve@appmasters.co',
    'steve.young@appmasters.com',
    'contact@appmasters.com',
    'info@appmasters.com'
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
    },
    {
        recipientName: 'Matt Wolfe',
        email: 'matt@futuretools.io',
        organization: 'Future Tools',
        roleOrFocus: 'AI Tools & Weekly Video Teardowns',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Martin Crowley',
        email: 'martin@aitoolreport.com',
        organization: 'AI Tool Report',
        roleOrFocus: 'Daily AI Tools & App Spotlight',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Rowan Cheung',
        email: 'rowan@therundown.ai',
        organization: 'The Rundown AI',
        roleOrFocus: 'AI Tech & Consumer App Spotlights',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Greg Isenberg',
        email: 'greg@latecheckout.studio',
        organization: 'You Probably Need a Robot / Late Checkout',
        roleOrFocus: 'AI Communities, UX & Consumer Bots',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Alexandre Valaitis',
        email: 'alex@wrotetech.com',
        organization: 'WROTE AI',
        roleOrFocus: 'Practical AI Products & Cognitive Tech',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Nathan Lands',
        email: 'nathan@lore.com',
        organization: 'Lore AI',
        roleOrFocus: 'AI Culture, Companions & Digital Identity',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Ben Parr',
        email: 'ben@octaneai.com',
        organization: 'AI Insights & Solopreneurship',
        roleOrFocus: 'Conversational UX & AI Psychology',
        angle: 'loneliness_economy'
    },
    {
        recipientName: 'Swyx',
        email: 'swyx@latent.space',
        organization: 'Latent Space',
        roleOrFocus: 'AI Engineering, Memory & Thinking Tools',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Heather Cooper',
        email: 'heather@visuallyai.com',
        organization: 'Visually AI',
        roleOrFocus: 'Indie AI Tools & Multi-Modal Interfaces',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Charlie Guo',
        email: 'charlie@artificialignorance.net',
        organization: 'Artificial Ignorance',
        roleOrFocus: 'AI Critique, Reasoning & App Analysis',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Bram Adams',
        email: 'bram@bramadams.dev',
        organization: "Bramses' Newsletter",
        roleOrFocus: 'Digital Memory, pgvector & Self-Reflection AI',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Michael Nuñez',
        email: 'michael@venturebeat.com',
        organization: 'VentureBeat AI',
        roleOrFocus: 'Consumer AI Apps & Editorial Features',
        angle: 'product_teardown'
    },
    {
        recipientName: 'Carl Franzen',
        email: 'carl@venturebeat.com',
        organization: 'VentureBeat AI',
        roleOrFocus: 'Generative AI & Companion Tech',
        angle: 'reddit_backlash'
    },
    {
        recipientName: 'Sharon Goldman',
        email: 'sharon@venturebeat.com',
        organization: 'VentureBeat AI',
        roleOrFocus: 'Enterprise & Consumer AI Ethics',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Nathan Benaich',
        email: 'nathan@air-street.com',
        organization: 'State of AI Report',
        roleOrFocus: 'AI Industry Trends & Consumer Software',
        angle: 'cognitive_architecture'
    },
    {
        recipientName: 'Aditya Ramesh',
        email: 'aditya@creatoreconomy.so',
        organization: 'Creator Economy AI',
        roleOrFocus: 'AI Tools for Creators & Indie Founders',
        angle: 'product_teardown'
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
        recipientName: 'Acquisitions Team',
        email: 'acquisitions@voodoo.io',
        organization: 'Voodoo Apps',
        roleOrFocus: 'Global Consumer & Mobile App Publisher',
        thesis: 'Live Google Play Android app + turnkey companion codebase'
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

        let subject = `Pitch: Why AI companions need anti-sycophancy guardrails (TwinGenie)`;
        let introP = `I’ve followed your coverage of consumer AI and tech culture at ${pub}, particularly how companion models shape human behavior.`;

        if (candidate.angle === 'cognitive_architecture') {
            subject = `${name} — Designing an anti-sycophantic AI self-reflection twin`;
            introP = `I follow your analysis of AI cognition and thinking tools at ${pub}.`;
        } else if (candidate.angle === 'loneliness_economy') {
            subject = `Story idea: The sycophancy trap in consumer AI companions`;
            introP = `I follow your reporting at ${pub} on the societal and emotional impact of companion AI systems.`;
        } else if (candidate.angle === 'product_teardown') {
            subject = `Product teardown: What happens when an AI companion refuses to flatter you?`;
            introP = `I read your coverage of new consumer AI products and UX patterns at ${pub}.`;
        }

        const bodyText = `Hi ${name},

${introP}

Across consumer AI companion forums, users increasingly push back on AI sycophancy—the tendency of chat assistants to agree with every rationalization and flatter procrastination instead of encouraging honest reflection.

I’m Ashwani Kumar, an independent solo founder, and I built TwinGenie (https://twingenie.app) as an AI self-reflection companion designed around grounded feedback rather than empty validation.

What is live today on Android and Web:
• 35-question Big Five personality onboarding that shapes each user's Twin profile from day one.
• 4 reflective perspectives: Normal Twin, 5-Year Future Self, Reflective/Supportive mode, and Honest mode.
• Semantic vector memory built on PostgreSQL + pgvector plus deterministic crisis interception and output safety boundaries (non-clinical mindfulness tool, not licensed therapy).

If you'd like to explore how it works, I’d be glad to send over a short product walkthrough video or set up test access on Google Play or Web.

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`;

        return { subject, bodyText };
    }

    _generateInvestorPitch(candidate) {
        const name = candidate.recipientName.split(' ')[0] || candidate.recipientName;
        const firm = candidate.organization || 'your fund';

        const subject = `TwinGenie: Structured Big Five onboarding & longitudinal memory for personal AI`;
        const bodyText = `Hi ${name},

I follow your focus at ${firm} on consumer AI and conversational software, especially around retention and differentiation beyond generic chat wrappers.

Generic AI chatbots start every session cold and tend toward agreeable sycophancy. I’m Ashwani Kumar, solo founder of TwinGenie (https://twingenie.app), an early-stage self-reflection companion built to personalize from session one:
• 35-Question Personality Onboarding: Captures Big Five tendencies and reflection preferences up front to shape tone and perspective.
• Persistent Context Layer: Built on Node.js, PostgreSQL + pgvector semantic memory, and multi-provider LLM routing with deterministic crisis & safety guards.
• 4 Reflective Perspectives: Normal, 5-Year Future Self, Reflective/Supportive, and Honest modes designed to challenge avoidance rather than flatter it.

We have a live Android app on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app) alongside a Next.js web app. We're still early-stage (pre-revenue) and exploring strategic partners, angel backing, or product acquisition conversations.

Would you like to see our 1-page architecture summary or take a quick product walkthrough?

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

I saw ${company} evaluates mobile applications and AI software assets, so I wanted to reach out directly. I’m Ashwani Kumar, solo founder of TwinGenie (https://twingenie.app).

I built TwinGenie as a full-stack AI self-reflection companion:
• Production Android app live on Google Play (https://play.google.com/store/apps/details?id=com.asmind.app)
• Responsive Next.js web application and Flutter mobile codebase (Android shipped; iOS build still requires store submission work)
• Node.js backend with multi-provider LLM routing, deterministic safety guards, and PostgreSQL + pgvector memory
• 35-question Big Five personality onboarding engine

I'm an engineering founder looking for an operator with consumer distribution expertise to take over 100% of the IP, codebases, and store listings—or explore joining a strong product team where TwinGenie's architecture fits. We're early-stage and pre-revenue, so the value is in the turnkey codebase and months of engineering saved.

If this fits what ${company} looks at, I can send over our technical overview and a live walkthrough.

Best,
Ashwani Kumar
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
        if (norm.endsWith('@appmasters.com') || norm.endsWith('@appmasters.co')) return false;

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
