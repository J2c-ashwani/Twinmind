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
        tag: 'SELF-REFLECTION'
    },
    {
        id: 'honest_mode',
        name: 'Normal vs Honest Twin',
        hook: 'What happens when your AI stops flattering you',
        tag: 'HONEST PERSPECTIVE'
    },
    {
        id: 'decision_paralysis',
        name: 'Overthinking & Decision Styles',
        hook: 'The hidden pattern behind why you procrastinate on tough calls',
        tag: 'DECISION ARCHITECTURE'
    },
    {
        id: 'future_perspective',
        name: 'The 5-Year Wiser Self',
        hook: 'What your future self would say about the problem stressing you today',
        tag: 'FUTURE TWIN'
    },
    {
        id: 'persistent_memory',
        name: 'Memory-First AI Companions',
        hook: 'Why reset-button AI chatbots fail human personal growth',
        tag: 'LONGITUDINAL MEMORY'
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
    async generateCampaignBundle(themeId = null) {
        const theme = CAMPAIGN_THEMES.find(t => t.id === themeId) || 
                      CAMPAIGN_THEMES[Math.floor(Math.random() * CAMPAIGN_THEMES.length)];
        const campaignId = `camp_${theme.id}_${Date.now()}`;

        logger.info(`🧠 [CONTENT GENERATOR] Formulating multi-platform bundle for: "${theme.name}"`);

        // Generate content specs for each platform
        const linkedinPost = this._generateLinkedInContent(theme, campaignId);
        const instagramPost = this._generateInstagramContent(theme, campaignId);
        const facebookPost = this._generateFacebookContent(theme, campaignId);
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

    _generateLinkedInContent(theme, campaignId) {
        const utm = this.buildUtmLink('linkedin', 'carousel_pdf', campaignId);
        return {
            platform: 'linkedin',
            format: 'carousel_pdf',
            title: `${theme.name} — A Cognitive Analysis`,
            utmLink: utm,
            slides: [
                {
                    title: theme.hook,
                    content: "Most leaders operate with unchecked cognitive habits. Here is what persistent self-reflection reveals about your decision loop.",
                    highlight: "TWINGENIE COGNITIVE STUDY",
                    tag: theme.tag
                },
                {
                    title: "The Problem With Flattery AI",
                    content: "Conventional chat assistants agree with everything you say. They reinforce confirmation bias rather than stress-testing your judgment.",
                    highlight: "CONFIRMATION BIAS RISK",
                    tag: "BIAS TRAP"
                },
                {
                    title: "The Four-Perspective Mirror",
                    content: "TwinGenie maintains one shared memory pipeline across 4 conversational lenses: Normal (baseline), Reflective (empathy), Honest (unfiltered), and Future (5 years wiser).",
                    highlight: "4 PERSPECTIVES OVER 1 CONTEXT",
                    tag: "ARCHITECTURE"
                },
                {
                    title: "Longitudinal Memory in Action",
                    content: "By using pgvector semantic retrieval, the model tracks your patterns across weeks—spotting recurring triggers before you even notice them.",
                    highlight: "SEMANTIC PATTERN RECOGNITION",
                    tag: "DEEP MEMORY"
                },
                {
                    title: "Meet Your Digital Twin",
                    content: "Complete the 35-question assessment and begin structured reflection. Available live on Google Play.",
                    highlight: "GET STARTED TODAY",
                    tag: "TWINGENIE APP"
                }
            ],
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
        return {
            platform: 'instagram',
            format: 'image_carousel',
            title: theme.hook,
            utmLink: utm,
            slides: [
                {
                    title: theme.hook,
                    content: "Swipe to see what happens when your AI companion actually remembers you instead of resetting every chat.",
                    highlight: "AI THAT REMEMBERS 🧠",
                    tag: theme.tag
                },
                {
                    title: "Normal Twin vs Honest Twin",
                    content: "Normal Twin says: 'It makes sense you are tired.'\nHonest Twin says: 'You aren’t tired, you are avoiding the task because you are afraid of failing.'",
                    highlight: "BRUTALLY ACCURATE 🎯",
                    tag: "HONEST MODE"
                },
                {
                    title: "35 Questions to Map Your Mind",
                    content: "Your twin is tuned to your Big Five personality traits, stress triggers, and decision patterns.",
                    highlight: "BIG FIVE PSYCHOLOGY 📊",
                    tag: "ONBOARDING"
                },
                {
                    title: "Never Repeat Your Story",
                    content: "Vector memory means what you shared 3 weeks ago still informs how your twin supports you today.",
                    highlight: "LONGITUDINAL MEMORY 🔗",
                    tag: "SMART CONTEXT"
                },
                {
                    title: "Create Your Digital Twin",
                    content: "Download TwinGenie on Google Play. Tap the link in bio to begin.",
                    highlight: "LINK IN BIO 📲",
                    tag: "DOWNLOAD NOW"
                }
            ],
            caption: `Have you ever had an AI call you out on your own excuses? 🪞

Most chatbots are yes-men. They stroke your ego and forget you the second you close the tab.

TwinGenie is built differently:
✨ 35-question personality onboarding
✨ 4 distinct modes (Normal, Reflective, Honest, Future)
✨ Persistent memory that remembers your past goals and patterns

Which mode would you use first: Compassionate Reflective or Brutally Honest? Drop a comment below 👇

🔗 Download free on Google Play — Link in bio!

#personalgrowth #selfimprovement #ai #digitaltwin #mindsetshift #selfreflection #productivity #twingenie`
        };
    }

    _generateFacebookContent(theme, campaignId) {
        const utm = this.buildUtmLink('facebook', 'image_carousel', campaignId);
        return {
            platform: 'facebook',
            format: 'single_image',
            title: `Self-Growth Insight: ${theme.name}`,
            utmLink: utm,
            caption: `What if you had an AI that truly understood how your mind works? 💡

A lot of people feel exhausted repeating themselves to AI tools that forget everything. That's why we created TwinGenie. 

Instead of generic chat, TwinGenie:
• Analyzes your personality through 35 Big Five-inspired questions
• Gives you 4 perspectives (Normal, Reflective, Honest, and Future You)
• Uses continuous memory so your conversations build on each other over time

If you could ask a 5-years-wiser version of yourself one question right now, what would it be?

📲 Download TwinGenie on Google Play: ${utm}

#PersonalGrowth #Mindset #SelfReflection #AICompanion #TwinGenie`
        };
    }

    _generateYouTubeContent(theme, campaignId) {
        const utm = this.buildUtmLink('youtube', 'short', campaignId);
        return {
            platform: 'youtube',
            format: 'short',
            title: `Stop Using AI Chatbots That Forget You 🧠 #Shorts`,
            utmLink: utm,
            videoScript: {
                hook: "Stop using AI chatbots that forget your life story every single time you open the app.",
                problem: "They have zero memory of your goals, your struggles, or your personality.",
                solution: "Meet TwinGenie. It builds a digital twin based on 35 personality questions, remembers your longitudinal journey, and lets you switch between Normal, Reflective, and Brutally Honest modes.",
                cta: "Download TwinGenie on Google Play today. Link in description."
            },
            description: `Tired of AI that forgets you? Meet TwinGenie — your AI Digital Twin with persistent memory and 4 distinct perspectives.

📲 Download on Google Play: ${utm}

#Shorts #AI #PersonalGrowth #SelfImprovement #DigitalTwin #TwinGenie`
        };
    }
}

const contentGeneratorService = new ContentGeneratorService();
export default contentGeneratorService;
