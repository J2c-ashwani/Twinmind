import logger from '../../config/logger.js';
import aiService from '../aiService.js';

/**
 * TwinGenie Content Generator Engine
 * Generates platform-specific content aligned with verified product capabilities:
 * - 4 Modes: Normal, Reflective, Honest, Future
 * - 35 Big Five-inspired questions & personality profiles
 * - Longitudinal pgvector memory & self-discovery
 */

const CAMPAIGN_THEMES = [
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
    /**
     * Builds standard UTM link for attribution
     */
    buildUtmLink(platform, format, campaignId) {
        const base = 'https://twingenie.app/open';
        return `${base}?utm_source=${encodeURIComponent(platform)}&utm_medium=${encodeURIComponent(format)}&utm_campaign=${encodeURIComponent(campaignId)}`;
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
                link: 'twingenie.app  •  Live on Google Play Store'
            }
        ];
    }

    _generateLinkedInContent(theme, campaignId) {
        const utm = this.buildUtmLink('linkedin', 'carousel_pdf', campaignId);
        return {
            platform: 'linkedin',
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
