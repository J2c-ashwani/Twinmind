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
        return {
            platform: 'linkedin',
            target: 'personal',
            format: 'carousel_pdf',
            title: `Why Most AI Chatbots Are Flattering Yes-Men — And How We Built TwinGenie`,
            utmLink: utm,
            slides: this._buildFounderSlides(theme),
            caption: `Most conversational AI is engineered to be a flattering yes-man.

It nods along with your excuses, strokes your ego, and forgets everything you told it the second you close the browser tab.

When I started designing TwinGenie, I realized that if an AI companion can’t remember your past patterns and lacks the courage to challenge your cognitive blind spots, it’s not an intelligence tool—it’s just interactive entertainment.

Human growth doesn’t come from unconditional agreement. It comes from dialectical tension.

To solve this, we engineered an AI Digital Twin built around three core architectural pillars:

1️⃣ The 35-Question Deterministic Baseline
Rather than relying on vague open-ended prompts, we ground each user in a structured Big Five personality model. This creates a persistent behavioral vector that defines your baseline tone, risk tolerance, and cognitive inclinations.

2️⃣ Persistent Longitudinal Vector Memory (pgvector)
Traditional chatbots suffer from severe context decay. TwinGenie indexes conversations semantically. When you make an excuse on a Tuesday, the model connects it to an identical pattern you exhibited three weeks prior—calling out recurring loops before they derail your momentum.

3️⃣ The 4-Perspective Cognitive Matrix
One tone cannot handle every human situation. We decoupled the personality into 4 real-time lenses:
• Normal Twin — Your authentic baseline voice and objective sparring partner.
• Reflective Twin — Compassionate emotional validation when you need psychological grounding.
• Honest Twin — Unfiltered, direct confrontation that shreds excuses and highlights blind spots.
• Future Twin — The 5-years-wiser executive lens viewing today’s panic with retrospective clarity.

Building this required moving beyond off-the-shelf wrappers and engineering dynamic multi-provider LLM orchestration with sub-second latency fallbacks and strict prompt drift governance.

The app is live today on Google Play Store.

Take the 35-question cognitive baseline, test Honest Mode against your own excuses, and let me know if it changes how you think about conversational AI.

📲 Download TwinGenie free: ${utm}

Swipe through the carousel breakdown below to see the complete cognitive architecture. 👇

#ArtificialIntelligence #MachineLearning #SystemArchitecture #TechFounders #LLM #CognitiveScience #DigitalTwin #TwinGenie #ProductEngineering`
        };
    }

    _buildFounderSlides(theme) {
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
                    { phase: 'DAY 1: BASELINE CALIBRATION', detail: '35 Big Five-inspired questions establish your deterministic psychological & communication map.' },
                    { phase: 'WEEK 2: PATTERN RECOGNITION', detail: 'Vector embeddings identify recurring stress triggers, decision paralysis & cognitive loops.' },
                    { phase: 'MONTH 3: TRUE DIGITAL TWIN', detail: 'Anticipates objections, tracks goal adherence & acts as a 24/7 executive co-pilot.' }
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

Drop A or B in the comments! 👇`;

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
