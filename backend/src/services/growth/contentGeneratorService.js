import logger from '../../config/logger.js';
import aiService from '../aiService.js';

/**
 * TwinGenie Content Generator Engine
 * Generates platform-specific content aligned with verified product capabilities:
 * - 4 Modes: Normal, Reflective, Honest, Future
 * - 35 Big Five-inspired questions & personality profiles
 * - Longitudinal pgvector memory & self-discovery
 */

export const CAMPAIGN_THEMES = [
    {
        id: 'blind_spots',
        name: 'Cognitive Blind Spots',
        hook: 'Why your biggest strength is also your blind spot',
        tag: 'SELF-REFLECTION',
        binaryQuestion: {
            prompt: "When you are stuck on a difficult decision or feeling overwhelmed, which AI perspective do you actually need?",
            optionA: "🅰️ Gentle emotional validation to decompress stress (Reflective Twin)",
            optionB: "🅱️ A brutally honest breakdown that cuts through your excuses (Honest Twin)"
        }
    },
    {
        id: 'honest_mode',
        name: 'Normal vs Honest Twin',
        hook: 'What happens when your AI stops flattering you',
        tag: 'HONEST PERSPECTIVE',
        binaryQuestion: {
            prompt: "Would you rather have an AI companion that:",
            optionA: "🅰️ Agrees with your reasons for delaying the work (Flattery AI)",
            optionB: "🅱️ Calls you out using your own words from 2 weeks ago (Honest Twin)"
        }
    },
    {
        id: 'decision_paralysis',
        name: 'Overthinking & Decision Styles',
        hook: 'The hidden pattern behind why you procrastinate on tough calls',
        tag: 'DECISION ARCHITECTURE',
        binaryQuestion: {
            prompt: "When you find yourself procrastinating on a high-stakes call, is it usually:",
            optionA: "🅰️ Fear of making the wrong choice (Analysis paralysis)",
            optionB: "🅱️ Exhaustion from juggling too many unorganized priorities?"
        }
    },
    {
        id: 'future_perspective',
        name: 'The 5-Year Wiser Self',
        hook: 'What your future self would say about the problem stressing you today',
        tag: 'FUTURE TWIN',
        binaryQuestion: {
            prompt: "If your 5-years-wiser self walked into the room right now, would they tell you to:",
            optionA: "🅰️ Slow down, breathe, and protect your peace (Compassionate View)",
            optionB: "🅱️ Stop overthinking, take the risk, and hit publish (Future Twin)"
        }
    },
    {
        id: 'persistent_memory',
        name: 'Memory-First AI Companions',
        hook: 'Why reset-button AI chatbots fail human personal growth',
        tag: 'LONGITUDINAL MEMORY',
        binaryQuestion: {
            prompt: "What bothers you most about standard AI chatbots?",
            optionA: "🅰️ They have zero memory and forget everything you told them yesterday",
            optionB: "🅱️ They agree with everything you say like a mindless yes-man"
        }
    }
];

class ContentGeneratorService {
    constructor() {
        this.themes = CAMPAIGN_THEMES;
    }

    /**
     * Builds direct Google Play Store link
     */
    buildUtmLink(platform, format, campaignId) {
        return 'https://play.google.com/store/apps/details?id=com.asmind.app';
    }

    /**
     * Generates a complete 4-platform package for a specific theme
     */
    async generateCampaignBundle(themeId = null, options = {}) {
        const theme = CAMPAIGN_THEMES.find(t => t.id === themeId) || 
                      CAMPAIGN_THEMES[Math.floor(Math.random() * CAMPAIGN_THEMES.length)];
        const campaignId = `camp_${theme.id}_${Date.now()}`;

        logger.info(`🧠 [CONTENT GENERATOR] Formulating multi-platform bundle for: "${theme.name}"`);

        // Generate content specs for each platform
        const linkedinPost = this._generateLinkedInContent(theme, campaignId);
        const instagramPost = this._generateInstagramContent(theme, campaignId);
        const facebookPost = this._generateFacebookContent(theme, campaignId, options.facebookFormat);
        const youtubePost = this._generateYouTubeContent(theme, campaignId);

        return {
            campaignId,
            theme: theme.name,
            posts: {
                linkedin: linkedinPost,
                instagram: instagramPost,
                facebook: facebookPost,
                youtube: youtubePost
            }
        };
    }

    _buildStandardSlides(theme) {
        return [
            {
                type: 'cover',
                tag: theme.tag || 'COGNITIVE ARCHITECTURE',
                title: theme.hook,
                subtitle: "Most AI companions are designed to be yes-men. They stroke your ego, nod along with your excuses, and forget your history.",
                takeaways: [
                    "Why conventional AI chatbots reinforce dangerous confirmation bias",
                    "How 4 distinct cognitive lenses stress-test your thinking",
                    "Why persistent vector memory turns chat into true self-growth"
                ]
            },
            {
                type: 'comparison',
                tag: 'THE FLATTERY TRAP',
                title: 'Normal Twin vs Honest Twin',
                subtitle: 'Two completely different answers to the exact same excuse:',
                left: {
                    badge: '[ TRADITIONAL AI (THE YES-MAN) ]',
                    user: "I feel like delaying this launch. I'm exhausted.",
                    ai: "Totally understandable! Take as much rest as you need. Self-care comes first!",
                    outcome: "Validates procrastination & fear of failure"
                },
                right: {
                    badge: '[ TWINGENIE (HONEST PERSPECTIVE) ]',
                    user: "I feel like delaying this launch. I'm exhausted.",
                    ai: "Looking at your memory log from 2 weeks ago, you said the same thing before the investor pitch. You aren't exhausted—you're scared of market judgment. Let's finish the checklist.",
                    outcome: "Exposes the blind spot & pushes you forward"
                }
            },
            {
                type: 'modes',
                tag: 'COGNITIVE ARCHITECTURE',
                title: 'One Context. 4 Cognitive Lenses.',
                subtitle: 'Switch perspectives anytime without losing your conversation history:',
                modes: [
                    { num: "01", name: "NORMAL TWIN", desc: "Your baseline voice, daily sounding board, and routine reflection." },
                    { num: "02", name: "REFLECTIVE TWIN", desc: "Deep psychological empathy, active listening, and emotional decompression." },
                    { num: "03", name: "HONEST TWIN", desc: "Direct, unfiltered challenger to rationalizations and cognitive blind spots." },
                    { num: "04", name: "FUTURE TWIN", desc: "The 5-years-wiser perspective bringing calm clarity to today's panic." }
                ]
            },
            {
                type: 'timeline',
                tag: 'LONGITUDINAL MEMORY',
                title: 'Why Chatbots Reset (And Why We Don\'t)',
                subtitle: 'TwinGenie connects your thoughts across weeks using pgvector:',
                steps: [
                    { step: "STAGE 01", title: "35-Question Assessment", desc: "Maps your Big Five personality traits, stress responses, and core values." },
                    { step: "STAGE 02", title: "Semantic Pattern Matching", desc: "Detects recurring self-sabotage loops that single-session chats miss completely." },
                    { step: "STAGE 03", title: "The Compound Mirror", desc: "Your digital twin becomes sharper, wiser, and more attuned to your actual growth." }
                ],
                note: "• 100% Private Vector Memory — Never shared or used for third-party training"
            },
            {
                type: 'cta',
                tag: 'AVAILABLE NOW',
                title: 'Meet Your Digital Twin Today',
                subtitle: 'Stop talking to AI that forgets you. Start building real self-awareness.',
                points: [
                    "35-Question Big Five personality baseline",
                    "4 perspectives: Normal, Reflective, Honest, Future",
                    "Persistent semantic memory across all conversations",
                    "100% private, self-guided reflection"
                ],
                button: 'Download TwinGenie on Google Play',
                link: 'play.google.com/store/apps/details?id=com.asmind.app'
            }
        ];
    }

    _generateLinkedInContent(theme, campaignId, target = 'company') {
        if (target === 'personal') {
            return this._generateLinkedInPersonalContent(theme, campaignId);
        }
        const utm = this.buildUtmLink('linkedin_company', 'carousel_pdf', campaignId);
        return {
            platform: 'linkedin',
            target: 'company',
            format: 'carousel_pdf',
            title: `${theme.name} — A Cognitive Analysis`,
            utmLink: utm,
            slides: this._buildStandardSlides(theme),
            caption: `Why do conventional AI chatbots feel hollow after three conversations?

Because they reset. They have zero memory of your goals, zero context on your insecurities, and a built-in bias toward pleasing you rather than helping you grow.

At TwinGenie, we engineered an AI Digital Twin with persistent pgvector memory and four distinct cognitive lenses:
1. Normal — your baseline voice
2. Reflective — compassionate emotional grounding
3. Honest — unfiltered, direct challenge to cognitive blind spots
4. Future — the 5-years-wiser perspective on today’s panic

Swipe through the carousel to see how longitudinal reflection changes executive judgment.

👉 Explore the live product on Google Play: ${utm}

#AI #PersonalGrowth #DecisionMaking #Leadership #DigitalTwin #TwinGenie`
        };
    }

    _generateLinkedInPersonalContent(theme, campaignId) {
        const utm = this.buildUtmLink('linkedin_ashwani', 'carousel_pdf', campaignId);
        const themeId = theme.id || 'honest_mode';

        // 5 Fully Customized Founder Thought-Leadership Packages (Punchy, High-Converting, Clean on Mobile & Desktop)
        const founderPosts = {
            blind_spots: {
                title: "Why Your Biggest Strength Is Also Your Greatest Cognitive Blind Spot",
                caption: `Every founder has a superpower that quietly doubles as their biggest liability.

• Hyper-decisive? You dismiss subtle risk signals.
• Deeply empathetic? You tolerate underperformance.
• Hyper-analytical? You disguise procrastination as "thoroughness".

Standard AI chatbots only amplify this—they nod along with your excuses and mirror your confirmation bias.

When engineering TwinGenie, our goal was to build an uncompromising cognitive mirror: 4 distinct perspectives — Normal, Reflective, Honest, Future — and persistent pgvector memory that intercepts recurring blind spots across weeks.

Swipe through the 6-slide carousel below to see how our cognitive pipeline works. 👇

📲 Test your cognitive baseline free on Google Play. Direct link in first comment.

#TwinGenie #AI #Leadership #CognitiveBiases #TechFounders #DigitalTwin #PersonalGrowth`
            },
            honest_mode: {
                title: "Why Most AI Chatbots Are Flattering Yes-Men — And How We Built TwinGenie",
                caption: `Most conversational AI is engineered to be a flattering yes-man. It strokes your ego, validates your excuses, and forgets everything the moment you close the browser tab.

Human personal growth doesn't come from unconditional agreement. It comes from dialectical friction.

That's why we engineered TwinGenie with 4 cognitive lenses:
• Normal Twin — Your baseline thinking partner
• Reflective Twin — Emotional validation & grounding
• Honest Twin — Zero flattery; shreds rationalizations
• Future Twin — 5-years-wiser retrospective clarity

Backed by persistent pgvector memory, TwinGenie remembers who you are and holds you accountable.

Swipe through the 6-slide breakdown below to explore the architecture. 👇

📲 Download free on Google Play (link in first comment).

#TwinGenie #ArtificialIntelligence #TechFounders #LLM #CognitiveScience #DigitalTwin #ProductEngineering`
            },
            decision_paralysis: {
                title: "The Hidden Cognitive Pattern Behind Why Founders Stall on Tough Calls",
                caption: `"I just need a little more data before deciding."

In 90% of founder decisions, "waiting for more data" is just sophisticated procrastination disguised as diligence.

Standard chatbots make this worse by generating endless pros and cons—fueling your overthinking loop instead of forcing a decision.

In TwinGenie, we engineered an AI that shatters analysis paralysis:
• Semantic Loop Interception — Detects when you circle the same decision for 2 weeks
• 4 Decision Lenses — Clarifies facts, uncovers underlying fear, and evaluates 5-year impact
• Deterministic Calibration — Balances your innate cognitive bias

Accelerate conviction over hesitation.

Swipe through the 6-slide carousel below to see how we break decision loops. 👇

📲 Take your free 35-question cognitive baseline on Google Play (link in first comment).

#TwinGenie #DecisionMaking #Productivity #ExecutiveCoaching #AI #Startups #MentalModels`
            },
            future_perspective: {
                title: "What Your 5-Years-Wiser Self Would Say About Today's Crisis",
                caption: `Think about the worst crisis you faced 5 years ago.

Back then, it felt like the company was ending. Today? You can barely remember the panic—or it became the catalyst for your biggest breakthrough.

Human psychology suffers from severe temporal discounting: we over-index on today's panic and discount long-term trajectory.

That's why we built the Future Twin in TwinGenie:
• Temporal Shift Engine — Simulates the calm, retrospective clarity of your 5-years-wiser self
• Persistent Vector Memory — Retains your historical wins and core values across months
• Multi-Perspective Matrix — Shifts you from acute stress into long-term strategic focus

Whenever today's fires feel overwhelming, switch to Future Mode.

Swipe through the 6-slide breakdown below to see how the temporal engine works. 👇

📲 Experience all 4 modes free on Google Play (link in first comment).

#TwinGenie #FutureSelf #MentalClarity #TechFounders #AICompanion #SelfGrowth #Leadership`
            },
            persistent_memory: {
                title: "Why Reset-Button AI Chatbots Fail Human Personal Growth",
                caption: `Why do 95% of people abandon AI companions after two weeks?

Because every time you open the app, it's Day One all over again.

Chatbots operate on a stateless "reset button." But a stateless AI cannot be a mentor, coach, or true digital twin. True self-growth requires compounding memory.

Here is how we built TwinGenie's memory-first architecture:
• 35-Question Psychological Baseline — Maps your Big Five personality traits
• Semantic pgvector Memory — Encrypted vector embeddings that connect conversations across weeks
• 4 Real-Time Cognitive Perspectives — Shifts from baseline thinking to brutal honesty

Stop talking to AI that forgets you the second you close the tab.

Swipe through the memory progression pipeline below. 👇

📲 Build your persistent digital twin on Google Play (link in first comment).

#TwinGenie #VectorDatabase #pgvector #AIArchitecture #MachineLearning #PersonalGrowth #ProductDesign`
            }
        };

        const postData = founderPosts[themeId] || founderPosts.honest_mode;

        return {
            platform: 'linkedin',
            target: 'personal',
            format: 'carousel_pdf',
            title: postData.title,
            utmLink: utm,
            slides: this._buildFounderSlides(theme),
            caption: postData.caption
        };
    }

    _buildFounderSlides(theme) {
        const themeId = theme.id || 'honest_mode';

        if (themeId === 'blind_spots') {
            return [
                {
                    type: 'cover',
                    tag: 'COGNITIVE BLIND SPOTS',
                    title: "Why Your Biggest Strength Is Also Your Greatest Blind Spot",
                    subtitle: "Every high-performing founder has a superpower that quietly doubles as their biggest blind spot. Generic AI only reinforces the trap.",
                    takeaways: [
                        "How hyper-decisiveness hides subtle risk signals",
                        "Why stateless chatbots nod along with founder confirmation bias",
                        "Engineering a persistent cognitive mirror that tracks loops over weeks"
                    ]
                },
                {
                    type: 'comparison',
                    tag: 'CONFIRMATION BIAS VS COGNITIVE MIRROR',
                    title: 'Standard LLM vs. TwinGenie Cognitive Mirror',
                    subtitle: 'How two systems respond when a founder rationalizes an impulsive shortcut:',
                    left: {
                        badge: '[ STANDARD CHATBOT (EGO VALIDATOR) ]',
                        user: "I'm skipping the security audit. We need to ship fast to beat competitors.",
                        ai: "Agreed! Speed is everything in startups. Ship now and patch later if issues arise!",
                        outcome: "Validates reckless bias & masks vulnerability"
                    },
                    right: {
                        badge: '[ TWINGENIE (COGNITIVE MIRROR) ]',
                        user: "I'm skipping the security audit. We need to ship fast to beat competitors.",
                        ai: "On Sept 12th, skipping testing caused a 4-day outage. Speed isn't your bottleneck—you're anxious about competitor PR. Run the automated audit.",
                        outcome: "Intercepts the blind spot using historical memory"
                    }
                },
                {
                    type: 'modes',
                    tag: 'MULTI-PERSPECTIVE STRESS-TESTING',
                    title: 'Stress-Testing Founder Biases',
                    subtitle: 'Four distinct cognitive lenses designed to expose blind spots before the market does:',
                    modes: [
                        { name: 'Normal Twin', color: '#9333EA', desc: 'Your objective daily sounding board and thinking partner' },
                        { name: 'Reflective Twin', color: '#38BDF8', desc: 'Identifies emotional fatigue driving hasty decisions' },
                        { name: 'Honest Twin', color: '#F43F5E', desc: 'Brutally dismantles rationalizations and cognitive shortcuts' },
                        { name: 'Future Twin', color: '#34D399', desc: 'Evaluates the 5-year systemic risk of today\'s compromise' }
                    ]
                },
                {
                    type: 'timeline',
                    tag: 'LOOP INTERCEPTION ENGINE',
                    title: 'The Cognitive Mirror Pipeline',
                    subtitle: 'How TwinGenie detects recurring subconscious patterns across weeks:',
                    steps: [
                        { step: "STAGE 01", title: "Baseline Calibration", desc: "35 Big Five-inspired questions establish your deterministic communication map and cognitive blind spots." },
                        { step: "STAGE 02", title: "Semantic Pattern Matching", desc: "pgvector embeddings detect recurring self-sabotage loops that single-session chats miss completely." },
                        { step: "STAGE 03", title: "Proactive Loop Interception", desc: "Anticipates cognitive blind spots and challenges founder excuses before they impact execution." }
                    ]
                },
                {
                    type: 'dynamic',
                    tag: 'ARCHITECTURE AUDIT',
                    title: 'The Engineering Behind the Mirror',
                    highlight: 'ZERO-SYCOPHANCY SYSTEM DESIGN',
                    content: 'Standard LLMs are fine-tuned to be people-pleasers. Breaking that bias required a new architecture:',
                    bullets: [
                        'Deterministic Vector Baseline: Personality traits mapped into strict prompt constraints.',
                        'Cross-Session Semantic Recall: pgvector indexing reveals multi-week behavioral loops.',
                        'Dialectical Friction Engine: Explicitly rewards challenging user assumptions over agreeable nods.'
                    ]
                },
                {
                    type: 'cta',
                    tag: 'TWINGENIE • LIVE ON GOOGLE PLAY',
                    title: 'Test Your Cognitive Baseline Today',
                    subtitle: 'Uncover your subconscious blind spots with the only AI that remembers and challenges you.',
                    button: 'Download Free on Google Play',
                    badge: '5.0 ★ • Cognitive AI Companion • com.asmind.app',
                    link: 'play.google.com/store/apps/details?id=com.asmind.app  •  Engineered by Ashwani Kumar'
                }
            ];
        }

        if (themeId === 'decision_paralysis') {
            return [
                {
                    type: 'cover',
                    tag: 'DECISION ARCHITECTURE',
                    title: "The Hidden Cognitive Pattern Behind Why Founders Stall on Tough Calls",
                    subtitle: "\"I just need a little more data\" is usually sophisticated procrastination. Here's how we engineered an AI to break analysis paralysis.",
                    takeaways: [
                        "Why generic chatbots fuel overthinking with endless pro/con lists",
                        "The mathematical variance trap in executive decision-making",
                        "Using semantic memory to intercept recurring indecision loops"
                    ]
                },
                {
                    type: 'comparison',
                    tag: 'PARALYSIS VS BREAKTHROUGH',
                    title: 'Generic AI vs. TwinGenie Decision Engine',
                    subtitle: 'When an executive is hesitating on a pivotal pricing pivot:',
                    left: {
                        badge: '[ GENERIC LLM (THE ENABLER) ]',
                        user: "Should I delay raising prices? I'm worried about churn.",
                        ai: "Here are 15 pros and cons of delaying price changes, plus 8 alternative hybrid models you could explore first...",
                        outcome: "Paralyzes with information overload & delays action"
                    },
                    right: {
                        badge: '[ TWINGENIE (DECISION ENGINE) ]',
                        user: "Should I delay raising prices? I'm worried about churn.",
                        ai: "You've discussed this 3 times since last month. Your unit economics are underwater. The churn risk is 4%, but runway is 3 months. Pull the trigger today.",
                        outcome: "Forces conviction by cutting through the noise"
                    }
                },
                {
                    type: 'modes',
                    tag: 'FOUR DECISION LENSES',
                    title: 'Decoupling Stress from Strategy',
                    subtitle: 'Evaluate high-stakes calls from 4 synchronized mental models:',
                    modes: [
                        { name: 'Normal Twin', color: '#9333EA', desc: 'Clarifies immediate business metrics without emotional distortion' },
                        { name: 'Reflective Twin', color: '#38BDF8', desc: 'Diagnoses whether fear of criticism is masquerading as caution' },
                        { name: 'Honest Twin', color: '#F43F5E', desc: 'Cuts through rationalizations: You aren\'t being thorough, you\'re stalling' },
                        { name: 'Future Twin', color: '#34D399', desc: 'Evaluates whether this delay will matter 5 years from now' }
                    ]
                },
                {
                    type: 'timeline',
                    tag: 'DECISION CONVERGENCE PIPELINE',
                    title: 'From Analysis Paralysis to Fast Conviction',
                    subtitle: 'How TwinGenie accelerates high-confidence executive execution:',
                    steps: [
                        { step: "STAGE 01", title: "Hesitation Detection", desc: "Monitors recurring decision paralysis markers and circular prompt loops in real time." },
                        { step: "STAGE 02", title: "Bias Inversion Weighting", desc: "Counterbalances baseline neuroticism and risk aversion from your 35-question psychological profile." },
                        { step: "STAGE 03", title: "Decisive Conviction", desc: "Synthesizes raw facts into an actionable 48-hour execution mandate with zero ambiguity." }
                    ]
                },
                {
                    type: 'dynamic',
                    tag: 'COGNITIVE SCIENCE',
                    title: 'Why Decision Speed Compounds',
                    highlight: 'CONVICTION OVER PERFECTION',
                    content: 'In early-stage technology companies, decision latency kills faster than bad decisions:',
                    bullets: [
                        'Information Entropy: Beyond 70% data availability, extra research yields diminishing returns.',
                        'Cortisol Drift: Prolonged indecision drains executive energy reserves.',
                        'Semantic Accountability: Vector memory tracks whether you followed through on commitments.'
                    ]
                },
                {
                    type: 'cta',
                    tag: 'TWINGENIE • LIVE ON GOOGLE PLAY',
                    title: 'Break Decision Paralysis Today',
                    subtitle: 'Accelerate executive conviction with an AI Digital Twin calibrated to your personality.',
                    button: 'Download Free on Google Play',
                    badge: '5.0 ★ • Cognitive AI Companion • com.asmind.app',
                    link: 'play.google.com/store/apps/details?id=com.asmind.app  •  Engineered by Ashwani Kumar'
                }
            ];
        }

        if (themeId === 'future_perspective') {
            return [
                {
                    type: 'cover',
                    tag: 'TEMPORAL CLARITY',
                    title: "What Your 5-Years-Wiser Self Would Say About Today's Crisis",
                    subtitle: "We over-index on today's cortisol and discount our long-term trajectory. Here's how the Future Twin changes executive judgment.",
                    takeaways: [
                        "How temporal discounting traps leaders in reactive firefighting",
                        "Using retrospective reframing to de-escalate high-stress moments",
                        "Connecting current obstacles to your historical compounding growth"
                    ]
                },
                {
                    type: 'comparison',
                    tag: 'REACTIVE PANIC VS RETROSPECTIVE CLARITY',
                    title: 'Immediate Anxiety vs. Future Perspective',
                    subtitle: 'When an unexpected crisis threatens your quarterly milestone:',
                    left: {
                        badge: '[ STANDARD CHATBOT (SHORT-TERM SYMPATHY) ]',
                        user: "Our top lead just canceled. Everything is falling apart.",
                        ai: "I'm so sorry to hear that! That must feel so terrible. Drink some tea, rest, and try again tomorrow.",
                        outcome: "Amplifies the tragedy & offers zero perspective"
                    },
                    right: {
                        badge: '[ TWINGENIE (FUTURE TWIN) ]',
                        user: "Our top lead just canceled. Everything is falling apart.",
                        ai: "Remember when your first 3 enterprise trials canceled in Q1? You pivoted positioning and closed 5 better deals. This loss clears pipeline capacity for ideal-fit customers. Let's recalibrate.",
                        outcome: "Restores retrospective clarity and re-anchors courage"
                    }
                },
                {
                    type: 'modes',
                    tag: 'FOUR TEMPORAL LENSES',
                    title: 'The Cognitive Matrix in Action',
                    subtitle: 'Balancing empathy, reality, and long-term trajectory:',
                    modes: [
                        { name: 'Normal Twin', color: '#9333EA', desc: 'Your balanced baseline co-pilot for daily operations' },
                        { name: 'Reflective Twin', color: '#38BDF8', desc: 'Validates psychological strain when emotional reserves run low' },
                        { name: 'Honest Twin', color: '#F43F5E', desc: 'Dismantles self-pity and forces immediate operational focus' },
                        { name: 'Future Twin', color: '#34D399', desc: 'Views current obstacles through the lens of a 5-years-wiser mentor' }
                    ]
                },
                {
                    type: 'timeline',
                    tag: 'THE TEMPORAL PROGRESSION',
                    title: 'The Longitudinal Wisdom Engine',
                    subtitle: 'How TwinGenie builds a continuous model of your future self:',
                    steps: [
                        { step: "STAGE 01", title: "Trajectory Mapping", desc: "35 Big Five-inspired questions define your ultimate aspirations and long-term values." },
                        { step: "STAGE 02", title: "Stress Vectoring", desc: "Records past crises and tracks historical resilience to prove you survived past setbacks." },
                        { step: "STAGE 03", title: "Retrospective Equanimity", desc: "Reframes immediate crises through the lens of a 5-years-wiser mentor to neutralize short-term panic." }
                    ]
                },
                {
                    type: 'dynamic',
                    tag: 'NEUROSCIENCE & PSYCHOLOGY',
                    title: 'The Science of the Future Self',
                    highlight: 'OVERCOMING TEMPORAL MYOPIA',
                    content: 'fMRI studies show the brain views our future selves like total strangers. TwinGenie bridges that gap:',
                    bullets: [
                        'Neural Distance Reduction: Bringing future consequences into immediate focus.',
                        'Compounding Perspective: Turning acute setbacks into permanent cognitive assets.',
                        'Longitudinal Resilience: Using pgvector to prove you have survived every crisis so far.'
                    ]
                },
                {
                    type: 'cta',
                    tag: 'TWINGENIE • LIVE ON GOOGLE PLAY',
                    title: 'Meet Your Future Self Today',
                    subtitle: 'Gain calm, retrospective clarity on today\'s highest-stress decisions.',
                    button: 'Download Free on Google Play',
                    badge: '5.0 ★ • Cognitive AI Companion • com.asmind.app',
                    link: 'play.google.com/store/apps/details?id=com.asmind.app  •  Engineered by Ashwani Kumar'
                }
            ];
        }

        if (themeId === 'persistent_memory') {
            return [
                {
                    type: 'cover',
                    tag: 'LONGITUDINAL MEMORY',
                    title: "Why Reset-Button AI Chatbots Fail Human Personal Growth",
                    subtitle: "95% of users abandon AI companions after 2 weeks because they reset every day. Here is how we engineered an AI with compounding memory.",
                    takeaways: [
                        "The fatal flaw of stateless LLMs in personal development",
                        "How persistent pgvector embeddings link thoughts across weeks",
                        "Building an alter-ego that grows wiser alongside you"
                    ]
                },
                {
                    type: 'comparison',
                    tag: 'STATELESS VS LONGITUDINAL',
                    title: 'Day 30: Traditional Chatbot vs. TwinGenie',
                    subtitle: 'What happens when you return to your AI after a difficult month:',
                    left: {
                        badge: '[ TRADITIONAL LLM (STATELESS RESET) ]',
                        user: "I'm having that same argument with my co-founder again.",
                        ai: "I'm sorry to hear that! What kind of business do you have, and what is your co-founder's role?",
                        outcome: "Zero context. Re-explaining history destroys momentum"
                    },
                    right: {
                        badge: '[ TWINGENIE (LONGITUDINAL VECTOR MEMORY) ]',
                        user: "I'm having that same argument with my co-founder again.",
                        ai: "Is this about product roadmap priority like on the 8th, or equity vesting from last week? You both agreed on OKRs—let's look at the baseline alignment.",
                        outcome: "Instant context. Builds compounding strategic value"
                    }
                },
                {
                    type: 'modes',
                    tag: 'PERSISTENT MULTI-LENS ENGINE',
                    title: 'Memory Across All Four Perspectives',
                    subtitle: 'Every mode draws from the same shared longitudinal memory graph:',
                    modes: [
                        { name: 'Normal Twin', color: '#9333EA', desc: 'Remembers daily commitments, habits, and ongoing tactical projects' },
                        { name: 'Reflective Twin', color: '#38BDF8', desc: 'Retains emotional patterns, recurring stressors, and psychological breakthroughs' },
                        { name: 'Honest Twin', color: '#F43F5E', desc: 'Remembers past excuses and holds you strictly accountable to your words' },
                        { name: 'Future Twin', color: '#34D399', desc: 'Monitors long-term trajectory and guards your multi-year vision' }
                    ]
                },
                {
                    type: 'timeline',
                    tag: 'THE VECTOR PROGRESSION PIPELINE',
                    title: 'How TwinGenie Remembers What Matters',
                    subtitle: 'The 3-stage memory transformation from empty prompt to true digital twin:',
                    steps: [
                        { step: "STAGE 01", title: "Psychological Baseline", desc: "35 Big Five questions establish your deterministic communication map and core behavioral vectors." },
                        { step: "STAGE 02", title: "Vector Embedding (pgvector)", desc: "Extracts semantic concepts across time, preventing context decay over months of conversation." },
                        { step: "STAGE 03", title: "Compounding Alter-Ego", desc: "Anticipates objections, tracks goal adherence, and evolves into an indispensable executive co-pilot." }
                    ]
                },
                {
                    type: 'dynamic',
                    tag: 'SYSTEM ARCHITECTURE',
                    title: 'Under the Hood: Vector Memory Engine',
                    highlight: 'PRIVACY-FIRST LONGITUDINAL RECALL',
                    content: 'Engineering long-term context retention without multi-turn token explosion:',
                    bullets: [
                        'Semantic Vector Clustering: pgvector indexes key themes, dilemmas, and milestones.',
                        'Cosine Similarity Retrieval: Injects exact historical context in under 80ms.',
                        'Zero Third-Party Training: Your psychological vector data is 100% private and encrypted.'
                    ]
                },
                {
                    type: 'cta',
                    tag: 'TWINGENIE • LIVE ON GOOGLE PLAY',
                    title: 'Build Your Digital Twin Today',
                    subtitle: 'Stop talking to AI that resets. Start conversing with an AI that remembers and challenges you.',
                    button: 'Download Free on Google Play',
                    badge: '5.0 ★ • Cognitive AI Companion • com.asmind.app',
                    link: 'play.google.com/store/apps/details?id=com.asmind.app  •  Engineered by Ashwani Kumar'
                }
            ];
        }

        // Default Theme: Honest Mode (Flagship Founder Architecture)
        return [
            {
                type: 'cover',
                tag: 'FOUNDER & AI ARCHITECTURE',
                title: "Why Most AI Chatbots Are Flattering Yes-Men — And How We Built an AI That Remembers & Challenges You",
                subtitle: "When I set out to build TwinGenie, I noticed a fundamental flaw in today's generative AI: LLMs have zero memory and a desperate algorithmic bias to please you.",
                takeaways: [
                    "Why stateless LLMs reinforce dangerous confirmation bias & complacency",
                    "The 4-perspective cognitive engine: Normal, Reflective, Honest, Future",
                    "Engineering persistent pgvector memory for true human self-growth"
                ]
            },
            {
                type: 'comparison',
                tag: 'COGNITIVE AUDIT',
                title: 'Standard AI vs. TwinGenie Honest Mode',
                subtitle: 'Two completely different responses to the exact same executive excuse:',
                left: {
                    badge: '[ STANDARD LLM (ZERO MEMORY) ]',
                    user: "I feel like delaying this product release. I'm burnt out.",
                    ai: "Totally valid! Prioritize self-care, take a break, and sleep in. Launch whenever you feel ready!",
                    outcome: "Validates procrastination & hides fear of failure"
                },
                right: {
                    badge: '[ TWINGENIE (HONEST TWIN) ]',
                    user: "I feel like delaying this product release. I'm burnt out.",
                    ai: "Looking at your memory logs from Oct 4th and 18th, you said the exact same thing before the demo. You aren't burnt out—you're scared of market critique. Let's execute.",
                    outcome: "Detects the recurring loop & forces breakthrough"
                }
            },
            {
                type: 'modes',
                tag: 'MULTI-PERSPECTIVE AI',
                title: 'Four Distinct Cognitive Lenses',
                subtitle: 'Built on Big Five psychological baselines to challenge your thinking from every angle:',
                modes: [
                    { name: 'Normal Twin', color: '#9333EA', desc: 'Your authentic baseline tone & objective daily sounding board' },
                    { name: 'Reflective Twin', color: '#38BDF8', desc: 'High-empathy emotional validation & deep psychological grounding' },
                    { name: 'Honest Twin', color: '#F43F5E', desc: 'Zero flattery, zero bias. Brutally exposes blind spots & excuses' },
                    { name: 'Future Twin', color: '#34D399', desc: 'The 5-years-wiser executive lens viewing today\'s panic in retrospect' }
                ]
            },
            {
                type: 'timeline',
                tag: 'PGVECTOR SEMANTIC MEMORY',
                title: 'The Memory Progression Pipeline',
                subtitle: 'How your AI evolves from an empty chatbot into an indispensable alter-ego:',
                steps: [
                    { step: "STAGE 01", title: "Baseline Calibration", desc: "35 Big Five-inspired questions establish your deterministic psychological and communication map." },
                    { step: "STAGE 02", title: "Pattern Recognition", desc: "Vector embeddings identify recurring stress triggers, decision paralysis, and cognitive loops." },
                    { step: "STAGE 03", title: "True Digital Twin", desc: "Anticipates objections, tracks goal adherence, and acts as a 24/7 executive co-pilot." }
                ]
            },
            {
                type: 'dynamic',
                tag: 'SYSTEM ARCHITECTURE',
                title: 'Under the Hood: Engineering TwinGenie',
                highlight: '3 CORE TECHNICAL BREAKTHROUGHS',
                content: 'Building TwinGenie required solving 3 major engineering hurdles that off-the-shelf wrappers ignore:',
                bullets: [
                    'Dynamic Multi-Provider Orchestration: Seamless sub-second fallbacks across leading LLMs.',
                    'Deterministic Scoring Pipeline: Compressing 35 psychological traits into prompt constraints.',
                    'Longitudinal Vector Memory: pgvector indexing ensuring zero context decay over months.'
                ]
            },
            {
                type: 'cta',
                tag: 'TWINGENIE • LIVE ON GOOGLE PLAY',
                title: 'Take the 35-Question Baseline Today',
                subtitle: 'Available now on Google Play Store with full persistent memory & 4 cognitive modes enabled.',
                button: 'Download Free on Google Play',
                badge: '5.0 ★ • Cognitive AI Companion • com.asmind.app',
                link: 'play.google.com/store/apps/details?id=com.asmind.app  •  Engineered by Ashwani Kumar'
            }
        ];
    }

    _generateInstagramContent(theme, campaignId) {
        const utm = this.buildUtmLink('instagram', 'image_carousel', campaignId);
        const bq = theme.binaryQuestion || {
            prompt: "Which AI perspective would you use first?",
            optionA: "🅰️ Compassionate Reflective",
            optionB: "🅱️ Brutally Honest"
        };
        return {
            platform: 'instagram',
            format: 'image_carousel',
            title: theme.hook,
            utmLink: utm,
            slides: this._buildStandardSlides(theme),
            caption: `Have you ever had an AI call you out on your own excuses? 🪞

Most chatbots are yes-men. They stroke your ego and forget you the second you close the tab.

TwinGenie is built differently:
✨ 35-question personality onboarding
✨ 4 distinct modes (Normal, Reflective, Honest, Future)
✨ Persistent memory that remembers your past goals and patterns

Quick question:
${bq.prompt}
${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

🔗 Download free on Google Play — Link in bio!

#personalgrowth #selfimprovement #ai #digitaltwin #mindsetshift #selfreflection #productivity #twingenie`
        };
    }

    _generateFacebookContent(theme, campaignId, requestedFormat = null) {
        // Automatically alternate between 'carousel' and 'reel' if not specified
        const format = requestedFormat || (Math.random() > 0.5 ? 'reel' : 'carousel');
        const utmMedium = format === 'reel' ? 'reel_video' : 'multi_image_carousel';
        const utm = this.buildUtmLink('facebook', utmMedium, campaignId);

        const bq = theme.binaryQuestion || {
            prompt: "When you are stuck on a difficult decision or feeling overwhelmed, which AI perspective do you actually need?",
            optionA: "🅰️ Gentle emotional validation to decompress stress (Reflective Twin)",
            optionB: "🅱️ A brutally honest breakdown that cuts through your excuses (Honest Twin)"
        };

        const caption = `What happens when your AI companion stops flattering you and starts telling you the truth? 🪞

Most AI assistants agree with whatever you say. They validate your doubts, indulge your procrastination, and reset their memory the moment you close the tab.

TwinGenie is engineered differently with 4 cognitive perspectives: Normal, Reflective, Honest, and Future You.

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #AI #PersonalGrowth #DigitalTwin #SelfReflection #MindsetShift`;

        const firstComment = `📲 Experience both perspectives free on Google Play: ${utm}\nTake your 35-question Big Five personality baseline today!`;

        if (format === 'reel') {
            return {
                platform: 'facebook',
                format: 'reel',
                title: theme.hook,
                tag: theme.tag,
                utmLink: utm,
                slides: this._buildStandardSlides(theme),
                caption,
                firstComment
            };
        }

        return {
            platform: 'facebook',
            format: 'multi_image_carousel',
            title: `Cognitive Architecture: ${theme.name}`,
            tag: theme.tag,
            utmLink: utm,
            slides: this._buildStandardSlides(theme),
            caption,
            firstComment
        };
    }

    _generateYouTubeContent(theme, campaignId) {
        const utm = this.buildUtmLink('youtube', 'short', campaignId);
        return {
            platform: 'youtube',
            format: 'short',
            title: `${theme.hook} 🧠 #Shorts`,
            tag: theme.tag,
            utmLink: utm,
            videoScript: {
                hook: theme.hook,
                problem: "Conventional chatbots have zero memory of your goals, your struggles, or your personality.",
                solution: "Meet TwinGenie. It builds a digital twin based on 35 personality questions, remembers your longitudinal journey, and lets you switch between Normal, Reflective, and Brutally Honest modes.",
                cta: "Download TwinGenie on Google Play today. Link in description."
            },
            caption: `Tired of AI that forgets you? Meet TwinGenie — your AI Digital Twin with persistent memory and 4 distinct perspectives.

📲 Download free on Google Play: ${utm}

#Shorts #AI #PersonalGrowth #SelfImprovement #DigitalTwin #TwinGenie`,
            firstComment: `📲 Download TwinGenie on Google Play: ${utm}`
        };
    }
}

const contentGeneratorService = new ContentGeneratorService();
export default contentGeneratorService;
