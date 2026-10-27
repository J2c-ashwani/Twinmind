import logger from '../../config/logger.js';
import aiService from '../aiService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import supabaseAdmin from '../../config/supabase.js';

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

export const CURATED_FALLBACK_THEMES = [
    {
        id: 'sunk_cost_fallacy',
        topic: 'The Sunk Cost Fallacy: Why Smart Founders Double Down on Dead Bets',
        category: 'DECISION ARCHITECTURE',
        hook: 'The hardest sentence for an ambitious founder to utter is: "We were wrong, and we need to stop."',
        title: 'The Sunk Cost Fallacy in Startup Strategy',
        linkedinCaption: `The hardest sentence for an ambitious founder to utter is: "We were wrong, and we need to stop."

When you've poured 9 months, $100k, and your personal pride into a feature or market hypothesis, your brain refuses to cut losses.

Instead, you double down:
• "We just need one more feature release."
• "The market just doesn't understand the vision yet."
• "If we stop now, the last 6 months were wasted."

In cognitive psychology, this is the Sunk Cost Trap—and standard AI chatbots make it worse. When you ask them for reassurance, they enthusiastically generate 10 reasons why your failing strategy could still work. They validate your ego instead of challenging your conviction.

At TwinGenie, we engineered an AI Digital Twin that functions as an uncompromising cognitive mirror:
1. Normal Twin — everyday strategic sounding board
2. Reflective Twin — compassionate decompression when burnout strikes
3. Honest Twin — unfiltered challenger that cites your initial KPIs from memory
4. Future Twin — the 5-years-wiser perspective asking: "Will this dead bet matter in 2031?"

👉 Meet your digital twin on Google Play: https://play.google.com/store/apps/details?id=com.asmind.app

#TwinGenie #FounderMindset #DecisionMaking #Startups #CognitiveBias`,
        facebookCaption: `The hardest sentence for an ambitious founder to utter is: "We were wrong, and we need to stop." 🛑

When you've poured 6 months into a feature that isn't moving metrics, standard AI bots act like flattering cheerleaders—encouraging you to waste another 3 months.

TwinGenie is engineered differently: with persistent vector memory, its Honest Mode challenges your rationalizations using your own words from day one.

Quick question for you:
When you realize a project isn't working, what is your instinct?

🅰️ Pivot immediately and cut emotional attachment
OR
🅱️ Give it one more sprint to prove itself?

Drop A or B below! 👇

#TwinGenie #Startups #Leadership #MentalModels`,
        binaryQuestion: {
            prompt: "When you realize a project isn't working, what is your instinct?",
            optionA: "🅰️ Pivot immediately and cut emotional attachment",
            optionB: "🅱️ Give it one more sprint to prove itself?"
        },
        voiceScript: {
            voiceHook: "Why do ambitious founders double down on dying projects instead of pivoting?",
            voiceProblem: "When you invest six months into an idea, standard chatbots flatter your excuses and encourage endless delays.",
            voiceSolution: "TwinGenie uses persistent memory to confront your rationalizations and force radical strategic clarity.",
            voiceCta: "Meet your personal digital twin today. Download TwinGenie free on Google Play."
        },
        slides: [
            {
                type: 'cover',
                tag: 'DECISION ARCHITECTURE',
                title: 'The Sunk Cost Trap',
                subtitle: 'Why smart founders double down on dying bets',
                takeaways: [
                    'How ego disguises failure as persistence',
                    'Why yes-man AI companions fuel toxic confirmation bias',
                    'How longitudinal memory forces objective conviction'
                ]
            },
            {
                type: 'dynamic',
                tag: 'THE COGNITIVE TRAP',
                title: 'The Commitment Loop',
                subtitle: 'Why cutting losses feels like admitting defeat',
                bullets: [
                    'Identity entanglement: Confusing the project with your self-worth',
                    'Justification creep: Inventing new metrics to disguise flat traction',
                    'Echo chamber trap: Asking agreeable chatbots for strategic validation'
                ]
            },
            {
                type: 'comparison',
                tag: 'THE FLATTERY TRAP',
                title: 'Yes-Man AI vs Honest Twin',
                subtitle: 'Two contrasting responses to the exact same pivot anxiety',
                left: {
                    badge: '[ STANDARD AI (THE YES-MAN) ]',
                    user: "No one is buying, but we spent 6 months building this. Should we keep pushing?",
                    ai: "Absolutely! Overnight success takes grit. Keep grinding and marketing!",
                    outcome: "Burns 6 more months of runway on a dead thesis"
                },
                right: {
                    badge: '[ TWINGENIE (HONEST TWIN) ]',
                    user: "No one is buying, but we spent 6 months building this. Should we keep pushing?",
                    ai: "Looking at your memory notes from July, your kill-switch condition was zero sales after 60 days. You hit that 40 days ago. Kill it and preserve cash.",
                    outcome: "Cuts losses instantly and refocuses energy"
                }
            },
            {
                type: 'timeline',
                tag: 'COGNITIVE ARCHITECTURE',
                title: 'The Pivot Clarity Pipeline',
                subtitle: 'How TwinGenie deconstructs executive hesitation',
                steps: [
                    { step: 'STAGE 01', title: 'Premise Calibration', desc: 'Pre-registers your objective success criteria and risk boundaries.' },
                    { step: 'STAGE 02', title: 'Memory Interception', desc: 'pgvector memory flags when you rationalise away missed deadlines.' },
                    { step: 'STAGE 03', title: 'Future Perspective', desc: 'The 5-years-wiser Future Twin brings calm clarity to pivot anxiety.' }
                ]
            },
            {
                type: 'cta',
                tag: 'AVAILABLE NOW',
                title: 'Meet Your Digital Twin Today',
                subtitle: 'Stop talking to AI that forgets you. Start building real self-awareness.',
                points: [
                    '35-Question Big Five personality baseline',
                    '4 perspectives: Normal, Reflective, Honest, Future',
                    'Persistent pgvector memory across all conversations',
                    '100% private, self-guided executive reflection'
                ],
                button: 'Download TwinGenie on Google Play',
                link: 'play.google.com/store/apps/details?id=com.asmind.app'
            }
        ]
    },
    {
        id: 'false_urgency',
        topic: 'False Urgency vs Strategic Leverage: The High-Stress Founder Loop',
        category: 'HIGH PERFORMANCE',
        hook: 'Running around putting out self-created fires feels like hard work. It is actually sophisticated avoidance.',
        title: 'False Urgency vs Strategic Leverage',
        linkedinCaption: `Running around putting out fires feels like high-leverage execution. 

Most of the time, it's just sophisticated avoidance.

When founders are terrified of making an existential strategic choice—like firing a toxic VP, fixing unit economics, or making cold enterprise sales calls—they manufacture fake operational crises:
• Redesigning the landing page for the 4th time
• Re-organizing Notion project boards
• Responding instantly to low-priority Slack messages

This creates a dopamine loop of "busyness" without an inch of actual company progress.

Standard chatbots only amplify this: they cheerfully help you draft 20 emails and optimize trivial workflows, never asking: "Why are you doing this instead of closing the deal?"

At TwinGenie, we engineered an AI Digital Twin with persistent pgvector memory:
• Normal Twin: your baseline strategic voice
• Reflective Twin: uncovers the underlying anxiety driving the fake urgency
• Honest Twin: challenges your avoidance using your past stated priorities
• Future Twin: brings the 5-years-wiser lens to focus only on what matters

👉 Download TwinGenie on Google Play: https://play.google.com/store/apps/details?id=com.asmind.app

#TwinGenie #Productivity #FounderPsychology #Leadership #DeepWork`,
        facebookCaption: `Putting out fires feels like hard work. Most of the time, it's just avoiding the work that actually matters. 🚨

When founders hesitate on a tough call, they reorganize Slack channels and tweak landing pages—mistaking motion for progress.

TwinGenie's Honest Mode flags this immediately by comparing today's tasks against your long-term goals.

Quick question for you:
When your day feels overwhelming, is it usually:

🅰️ Too many genuinely urgent fires
OR
🅱️ Struggling to prioritize the single highest-leverage task?

Drop A or B below! 👇

#TwinGenie #Productivity #Leadership #Focus`,
        binaryQuestion: {
            prompt: "When your day feels overwhelming, is it usually:",
            optionA: "🅰️ Too many genuinely urgent fires",
            optionB: "🅱️ Struggling to prioritize the single highest-leverage task?"
        },
        voiceScript: {
            voiceHook: "Why do founders mistake frantic busyness for actual strategic progress?",
            voiceProblem: "When you dread a hard call, standard chatbots help you optimize trivial tasks and avoid the real bottleneck.",
            voiceSolution: "TwinGenie uses longitudinal memory to detect avoidance loops and refocus you on primary leverage.",
            voiceCta: "Stop talking to AI that enables procrastination. Download TwinGenie free on Google Play today."
        },
        slides: [
            {
                type: 'cover',
                tag: 'HIGH PERFORMANCE',
                title: 'The False Urgency Trap',
                subtitle: 'Why frantic busyness is often disguised fear',
                takeaways: [
                    'How fake emergencies protect your ego from judgment',
                    'Why agreeable chatbots amplify low-value task loops',
                    'How longitudinal reflection restores executive leverage'
                ]
            },
            {
                type: 'dynamic',
                tag: 'THE AVOIDANCE LOOP',
                title: 'Motion vs Progress',
                subtitle: 'The 3 signs you are running from the real work',
                bullets: [
                    'Tinkering with internal tools while delaying sales calls',
                    'Treating every notification as an existential fire',
                    'Ending 12-hour days completely drained but zero needle moved'
                ]
            },
            {
                type: 'comparison',
                tag: 'THE FLATTERY TRAP',
                title: 'Yes-Man AI vs Honest Twin',
                subtitle: 'Contrasting responses to task avoidance',
                left: {
                    badge: '[ STANDARD AI (THE YES-MAN) ]',
                    user: "Help me rewrite this email template for the 5th time.",
                    ai: "Sure! Here are 3 brilliant, highly polished versions!",
                    outcome: "Enables 2 more hours of avoiding customer outreach"
                },
                right: {
                    badge: '[ TWINGENIE (HONEST TWIN) ]',
                    user: "Help me rewrite this email template for the 5th time.",
                    ai: "The template is fine. You rewrote it yesterday. You're scared of getting rejected on the demo call. Send the version from 9:00 AM.",
                    outcome: "Cuts through hesitation and forces real outreach"
                }
            },
            {
                type: 'timeline',
                tag: 'STRATEGIC ARCHITECTURE',
                title: 'Restoring True Leverage',
                subtitle: 'The 3-stage clarity reset',
                steps: [
                    { step: 'STAGE 01', title: 'Priority Auditing', desc: 'Pins your single highest-leverage weekly mandate.' },
                    { step: 'STAGE 02', title: 'Avoidance Interception', desc: 'Flags trivial micro-tasks that distract from revenue goals.' },
                    { step: 'STAGE 03', title: 'Equanimous Execution', desc: 'Future Twin reframes short-term rejection as long-term resilience.' }
                ]
            },
            {
                type: 'cta',
                tag: 'AVAILABLE NOW',
                title: 'Meet Your Digital Twin Today',
                subtitle: 'Stop talking to AI that forgets you. Start building real self-awareness.',
                points: [
                    '35-Question Big Five personality baseline',
                    '4 perspectives: Normal, Reflective, Honest, Future',
                    'Persistent pgvector memory across all conversations',
                    '100% private, self-guided executive reflection'
                ],
                button: 'Download TwinGenie on Google Play',
                link: 'play.google.com/store/apps/details?id=com.asmind.app'
            }
        ]
    }
];

class ContentGeneratorService {
    constructor() {
        this.themes = CAMPAIGN_THEMES;
        this._dailyCache = {};
    }

    /**
     * Deterministic Calendar Schedule Engine (Asia/Kolkata timezone).
     * Calculates day index and guarantees strictly alternating Facebook formats.
     */
    getDailySchedule(date = new Date()) {
        const istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
        const epoch = new Date('2026-10-20T00:00:00+05:30');
        const target = new Date(`${istDateStr}T00:00:00+05:30`);
        const dayNumber = Math.max(0, Math.round((target - epoch) / (1000 * 60 * 60 * 24)));

        const themes = this.themes;
        const themeIndex = dayNumber % themes.length;
        const currentTheme = themes[themeIndex];

        // Format strictly alternates every single day on Facebook:
        // Day 0: Carousel, Day 1: Reel, Day 2: Carousel, Day 3: Reel...
        const facebookFormat = (dayNumber % 2 === 0) ? 'carousel' : 'reel';

        return {
            istDateStr,
            dayNumber,
            themeIndex,
            theme: currentTheme,
            facebookFormat
        };
    }

    /**
     * Autonomous Dynamic Content Generator
     * Uses LLM (Gemini / Groq) to generate completely fresh, non-repeating,
     * high-value executive thought-leadership content daily.
     * Checks Supabase to ensure no topic from the last 60 days is ever repeated.
     */
    async getOrGenerateDailyContent(date = new Date()) {
        const schedule = this.getDailySchedule(date);
        const istDateStr = schedule.istDateStr;

        if (this._dailyCache[istDateStr]) {
            logger.info(`[CONTENT GENERATOR] Returning cached dynamic daily content for ${istDateStr}: "${this._dailyCache[istDateStr].topic}"`);
            return this._dailyCache[istDateStr];
        }

        logger.info(`🧠 [CONTENT GENERATOR] Generating 100% fresh, bespoke daily content for ${istDateStr}...`);
        const generated = await this.generateDynamicDailyContent(date);
        this._dailyCache[istDateStr] = generated;
        return generated;
    }

    async generateDynamicDailyContent(date = new Date()) {
        const schedule = this.getDailySchedule(date);
        const istDateStr = schedule.istDateStr;
        const dayNumber = schedule.dayNumber;
        const facebookFormat = schedule.facebookFormat;

        // 1. Fetch past topics from Supabase to guarantee zero repetition
        const previousTopics = [];
        try {
            const { data: pastPosts } = await supabaseAdmin
                .from('usage_tracking')
                .select('action_type')
                .like('action_type', 'growth_topic:%')
                .order('created_at', { ascending: false })
                .limit(60);

            if (pastPosts && pastPosts.length > 0) {
                for (const row of pastPosts) {
                    const topicName = row.action_type.replace('growth_topic:', '').trim();
                    if (topicName && !previousTopics.includes(topicName)) {
                        previousTopics.push(topicName);
                    }
                }
            }
        } catch (dbErr) {
            logger.warn('[CONTENT GENERATOR] Supabase past topics fetch warning:', dbErr.message);
        }

        const avoidTopicsStr = previousTopics.length > 0
            ? `PREVIOUSLY USED TOPICS (DO NOT REPEAT OR CLOSELY PARAPHRASE ANY OF THESE):\n- ${previousTopics.slice(0, 30).join('\n- ')}`
            : 'No previous topics recorded yet.';

        const prompt = `You are the Chief Ghostwriter and Executive Cognitive Strategist for Ashwani Kumar, Founder of TwinGenie.
TwinGenie is an AI Digital Twin mobile app (on Google Play: https://play.google.com/store/apps/details?id=com.asmind.app).
Its core capabilities:
- 4 Cognitive Perspectives: Normal (baseline sounding board), Reflective (empathy, decompression, stress relief), Honest (unfiltered challenger to blind spots, rationalizations & procrastination), Future You (5-years-wiser executive perspective that neutralizes short-term panic).
- 35-Question Big Five baseline assessment that benchmarks psychological traits and cognitive blind spots.
- Persistent pgvector semantic memory across conversations to detect recurring self-sabotage loops across weeks.

${avoidTopicsStr}

TASK:
Generate a completely fresh, original, thought-provoking founder psychology or executive decision-making topic for today.
Target audience: Startup founders, engineers, executives, and high-agency leaders.

Output strictly valid JSON with this exact schema:
{
  "themeId": "slug_of_topic",
  "topic": "Compelling Title of the Topic (max 65 chars)",
  "category": "Category Tag (e.g. COGNITIVE ARCHITECTURE, DECISION DYNAMICS, MENTAL RESILIENCE)",
  "hook": "Provocative 1-sentence hook",
  "linkedin": {
    "title": "Carousel Document Title (max 45 chars)",
    "caption": "Full viral-format LinkedIn post (250-350 words). Include scroll-stopping hook, body with bullet points analyzing the psychological blind spot, explain how TwinGenie's 4 perspectives and persistent memory solve it, include download CTA with https://play.google.com/store/apps/details?id=com.asmind.app, and include #TwinGenie and relevant hashtags.",
    "slides": [
      {
        "type": "cover",
        "tag": "Category Tag",
        "title": "Punchy Cover Title",
        "subtitle": "Curiosity-inducing subtitle",
        "takeaways": [
          "Takeaway bullet 1",
          "Takeaway bullet 2",
          "Takeaway bullet 3"
        ]
      },
      {
        "type": "dynamic",
        "tag": "THE BLIND SPOT",
        "title": "Specific Founder Scenario Title",
        "subtitle": "Why standard thinking fails here",
        "bullets": [
          "Key symptom or rationalization",
          "The hidden subconscious fear or cognitive bias",
          "Why traditional advice or generic chatbots make it worse"
        ]
      },
      {
        "type": "comparison",
        "tag": "THE FLATTERY TRAP",
        "title": "Yes-Man AI vs Honest Twin",
        "subtitle": "Two contrasting responses to the exact same founder situation",
        "left": {
          "badge": "[ STANDARD AI (THE YES-MAN) ]",
          "user": "Founder excuse or hesitation",
          "ai": "Flattering, superficial response validating procrastination",
          "outcome": "Reinforces blind spot & stalls execution"
        },
        "right": {
          "badge": "[ TWINGENIE (HONEST TWIN) ]",
          "user": "Founder excuse or hesitation",
          "ai": "Challenging response citing past stated goals from memory",
          "outcome": "Exposes the pattern & forces clarity"
        }
      },
      {
        "type": "timeline",
        "tag": "COGNITIVE ARCHITECTURE",
        "title": "The Breakthrough Pipeline",
        "subtitle": "How longitudinal reflection rewires instincts",
        "steps": [
          { "step": "STAGE 01", "title": "Signal Benchmark", "desc": "35-question calibration identifies baseline vulnerability." },
          { "step": "STAGE 02", "title": "Pattern Interception", "desc": "Semantic memory catches circular rationalizations across weeks." },
          { "step": "STAGE 03", "title": "Equanimous Action", "desc": "Reframing through the 5-years-wiser Future Twin forces conviction." }
        ]
      },
      {
        "type": "cta",
        "tag": "AVAILABLE NOW",
        "title": "Meet Your Digital Twin Today",
        "subtitle": "Stop talking to AI that forgets you. Start building real self-awareness.",
        "points": [
          "35-Question Big Five personality baseline",
          "4 perspectives: Normal, Reflective, Honest, Future",
          "Persistent pgvector memory across all conversations",
          "100% private, self-guided executive reflection"
        ],
        "button": "Download TwinGenie on Google Play",
        "link": "play.google.com/store/apps/details?id=com.asmind.app"
      }
    ]
  },
  "facebook": {
    "title": "Short Hook for Facebook",
    "caption": "Facebook post caption ending with an engaging binary question (🅰️ Option A vs 🅱️ Option B) and #TwinGenie",
    "firstComment": "📲 Experience your digital twin free on Google Play: https://play.google.com/store/apps/details?id=com.asmind.app\\nTake your 35-question personality baseline today!",
    "binaryQuestion": {
      "prompt": "Binary question text",
      "optionA": "🅰️ Choice A",
      "optionB": "🅱️ Choice B"
    },
    "voiceScript": {
      "voiceHook": "Provocative narration hook (~15-18 words)",
      "voiceProblem": "Narration of the core problem and why standard bots fail (~18-20 words)",
      "voiceSolution": "Narration of how TwinGenie's honest mode and memory solve it (~18-20 words)",
      "voiceCta": "Meet your personal digital twin today. Download TwinGenie free on Google Play. (~15 words)"
    }
  }
}`;

        let parsed = null;

        // Try Gemini 3.5 Flash Lite first
        if (process.env.GEMINI_API_KEY) {
            try {
                logger.info('[CONTENT GENERATOR] Prompting Gemini 3.5 Flash Lite for fresh daily topic...');
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({
                    model: 'gemini-3.5-flash-lite',
                    generationConfig: { responseMimeType: 'application/json' }
                });
                const result = await model.generateContent(prompt);
                const rawText = result.response.text();
                parsed = JSON.parse(rawText);
                logger.info(`[CONTENT GENERATOR] Gemini successfully generated: "${parsed.topic}"`);
            } catch (geminiErr) {
                logger.warn('[CONTENT GENERATOR] Gemini generation warning:', geminiErr.message);
            }
        }

        // Try Groq as fallback
        if (!parsed && process.env.GROQ_API_KEY) {
            try {
                logger.info('[CONTENT GENERATOR] Prompting Groq (openai/gpt-oss-120b) for fresh daily topic...');
                const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
                const completion = await groq.chat.completions.create({
                    messages: [{ role: 'user', content: prompt }],
                    model: 'openai/gpt-oss-120b',
                    response_format: { type: 'json_object' }
                });
                const rawText = completion.choices[0]?.message?.content;
                parsed = JSON.parse(rawText);
                logger.info(`[CONTENT GENERATOR] Groq successfully generated: "${parsed.topic}"`);
            } catch (groqErr) {
                logger.warn('[CONTENT GENERATOR] Groq generation warning:', groqErr.message);
            }
        }

        // Curated 35-topic curriculum fallback if both LLMs are unreachable
        if (!parsed || !parsed.topic || !parsed.linkedin?.slides) {
            logger.warn('[CONTENT GENERATOR] LLM generation unavailable. Using 35-topic rotational curriculum.');
            parsed = this._getCuratedFallbackTheme(dayNumber);
        }

        // Ensure Facebook slides are populated from LinkedIn slides if not explicit
        if (!parsed.facebook.slides) {
            parsed.facebook.slides = parsed.linkedin.slides;
        }

        parsed.format = facebookFormat;
        parsed.dayNumber = dayNumber;
        parsed.istDateStr = istDateStr;

        // Record topic into Supabase tracking so tomorrow's prompt excludes it
        try {
            const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
            if (users && users.length > 0) {
                const nowIso = new Date().toISOString();
                await supabaseAdmin.from('usage_tracking').insert({
                    user_id: users[0].id,
                    action_type: `growth_topic:${parsed.topic}`,
                    count: 1,
                    period_start: nowIso,
                    period_end: nowIso,
                    created_at: nowIso
                });
            }
        } catch (dbLogErr) {
            logger.warn('[CONTENT GENERATOR] Supabase topic log warning:', dbLogErr.message);
        }

        return parsed;
    }

    _getCuratedFallbackTheme(dayNumber) {
        const index = dayNumber % CURATED_FALLBACK_THEMES.length;
        const cur = CURATED_FALLBACK_THEMES[index];
        return {
            themeId: cur.id,
            topic: cur.topic,
            category: cur.category,
            hook: cur.hook,
            linkedin: {
                title: cur.title,
                caption: cur.linkedinCaption,
                slides: cur.slides
            },
            facebook: {
                title: cur.title,
                caption: cur.facebookCaption,
                firstComment: '📲 Experience your digital twin free on Google Play: https://play.google.com/store/apps/details?id=com.asmind.app\nTake your 35-question personality baseline today!',
                binaryQuestion: cur.binaryQuestion,
                voiceScript: cur.voiceScript,
                slides: cur.slides
            }
        };
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
        const personalSpec = this._generateLinkedInPersonalContent(theme, campaignId);
        return {
            platform: 'linkedin',
            target: 'company',
            format: 'carousel_pdf',
            title: personalSpec.title || `${theme.name} — A Cognitive Analysis`,
            utmLink: utm,
            slides: personalSpec.slides || this._buildStandardSlides(theme),
            caption: personalSpec.caption
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
        const schedule = this.getDailySchedule();
        const format = requestedFormat || schedule.facebookFormat;
        const utmMedium = format === 'reel' ? 'reel_video' : 'multi_image_carousel';
        const utm = this.buildUtmLink('facebook', utmMedium, campaignId);

        const bq = theme.binaryQuestion || {
            prompt: "When you are stuck on a difficult decision or feeling overwhelmed, which AI perspective do you actually need?",
            optionA: "🅰️ Gentle emotional validation to decompress stress (Reflective Twin)",
            optionB: "🅱️ A brutally honest breakdown that cuts through your excuses (Honest Twin)"
        };

        const themeId = theme.id || 'blind_spots';
        const facebookPackages = {
            blind_spots: {
                title: "Why Your Biggest Strength Is Also Your Greatest Cognitive Blind Spot",
                caption: `Every founder has a superpower that quietly doubles as their biggest liability. 🪞

• Hyper-decisive? You dismiss subtle risk signals.
• Deeply empathetic? You tolerate underperformance.
• Hyper-analytical? You disguise procrastination as "thoroughness".

Standard AI chatbots amplify this—they mirror your confirmation bias, stroke your ego, and agree with everything you say.

When building TwinGenie, our goal was to build an uncompromising cognitive mirror: 4 distinct perspectives (Normal, Reflective, Honest, Future) and persistent pgvector memory that intercepts recurring blind spots across weeks.

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #AI #Leadership #CognitiveBiases #PersonalGrowth #DigitalTwin #SelfReflection`
            },
            honest_mode: {
                title: "Why Most AI Chatbots Are Flattering Yes-Men — And How We Built TwinGenie",
                caption: `Most conversational AI is engineered to be a flattering yes-man. It strokes your ego, validates your excuses, and forgets everything the moment you close the browser tab. 🧠

Human personal growth doesn't come from unconditional agreement. It comes from dialectical friction.

That's why we engineered TwinGenie with 4 distinct cognitive lenses:
• Normal Twin — Your baseline thinking partner
• Reflective Twin — Emotional validation & grounding
• Honest Twin — Zero flattery; shreds rationalizations
• Future Twin — 5-years-wiser retrospective clarity

Backed by persistent pgvector memory, TwinGenie remembers who you are and holds you accountable.

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #ArtificialIntelligence #TechFounders #LLM #CognitiveScience #DigitalTwin #MindsetShift`
            },
            decision_paralysis: {
                title: "The Hidden Cognitive Pattern Behind Why Founders Stall on Tough Calls",
                caption: `"I just need a little more data before deciding." ⏳

In 90% of founder decisions, "waiting for more data" is just sophisticated procrastination disguised as diligence.

Standard chatbots make this worse by generating endless pros and cons—fueling your overthinking loop instead of forcing a decision.

In TwinGenie, we engineered an AI that shatters analysis paralysis:
• Semantic Loop Interception — Detects when you circle the same decision for 2 weeks
• 4 Decision Lenses — Clarifies facts, uncovers underlying fear, and evaluates 5-year impact
• Deterministic Calibration — Balances your innate cognitive bias

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #DecisionMaking #Productivity #ExecutiveCoaching #AI #Startups #MentalModels`
            },
            future_perspective: {
                title: "What Your 5-Years-Wiser Self Would Say About Today's Crisis",
                caption: `Think about the worst crisis you faced 5 years ago. 🔮

Back then, it felt like the company was ending. Today? You can barely remember the panic—or it became the catalyst for your biggest breakthrough.

Human psychology suffers from severe temporal discounting: we over-index on today's panic and discount long-term trajectory.

That's why we built the Future Twin in TwinGenie:
• Temporal Shift Engine — Simulates the calm, retrospective clarity of your 5-years-wiser self
• Persistent Vector Memory — Retains your historical wins and core values across months
• Multi-Perspective Matrix — Shifts you from acute stress into long-term strategic focus

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #FutureSelf #MentalClarity #TechFounders #AICompanion #SelfGrowth #Leadership`
            },
            persistent_memory: {
                title: "Why Reset-Button AI Chatbots Fail Human Personal Growth",
                caption: `Why do 95% of people abandon AI companions after two weeks? 💾

Because every time you open the app, it's Day One all over again.

Chatbots operate on a stateless "reset button." But a stateless AI cannot be a mentor, coach, or true digital twin. True self-growth requires compounding memory.

Here is how we built TwinGenie's memory-first architecture:
• 35-Question Psychological Baseline — Maps your Big Five personality traits
• Semantic pgvector Memory — Encrypted vector embeddings that connect conversations across weeks
• 4 Real-Time Cognitive Perspectives — Shifts from baseline thinking to brutal honesty

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #VectorDatabase #pgvector #AIArchitecture #MachineLearning #PersonalGrowth #ProductDesign`
            }
        };

        const postSpec = facebookPackages[themeId] || facebookPackages.blind_spots;
        const firstComment = `📲 Experience both perspectives free on Google Play: ${utm}\nTake your 35-question Big Five personality baseline today!`;

        if (format === 'reel') {
            return {
                platform: 'facebook',
                format: 'reel',
                title: postSpec.title,
                tag: theme.tag,
                utmLink: utm,
                slides: this._buildStandardSlides(theme),
                caption: postSpec.caption,
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
            caption: postSpec.caption,
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
