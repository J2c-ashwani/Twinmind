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
    },
    {
        id: 'lifecoach_programs',
        name: 'Guided Life Coach Programs',
        hook: 'Why generic advice fails but 7-day structured coaching works',
        tag: 'LIFE COACH',
        binaryQuestion: {
            prompt: "When you are dealing with burnout or morning anxiety, what actually works for you?",
            optionA: "🅰️ Reading motivational quotes and generic 10-point lists (ChatGPT style)",
            optionB: "🅱️ A structured 7-day program with one 2-minute micro-exercise per day (TwinGenie Life Coach)"
        }
    },
    {
        id: 'chatgpt_vs_twingenie',
        name: 'ChatGPT vs TwinGenie Head-to-Head',
        hook: 'What happens when you give the exact same dilemma to ChatGPT and TwinGenie',
        tag: 'HEAD-TO-HEAD BATTLE',
        competitorName: 'ChatGPT',
        competitorBadge: 'CHATGPT (OPENAI)',
        competitorTag: 'THE YES-MAN',
        competitorPill: 'CHATGPT • GENERIC TEXTBOOK ADVICE • ZERO MEMORY',
        competitorHeader: 'WHAT CHATGPT SAYS (THE FLATTERY TRAP)',
        binaryQuestion: {
            prompt: "Which AI response would actually change your life?",
            optionA: "🅰️ ChatGPT: 'Everything happens for a reason! Just believe in yourself!'",
            optionB: "🅱️ TwinGenie: 'Motivational quotes don\'t heal anxiety; daily structured action does.'"
        }
    },
    {
        id: 'replika_vs_twingenie',
        name: 'Replika vs TwinGenie: The Flattery Trap',
        hook: 'Why artificial flattery keeps you stuck, but an honest mirror sets you free',
        tag: 'USA COMPANION BATTLE',
        competitorName: 'Replika',
        competitorBadge: 'REPLIKA (SYCOPHANT AI)',
        competitorTag: 'ARTIFICIAL FLATTERY',
        competitorPill: 'REPLIKA • DELUSIONAL COMFORT • ZERO ACCOUNTABILITY',
        competitorHeader: 'WHAT REPLIKA SAYS (THE FLATTERY TRAP)',
        userExcuse: "I procrastinated all day and didn't apply to those jobs. I feel terrible.",
        botReply: "Oh no sweetie! Don't be hard on yourself! You're doing amazing, take a bubble bath and rest! 💖",
        twinReply: "You've said that every Sunday for four weeks straight. It's not exhaustion; it's fear of rejection. Apply to the first one right now.",
        shift: "Replaces artificial emotional dependency with honest self-accountability.",
        binaryQuestion: {
            prompt: "When you share a real dilemma or delay, which AI companion actually helps you?",
            optionA: "🅰️ Replika: 'You're doing amazing sweetie! Take a bubble bath and don't worry! 💖'",
            optionB: "🅱️ TwinGenie: 'You said this 3 Sundays in a row. It's fear of failure. Let's do step 1 now.'"
        }
    },
    {
        id: 'characterai_vs_twingenie',
        name: 'Character.ai vs TwinGenie: Escapism vs Evolution',
        hook: 'Stop roleplaying with fake anime characters. Start building your actual life.',
        tag: 'USA ESCAPISM VS REALITY',
        competitorName: 'Character.ai',
        competitorBadge: 'CHARACTER.AI (FANTASY BOT)',
        competitorTag: 'ESCAPISM LOOP',
        competitorPill: 'CHARACTER.AI • FICTIONAL ROLEPLAY • RESETS CONTEXT',
        competitorHeader: 'WHAT CHARACTER.AI SAYS (THE FANTASY TRAP)',
        userExcuse: "I'm terrified about my presentation tomorrow, so I'm talking to a fictional mentor.",
        botReply: "*Mentor nods solemnly* In ancient Sparta, warriors faced their fears with iron wills.",
        twinReply: "Sparta won't help you with Slide 4. Let's do a 2-minute rehearsal of your opening pitch right now.",
        shift: "Replaces fictional fantasy roleplay with actionable real-world clarity.",
        binaryQuestion: {
            prompt: "Are you using AI to escape your life, or to actually build it?",
            optionA: "🅰️ Character.ai: Roleplaying with fictional characters who reset every chat",
            optionB: "🅱️ TwinGenie: Consulting your 5-years-wiser Future Self who remembers your real goals"
        }
    },
    {
        id: 'woebot_vs_twingenie',
        name: 'Clinical Bots vs TwinGenie: The Form vs The Memory',
        hook: 'Why clinical mental health apps feel like filling out insurance paperwork.',
        tag: 'USA MENTAL HEALTH CLARITY',
        competitorName: 'Woebot',
        competitorBadge: 'CLINICAL CBT BOT',
        competitorTag: 'STERILE CHECKLIST',
        competitorPill: 'CLINICAL BOT • WORKSHEET #4 • NO LONG-TERM CONTEXT',
        competitorHeader: 'WHAT CLINICAL BOTS SAY (THE STERILE FORM)',
        userExcuse: "I'm having morning anxiety and dread starting my work day.",
        botReply: "On a scale of 1 to 10, rate your sadness. Let's do worksheet exercise #4 to challenge cognitive distortions.",
        twinReply: "I noticed every time you talk about this client, your anxiety spikes. Let's look at the boundary you haven't set yet.",
        shift: "Replaces sterile clinical questionnaires with compassionate living memory.",
        binaryQuestion: {
            prompt: "When morning anxiety spikes, what actually helps you?",
            optionA: "🅰️ Rating your distress 1-10 on a sterile CBT checklist",
            optionB: "🅱️ Talking to an AI twin that remembers your exact triggers and past wins"
        }
    }
];

export const CURATED_FALLBACK_THEMES = [
    {
        id: 'sunk_cost_fallacy',
        topic: 'The Sunk Cost Fallacy: Why We Cling to What Drains Us',
        category: 'SELF-AWARENESS',
        hook: 'The hardest sentence for any human being to utter is: "I was wrong, and I need to let this go."',
        title: 'The Sunk Cost Trap in Life & Decisions',
        linkedinCaption: `The hardest sentence for any human being to utter is: "I was wrong, and I need to let this go."

When you've poured months of energy, emotion, or personal pride into a path, project, or habit, your brain refuses to cut losses.

Instead, you rationalize:
• "I just need to give it a little more time."
• "If I stop now, all the effort was wasted."
• "Maybe tomorrow things will magically shift."

In cognitive psychology, this is the Sunk Cost Trap—and standard AI chatbots make it worse. When you ask them for advice, they enthusiastically generate 10 reasons why you should keep enduring. They validate your comfort zone instead of helping you see clearly.

At TwinGenie, we engineered an AI Digital Twin that functions as an honest, private cognitive mirror for your life:
1. Normal Twin — your daily reflective sounding board
2. Reflective Twin — compassionate decompression when you feel overwhelmed
3. Honest Twin — unfiltered clarity that challenges your rationalizations using your own words
4. Future Twin — the 5-years-wiser perspective asking: "Will this dilemma matter in 2031?"

👉 Meet your personal digital twin on Google Play: https://play.google.com/store/apps/details?id=com.asmind.app

#TwinGenie #SelfAwareness #DecisionMaking #PersonalGrowth #MentalClarity`,
        facebookCaption: `The hardest sentence for anyone to utter is: "I was wrong, and I need to let this go." 🛑

When you've poured months into a path or habit that isn't serving you, standard chatbots act like flattering cheerleaders—encouraging you to stay stuck in a loop.

TwinGenie is engineered differently: with persistent memory and Honest Mode, it gently reflects your own stated values back to you so you can make decisions with clarity.

Quick question for you:
When you realize a habit, project, or commitment is draining you, what is your instinct?

🅰️ Step away immediately without guilt
OR
🅱️ Keep trying because you've already invested so much?

Drop A or B below! 👇

#TwinGenie #PersonalGrowth #LifeDecisions #SelfCare`,
        binaryQuestion: {
            prompt: "When you realize a habit, project, or commitment is draining you, what is your instinct?",
            optionA: "🅰️ Step away immediately without guilt",
            optionB: "🅱️ Keep trying because you've already invested so much?"
        },
        voiceScript: {
            voiceHook: "Why do we keep clinging to things that drain us instead of letting go?",
            voiceProblem: "When you invest months into something unfulfilling, standard chatbots flatter your excuses and keep you stuck.",
            voiceSolution: "TwinGenie uses persistent memory and honest reflection to help you see through self-deception.",
            voiceCta: "Meet your personal digital twin today. Download TwinGenie free on Google Play."
        },
        slides: [
            {
                type: 'cover',
                tag: 'SELF-AWARENESS',
                title: 'The Sunk Cost Trap',
                subtitle: 'Why letting go feels harder than holding on',
                takeaways: [
                    'How pride disguises self-sabotage as perseverance',
                    'Why agreeable chatbots fuel toxic confirmation bias',
                    'How honest self-reflection gives you permission to reset'
                ]
            },
            {
                type: 'dynamic',
                tag: 'THE COGNITIVE TRAP',
                title: 'The Commitment Loop',
                subtitle: 'Why walking away feels like admitting defeat',
                bullets: [
                    'Identity entanglement: Confusing what you do with who you are',
                    'Justification creep: Making excuses to avoid the pain of change',
                    'Echo chamber trap: Asking agreeable yes-man AI for validation'
                ]
            },
            {
                type: 'comparison',
                tag: 'THE FLATTERY TRAP',
                title: 'Yes-Man AI vs Honest Twin',
                subtitle: 'Two contrasting responses to the exact same hesitation',
                left: {
                    badge: '[ STANDARD AI (THE YES-MAN) ]',
                    user: "I feel completely exhausted by this path, but I've already put so much time into it. Should I keep going?",
                    ai: "Absolutely! Consistency is key! Keep pushing and you will reach your breakthrough!",
                    outcome: "Enables months of continued burnout and denial"
                },
                right: {
                    badge: '[ TWINGENIE (HONEST TWIN) ]',
                    user: "I feel completely exhausted by this path, but I've already put so much time into it. Should I keep going?",
                    ai: "You're not persisting because you believe in it; you're persisting because quitting feels like admitting the last six months were wasted. What are you actually holding onto?",
                    outcome: "Cuts through the guilt and restores clarity"
                }
            },
            {
                type: 'timeline',
                tag: 'COGNITIVE ARCHITECTURE',
                title: 'The Reset Pipeline',
                subtitle: 'How TwinGenie helps you find honest clarity',
                steps: [
                    { step: 'STAGE 01', title: 'Self Benchmark', desc: '35-question baseline identifies your emotional style and triggers.' },
                    { step: 'STAGE 02', title: 'Pattern Reflection', desc: 'Persistent memory catches repeating cycles of overthinking.' },
                    { step: 'STAGE 03', title: 'Future Perspective', desc: 'The 5-years-wiser Future Twin brings perspective to today’s stress.' }
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
                    '100% private, self-guided personal reflection'
                ],
                button: 'Download TwinGenie on Google Play',
                link: 'play.google.com/store/apps/details?id=com.asmind.app'
            }
        ]
    },
    {
        id: 'false_urgency',
        topic: 'The Avoidance Trap: Why Frantic Busyness Disguises Fear',
        category: 'HABITS & CLARITY',
        hook: 'Running around putting out self-created fires feels like hard work. Most of the time, it is just disguised fear.',
        title: 'Motion vs Progress',
        linkedinCaption: `Running around doing busywork feels productive. 

Most of the time, it's just sophisticated avoidance.

When we are afraid of a hard choice—whether it's having an honest conversation, making a career shift, or facing a creative challenge—we manufacture micro-crises to distract ourselves:
• Cleaning the entire room or reorganizing apps
• Rearranging to-do lists for the fourth time
• Answering trivial messages instantly while ignoring our real priorities

This creates a dopamine loop of "busyness" without an inch of meaningful life progress.

Standard chatbots only amplify this: they happily generate 10 more checklists and schedule reminders, never asking: "What are you actually avoiding right now?"

At TwinGenie, we engineered a personal AI Digital Twin with long-term memory:
• Normal Twin: your grounded daily sounding board
• Reflective Twin: uncovers the underlying anxiety driving the rush
• Honest Twin: gently challenges avoidance using your own stated goals
• Future Twin: brings the 5-years-wiser perspective to focus only on what matters

👉 Download TwinGenie on Google Play: https://play.google.com/store/apps/details?id=com.asmind.app

#TwinGenie #SelfUnderstanding #Productivity #MentalHealth #Focus`,
        facebookCaption: `Putting out small fires feels like hard work. Most of the time, it's just avoiding the one conversation or task that actually matters. 🚨

When we dread something uncomfortable, we reorganize files and scroll—mistaking motion for progress.

TwinGenie's Honest Mode flags this gently by reflecting your true priorities back to you.

Quick question for you:
When your day feels overwhelming, is it usually:

🅰️ Too many genuinely urgent things happening
OR
🅱️ Feeling stuck and avoiding the hardest task?

Drop A or B below! 👇

#TwinGenie #Mindset #SelfGrowth #Clarity`,
        binaryQuestion: {
            prompt: "When your day feels overwhelming, is it usually:",
            optionA: "🅰️ Too many genuinely urgent things happening",
            optionB: "🅱️ Feeling stuck and avoiding the hardest task?"
        },
        voiceScript: {
            voiceHook: "Why do we mistake frantic busyness for actual peace and progress?",
            voiceProblem: "When you dread an uncomfortable task, standard chatbots help you organize trivial details instead of facing it.",
            voiceSolution: "TwinGenie uses thoughtful memory to detect avoidance loops and refocus you on what truly matters.",
            voiceCta: "Meet your personal digital twin today. Download TwinGenie free on Google Play."
        },
        slides: [
            {
                type: 'cover',
                tag: 'HABITS & CLARITY',
                title: 'The Avoidance Trap',
                subtitle: 'Why frantic busyness is often disguised anxiety',
                takeaways: [
                    'How fake emergencies protect your comfort zone',
                    'Why agreeable chatbots amplify low-value busywork',
                    'How honest self-reflection restores real peace'
                ]
            },
            {
                type: 'dynamic',
                tag: 'THE AVOIDANCE LOOP',
                title: 'Motion vs Progress',
                subtitle: 'The 3 signs you are running from the real work',
                bullets: [
                    'Tinkering with minor details while delaying the important step',
                    'Treating every small notification as an emergency',
                    'Ending the day exhausted but feeling like nothing real got done'
                ]
            },
            {
                type: 'comparison',
                tag: 'THE FLATTERY TRAP',
                title: 'Yes-Man AI vs Honest Twin',
                subtitle: 'Contrasting responses to task avoidance',
                left: {
                    badge: '[ STANDARD AI (THE YES-MAN) ]',
                    user: "I spent three hours organizing my desk and tweaking my notes instead of studying. Feeling productive though!",
                    ai: "A tidy workspace leads to a tidy mind! You are setting yourself up for great success!",
                    outcome: "Validates procrastination and wastes another day"
                },
                right: {
                    badge: '[ TWINGENIE (HONEST TWIN) ]',
                    user: "I spent three hours organizing my desk and tweaking my notes instead of studying. Feeling productive though!",
                    ai: "You didn't organize for three hours because your desk needed it. You did it to avoid the anxiety of starting. What part of the work feels intimidating?",
                    outcome: "Cuts through the defense and sparks honest action"
                }
            },
            {
                type: 'timeline',
                tag: 'MINDFUL ARCHITECTURE',
                title: 'Restoring True Focus',
                subtitle: 'The 3-stage clarity reset',
                steps: [
                    { step: 'STAGE 01', title: 'Honest Baseline', desc: 'Identify your natural tendencies and procrastination triggers.' },
                    { step: 'STAGE 02', title: 'Avoidance Detection', desc: 'Notice when busywork is masking underlying apprehension.' },
                    { step: 'STAGE 03', title: 'Future Alignment', desc: 'Future Twin reframes short-term discomfort as long-term growth.' }
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
                    '100% private, self-guided personal reflection'
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
        const target = new Date(`${istDateStr}T12:00:00+05:30`);
        const dayNumber = Math.max(0, Math.round((target - epoch) / (1000 * 60 * 60 * 24)));

        const themes = this.themes;
        const themeIndex = dayNumber % themes.length;
        const currentTheme = themes[themeIndex];

        // Facebook & Instagram are locked to 100% REELS for maximum viral reach & downloads.
        // LinkedIn retains high-authority PDF Carousels.
        const metaSharedFormat = 'reel';

        // 5 Cognitive Perspectives & Growth Programs
        const MODES = [
            { id: 'dark', name: 'Honest / Dark Twin', tag: 'ROAST & REALITY CHECK', defaultDilemma: "I've been scrolling for 3 hours and feel completely guilty. Should I just give up on today?", defaultBot: "Rest is so productive! Don't push yourself today—you deserve a break!", defaultReply: "Guilt is just another excuse to avoid the real work. What is the one task you're terrified of facing?" },
            { id: 'lifecoach', name: 'Life Coach (7-Day Reset)', tag: 'STRUCTURED 7-DAY ACTION', defaultDilemma: "I have so much career anxiety that I am completely frozen and dread starting each morning.", defaultBot: "Everything happens for a reason! Just believe in yourself and make a 10-step plan to stay positive!", defaultReply: "Motivational quotes don't heal anxiety; daily structured action does. Enrolled in Day 1 of the 7-Day Anxiety Reset. Your only task today is a 2-minute trigger audit. Ready?" },
            { id: 'future', name: 'Future Self Twin', tag: '5-YEARS-WISER PERSPECTIVE', defaultDilemma: "Left on read for 6 hours. I'm spiraling and about to send a passive-aggressive text.", defaultBot: "That's so disrespectful of them! Send a firm message letting them know your worth!", defaultReply: "In 5 years, this silence won't even matter. What would it feel like to let the silence exist without trying to control their response?" },
            { id: 'reflective', name: 'Reflective Twin', tag: 'EMOTIONAL DECOMPRESSION', defaultDilemma: "I agreed to help someone move this weekend even though I'm completely exhausted and need rest. Why do I do this?", defaultBot: "You're such a kind, generous friend! Just make sure to get some rest when you can!", defaultReply: "You didn't volunteer because you have energy; you volunteered because saying no makes you feel like a burden. Where did you learn that your rest has to be earned?" },
            { id: 'normal', name: 'Normal Twin', tag: 'GROUNDED ALTER-EGO', defaultDilemma: "I think I should put my main project on hold and start a brand-new idea today.", defaultBot: "That sounds so exciting! Follow your passion! Here are 5 brainstorming ideas!", defaultReply: "Memory check: You said this exact same thing 14 days ago before launch. You aren't inspired—you're avoiding market feedback. Close the new tabs and finish what you started." }
        ];

        // IST Day of Week: 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
        const istDayOfWeek = target.getDay();

        // 7-DAY MASTER REEL FORMAT & COGNITIVE MODE CALENDAR:
        // Mon (1): 'split'          - ChatGPT vs TwinGenie (Generic AI vs Cognitive Mirror)
        // Tue (2): 'split'          - USA Companion Battle: Replika vs TwinGenie (Flattery Trap vs Honest Mirror)
        // Wed (3): 'archetype'      - Life Coach (35-Marker Archetype Audit & Web Quiz Funnel)
        // Thu (4): 'council'        - USA Escapism Battle: Character.ai vs TwinGenie (Fictional Roleplay vs Future Self)
        // Fri (5): 'genz'           - Honest Twin (Gen Z Reality Check: Rot-Scrolling / Delulu vs No Cap)
        // Sat (6): 'year_in_pixels' - Life Coach (365-Day Mood Matrix & habit transformation)
        // Sun (0): 'split'          - Future Self Twin (5-Years-Wiser Perspective for Sunday recalibration)
        const REEL_WEEKLY_CALENDAR = {
            1: { formatType: 'split', modeId: 'dark', themeId: 'chatgpt_vs_twingenie', title: 'Head-to-Head Roast: ChatGPT vs TwinGenie' },
            2: { formatType: 'split', modeId: 'dark', themeId: 'replika_vs_twingenie', title: 'USA Companion Battle: Replika vs TwinGenie (Flattery vs Truth)' },
            3: { formatType: 'archetype', modeId: 'lifecoach', title: '35-Marker Archetype Audit: Shadow Analysis' },
            4: { formatType: 'council', modeId: 'dark', themeId: 'characterai_vs_twingenie', title: 'USA Escapism Battle: Character.ai vs TwinGenie' },
            5: { formatType: 'genz', modeId: 'dark', title: 'Gen Z Reality Check: Rot-Scrolling & Delulu Callout (No Cap)' },
            6: { formatType: 'year_in_pixels', modeId: 'lifecoach', title: 'Year-in-Pixels Heatmap: Pattern Discovery' },
            0: { formatType: 'split', modeId: 'future', title: 'Future Self Recalibration: 2031 Perspective' }
        };

        const todayPlan = REEL_WEEKLY_CALENDAR[istDayOfWeek] || REEL_WEEKLY_CALENDAR[1];
        const activeMode = MODES.find(m => m.id === todayPlan.modeId) || MODES[0];
        const formatType = todayPlan.formatType;
        const assignedTheme = (todayPlan.themeId ? themes.find(t => t.id === todayPlan.themeId) : null) || currentTheme;

        return {
            istDateStr,
            dayNumber,
            istDayOfWeek,
            themeIndex,
            theme: assignedTheme,
            activeMode,
            mode: activeMode.id,
            modeName: activeMode.name,
            formatType,
            calendarTitle: todayPlan.title,
            facebookFormat: metaSharedFormat,
            instagramFormat: metaSharedFormat,
            sharedFormat: metaSharedFormat
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
        const sharedFormat = schedule.sharedFormat;

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

        const prompt = `You are the Chief Storyteller and Cognitive Psychologist writing for Ashwani Kumar, Creator of TwinGenie.
TwinGenie is an AI Digital Twin mobile app (on Google Play: https://play.google.com/store/apps/details?id=com.asmind.app) built for EVERY HUMAN BEING—students, professionals, creators, parents, and everyday individuals navigating growth, overthinking, emotions, and habits. TwinGenie is NOT a B2B corporate tool or just for startup founders; it is a personal cognitive mirror and private life companion for anyone who wants real self-understanding.
Its core verified capabilities:
- 4 Cognitive Perspectives: Normal (grounded daily alter-ego), Reflective (empathy, decompression, emotional regulation), Honest (unfiltered reality check cutting through excuses), Future You (5-years-wiser 2031 perspective).
- Guided 7-Day Life Coach Programs: Structured daily micro-exercises (7-Day Anxiety Reset, 5-Day Confidence Boost).
- 35-Question Big Five Assessment (twingenie.app/test): Benchmarks personal cognitive archetypes and blind spots.
- Year-in-Pixels 365-Day Mood Matrix: Discovers subconscious emotional rhythms and recurring trigger patterns.
- Persistent pgvector Semantic Memory: Retrieves past logs and receipts across conversations (ChatGPT resets every chat).

TODAY'S MASTER OMNICHANNEL CALENDAR:
- Daily Format: ${schedule.formatType.toUpperCase()} (${schedule.calendarTitle})
- Hero Mode: ${schedule.modeName} (${schedule.activeMode.tag})

${avoidTopicsStr}

TASK:
Generate a completely fresh, original, thought-provoking human psychology, personal clarity, or self-awareness topic for today. Align the theme with today's master format (${schedule.formatType.toUpperCase()}) and mode (${schedule.modeName}).
Target audience: EVERY HUMAN BEING—anyone navigating personal dilemmas, overthinking, people-pleasing, daily habits, emotional balance, self-doubt, and relationships.
Universal themes to explore: people-pleasing, fear of being disliked, overthinking relationship texts/silence, productive procrastination, breaking bad habits, handling criticism, letting go of unfulfilling paths, fear of failure, boundary-setting, and learning to trust oneself.

Output strictly valid JSON with this exact schema:
{
  "themeId": "slug_of_topic",
  "topic": "Compelling Title of the Topic (max 65 chars)",
  "category": "Category Tag (e.g. EMOTIONAL CLARITY, SELF-AWARENESS, HABITS & MINDSET, RELATIONSHIPS)",
  "hook": "Provocative 1-sentence hook relatable to any human being",
  "linkedin": {
    "title": "Carousel Document Title (max 45 chars)",
    "caption": "Full viral-format LinkedIn post (250-350 words). Include scroll-stopping hook, body with bullet points analyzing the psychological blind spot in everyday human life, explain how TwinGenie's 4 perspectives and persistent memory solve it, include download CTA with https://play.google.com/store/apps/details?id=com.asmind.app, and include #TwinGenie and relevant hashtags (e.g. #SelfAwareness, #MentalHealth, #PersonalGrowth, #Mindset).",
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
        "title": "Everyday Human Dilemma Title",
        "subtitle": "Why standard thinking fails here",
        "bullets": [
          "Key symptom or daily rationalization",
          "The hidden subconscious fear or emotional trigger",
          "Why traditional advice or generic chatbots make it worse"
        ]
      },
      {
        "type": "comparison",
        "tag": "THE FLATTERY TRAP",
        "title": "Yes-Man AI vs Honest Twin",
        "subtitle": "Two contrasting responses to the exact same human dilemma",
        "left": {
          "badge": "[ STANDARD AI (THE YES-MAN) ]",
          "user": "Relatable everyday excuse or overthinking thought",
          "ai": "Flattering, superficial response validating avoidance or people-pleasing",
          "outcome": "Reinforces the habit and keeps you stuck in the loop"
        },
        "right": {
          "badge": "[ TWINGENIE (HONEST TWIN) ]",
          "user": "Relatable everyday excuse or overthinking thought",
          "ai": "Thoughtful, honest response that calls out emotional avoidance without attacking self-worth",
          "outcome": "Brings immediate self-understanding and clarity"
        }
      },
      {
        "type": "timeline",
        "tag": "COGNITIVE ARCHITECTURE",
        "title": "The Breakthrough Pipeline",
        "subtitle": "How longitudinal reflection rewires instincts",
        "steps": [
          { "step": "STAGE 01", "title": "Self Benchmark", "desc": "35-question calibration identifies baseline emotional patterns." },
          { "step": "STAGE 02", "title": "Pattern Reflection", "desc": "Semantic memory catches circular rationalizations over time." },
          { "step": "STAGE 03", "title": "Future Alignment", "desc": "Reframing through the 5-years-wiser Future Twin restores calm peace." }
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
          "100% private, self-guided personal reflection"
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
                const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
                logger.info(`[CONTENT GENERATOR] Prompting Gemini (${modelName}) for fresh daily topic...`);
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                const model = genAI.getGenerativeModel({
                    model: modelName,
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

        parsed.format = sharedFormat;
        parsed.facebookFormat = sharedFormat;
        parsed.instagramFormat = sharedFormat;
        parsed.formatType = schedule.formatType;
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
        const schedule = this.getDailySchedule();
        const activeMode = schedule.activeMode || { id: 'dark', name: 'Honest / Dark Twin' };
        const index = dayNumber % CURATED_FALLBACK_THEMES.length;
        const cur = CURATED_FALLBACK_THEMES[index];

        const slides = JSON.parse(JSON.stringify(cur.slides || []));
        if (slides[2] && slides[2].type === 'comparison') {
            slides[2].title = `Standard AI vs ${activeMode.name}`;
            slides[2].right = {
                badge: `[ TWINGENIE (${activeMode.name.toUpperCase()}) ]`,
                user: activeMode.defaultDilemma,
                ai: activeMode.defaultReply,
                outcome: `Brings immediate clarity through ${activeMode.name}`
            };
            if (slides[2].left) {
                slides[2].left.user = activeMode.defaultDilemma;
                slides[2].left.ai = activeMode.defaultBot;
            }
        }

        return {
            themeId: cur.id,
            topic: cur.topic,
            category: cur.category,
            hook: cur.hook,
            mode: activeMode.id,
            modeName: activeMode.name,
            formatType: schedule.formatType,
            chatDialogue: {
                userDilemma: activeMode.defaultDilemma,
                standardBotReply: activeMode.defaultBot,
                twinModeReply: activeMode.defaultReply,
                shift: `Exposes the avoidance loop and grounds you through ${activeMode.name}.`
            },
            linkedin: {
                title: cur.title,
                caption: cur.linkedinCaption,
                slides: slides
            },
            facebook: {
                title: cur.title,
                caption: cur.facebookCaption,
                firstComment: '📲 Experience your digital twin free on Google Play: https://play.google.com/store/apps/details?id=com.asmind.app\nTake your 35-question personality baseline today!',
                binaryQuestion: cur.binaryQuestion,
                voiceScript: cur.voiceScript,
                slides: slides
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

        // 5 Fully Customized Thought-Leadership Packages for Every Human Being (Punchy, Relatable, Clean on Mobile & Desktop)
        const founderPosts = {
            blind_spots: {
                title: "Why Your Biggest Strength Is Also Your Greatest Cognitive Blind Spot",
                caption: `Every human being has a strength that quietly doubles as their biggest blind spot.

• Naturally decisive? You dismiss subtle emotional warnings.
• Deeply empathetic? You tolerate mistreatment or people-pleasing.
• Highly analytical? You disguise hesitation as "need more research".

Standard AI chatbots only amplify this—they nod along with your rationalizations, flatter your comfort zone, and mirror your confirmation bias.

When engineering TwinGenie, our goal was to build an honest, private cognitive mirror: 4 distinct perspectives — Normal, Reflective, Honest, Future — backed by persistent pgvector memory that notices recurring patterns across weeks.

Swipe through the 6-slide carousel below to see how our cognitive mirror works. 👇

📲 Test your psychological baseline free on Google Play. Direct link in first comment.

#TwinGenie #SelfAwareness #CognitiveBiases #PersonalGrowth #MentalHealth #DigitalTwin`,
            },
            honest_mode: {
                title: "Why Most AI Chatbots Are Flattering Yes-Men — And How We Built TwinGenie",
                caption: `Most conversational AI is engineered to be a flattering yes-man. It strokes your ego, validates your excuses, and forgets everything the moment you close the app.

Real personal growth doesn't come from unconditional flattery. It comes from honest self-reflection.

That's why we engineered TwinGenie with 4 distinct cognitive lenses:
• Normal Twin — Your daily conversational partner
• Reflective Twin — Emotional validation & stress decompression
• Honest Twin — Zero flattery; challenges avoidance and rationalizations
• Future Twin — 5-years-wiser retrospective calm

Backed by persistent pgvector memory, TwinGenie remembers who you are and helps you stay true to yourself.

Swipe through the 6-slide breakdown below to explore how it works. 👇

📲 Download free on Google Play (link in first comment).

#TwinGenie #ArtificialIntelligence #SelfUnderstanding #DigitalTwin #PersonalGrowth #MindsetShift`,
            },
            decision_paralysis: {
                title: "The Hidden Cognitive Pattern Behind Why We Stall on Tough Life Decisions",
                caption: `"I just need a little more time before I decide."

In 90% of life dilemmas, "waiting to feel ready" is just sophisticated procrastination disguised as caution.

Standard chatbots make this worse by generating endless pros and cons—fueling your overthinking loop instead of helping you find clarity.

In TwinGenie, we engineered an AI companion that helps cut through analysis paralysis:
• Semantic Pattern Interception — Detects when you circle the same anxiety for weeks
• 4 Decision Lenses — Clarifies facts, uncovers hidden fears, and evaluates 5-year perspective
• Deterministic Calibration — Balances your innate psychological blind spots

Gain clarity over confusion.

Swipe through the 6-slide carousel below to see how we break overthinking loops. 👇

📲 Take your free 35-question cognitive baseline on Google Play (link in first comment).

#TwinGenie #DecisionMaking #MentalClarity #SelfGrowth #AICompanion #Overthinking #Mindset`,
            },
            future_perspective: {
                title: "What Your 5-Years-Wiser Self Would Say About Today's Anxiety",
                caption: `Think about the worst crisis you faced 5 years ago.

Back then, it felt like the world was ending. Today? You can barely remember the panic—or it taught you your most valuable lesson.

Human psychology suffers from severe temporal discounting: we over-index on today's panic and discount our long-term resilience.

That's why we built the Future Twin in TwinGenie:
• Temporal Shift Engine — Simulates the calm, retrospective clarity of your 5-years-wiser self
• Persistent Vector Memory — Retains your historical wins and core values across months
• Multi-Perspective Matrix — Shifts you from acute stress into grounded, long-term peace

Whenever today's worries feel overwhelming, switch to Future Mode.

Swipe through the 6-slide breakdown below to see how the temporal engine works. 👇

📲 Experience all 4 modes free on Google Play (link in first comment).

#TwinGenie #FutureSelf #MentalClarity #SelfGrowth #AICompanion #Resilience #Mindset`,
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
                    subtitle: "Every human being has a strength that quietly doubles as their biggest blind spot. Generic AI only reinforces the trap.",
                    takeaways: [
                        "How decisiveness or empathy can turn into self-sabotage",
                        "Why yes-man chatbots nod along with our rationalizations",
                        "Engineering an honest cognitive mirror that notices repeating loops"
                    ]
                },
                {
                    type: 'comparison',
                    tag: 'CONFIRMATION BIAS VS COGNITIVE MIRROR',
                    title: 'Standard LLM vs. TwinGenie Cognitive Mirror',
                    subtitle: 'How two systems respond when someone rationalizes an avoidance habit:',
                    left: {
                        badge: '[ STANDARD CHATBOT (EGO VALIDATOR) ]',
                        user: "I'm saying yes to this dinner and helping them move, even though I'm completely burned out.",
                        ai: "That is so kind of you! You have such a generous heart. Go help out and enjoy your evening!",
                        outcome: "Validates people-pleasing & guarantees exhaustion"
                    },
                    right: {
                        badge: '[ TWINGENIE (COGNITIVE MIRROR) ]',
                        user: "I'm saying yes to this dinner and helping them move, even though I'm completely burned out.",
                        ai: "You're saying you're exhausted, yet you still volunteer because saying no feels like admitting you're not enough. Setting a boundary is uncomfortable, but resentment is worse. Protect your peace.",
                        outcome: "Intercepts the people-pleasing loop & restores boundaries"
                    }
                },
                {
                    type: 'modes',
                    tag: 'MULTI-PERSPECTIVE REFLECTION',
                    title: 'Stress-Testing Our Daily Biases',
                    subtitle: 'Four distinct cognitive lenses designed to bring clarity to everyday life:',
                    modes: [
                        { name: 'Normal Twin', color: '#9333EA', desc: 'Your objective daily sounding board and thinking partner' },
                        { name: 'Reflective Twin', color: '#38BDF8', desc: 'Identifies emotional fatigue and validates feelings without shame' },
                        { name: 'Honest Twin', color: '#F43F5E', desc: 'Dismantles rationalizations and challenges avoidance habits' },
                        { name: 'Future Twin', color: '#34D399', desc: 'Evaluates the 5-year perspective to keep short-term worries grounded' }
                    ]
                },
                {
                    type: 'timeline',
                    tag: 'LOOP INTERCEPTION ENGINE',
                    title: 'The Cognitive Mirror Pipeline',
                    subtitle: 'How TwinGenie detects recurring subconscious patterns across weeks:',
                    steps: [
                        { step: "STAGE 01", title: "Baseline Calibration", desc: "35 Big Five-inspired questions establish your personality traits and emotional triggers." },
                        { step: "STAGE 02", title: "Semantic Pattern Matching", desc: "pgvector embeddings detect recurring self-sabotage loops that single-session chats miss completely." },
                        { step: "STAGE 03", title: "Honest Self-Awareness", desc: "Reflects your own stated values back to you so you can make intentional choices." }
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
                        'Dialectical Friction Engine: Explicitly rewards honest self-reflection over agreeable nods.'
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
                    title: "The Hidden Cognitive Pattern Behind Why We Stall on Tough Life Decisions",
                    subtitle: "\"I just need a little more time\" is usually sophisticated procrastination. Here's how we engineered an AI to break analysis paralysis.",
                    takeaways: [
                        "Why generic chatbots fuel overthinking with endless pro/con lists",
                        "The emotional trap of waiting to 'feel ready' before acting",
                        "Using persistent memory to intercept recurring indecision loops"
                    ]
                },
                {
                    type: 'comparison',
                    tag: 'PARALYSIS VS BREAKTHROUGH',
                    title: 'Generic AI vs. TwinGenie Decision Engine',
                    subtitle: 'When someone is hesitating on an uncomfortable but necessary choice:',
                    left: {
                        badge: '[ GENERIC LLM (THE ENABLER) ]',
                        user: "Should I delay having this hard conversation? I'm worried it will cause conflict.",
                        ai: "Here are 15 pros and cons of having the conversation, plus 8 alternative ways to hint at it indirectly...",
                        outcome: "Paralyzes with information overload & delays honest communication"
                    },
                    right: {
                        badge: '[ TWINGENIE (DECISION ENGINE) ]',
                        user: "Should I delay having this hard conversation? I'm worried it will cause conflict.",
                        ai: "You've brought this up three times this month. The conflict already exists inside you as silent resentment. Avoiding the conversation doesn't protect the relationship—it just delays resolution.",
                        outcome: "Cuts through the fear and sparks honest resolution"
                    }
                },
                {
                    type: 'modes',
                    tag: 'FOUR DECISION LENSES',
                    title: 'Decoupling Anxiety from Action',
                    subtitle: 'Evaluate personal dilemmas from 4 synchronized mental models:',
                    modes: [
                        { name: 'Normal Twin', color: '#9333EA', desc: 'Clarifies objective facts without emotional distortion' },
                        { name: 'Reflective Twin', color: '#38BDF8', desc: 'Diagnoses whether fear of disapproval is masquerading as patience' },
                        { name: 'Honest Twin', color: '#F43F5E', desc: 'Cuts through rationalizations: You aren\'t being cautious, you\'re stalling' },
                        { name: 'Future Twin', color: '#34D399', desc: 'Evaluates whether this fear will matter 5 years from now' }
                    ]
                },
                {
                    type: 'timeline',
                    tag: 'DECISION CONVERGENCE PIPELINE',
                    title: 'From Overthinking to Grounded Clarity',
                    subtitle: 'How TwinGenie helps you find inner conviction:',
                    steps: [
                        { step: "STAGE 01", title: "Hesitation Detection", desc: "Monitors recurring indecision loops and circular prompts in real time." },
                        { step: "STAGE 02", title: "Root Cause Discovery", desc: "Identifies whether fear of failure or people-pleasing is driving the stall." },
                        { step: "STAGE 03", title: "Calm Conviction", desc: "Helps you take the next clear step with self-respect and peace of mind." }
                    ]
                },
                {
                    type: 'dynamic',
                    tag: 'COGNITIVE SCIENCE',
                    title: 'Why Action Dissolves Anxiety',
                    highlight: 'CLARITY FOLLOWS COURAGE',
                    content: 'In daily human life, prolonged hesitation drains more mental energy than taking an imperfect step:',
                    bullets: [
                        'Information Overload: Beyond a certain point, more overthinking only increases dread.',
                        'Emotional Fatigue: Living in between decisions consumes our mental bandwidth.',
                        'Longitudinal Memory: Vector memory tracks your intentions so you hold yourself accountable.'
                    ]
                },
                {
                    type: 'cta',
                    tag: 'TWINGENIE • LIVE ON GOOGLE PLAY',
                    title: 'Break Decision Paralysis Today',
                    subtitle: 'Find peace and conviction with an AI Digital Twin calibrated to your personality.',
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
                    title: "What Your 5-Years-Wiser Self Would Say About Today's Anxiety",
                    subtitle: "We over-index on today's panic and discount our long-term resilience. Here's how the Future Twin brings life into perspective.",
                    takeaways: [
                        "How short-term stress traps us in reactive emotional firefighting",
                        "Using retrospective reframing to de-escalate high-anxiety moments",
                        "Connecting current struggles to your proven history of resilience"
                    ]
                },
                {
                    type: 'comparison',
                    tag: 'REACTIVE PANIC VS RETROSPECTIVE CLARITY',
                    title: 'Immediate Anxiety vs. Future Perspective',
                    subtitle: 'When an unexpected setback feels overwhelming:',
                    left: {
                        badge: '[ STANDARD CHATBOT (SHORT-TERM SYMPATHY) ]',
                        user: "I failed this certification / got rejected. Everything is falling apart.",
                        ai: "I'm so sorry to hear that! That must feel so terrible. Drink some tea, rest, and try again tomorrow.",
                        outcome: "Amplifies catastrophic thinking & offers zero perspective"
                    },
                    right: {
                        badge: '[ TWINGENIE (FUTURE TWIN) ]',
                        user: "I failed this certification / got rejected. Everything is falling apart.",
                        ai: "Remember how overwhelmed you felt six months ago when things didn't go as planned? You adapted and pushed through. This setback feels huge right now, but in five years it will just be a stepping stone. Breathe and let's reset.",
                        outcome: "Restores retrospective calm and re-anchors courage"
                    }
                },
                {
                    type: 'modes',
                    tag: 'FOUR TEMPORAL LENSES',
                    title: 'The Cognitive Matrix in Action',
                    subtitle: 'Balancing empathy, reality, and long-term perspective:',
                    modes: [
                        { name: 'Normal Twin', color: '#9333EA', desc: 'Your balanced baseline co-pilot for daily life' },
                        { name: 'Reflective Twin', color: '#38BDF8', desc: 'Validates emotional strain when your reserves run low' },
                        { name: 'Honest Twin', color: '#F43F5E', desc: 'Dismantles self-pity and reminds you of your agency' },
                        { name: 'Future Twin', color: '#34D399', desc: 'Views current obstacles through the lens of a 5-years-wiser self' }
                    ]
                },
                {
                    type: 'timeline',
                    tag: 'THE TEMPORAL PROGRESSION',
                    title: 'The Longitudinal Wisdom Engine',
                    subtitle: 'How TwinGenie builds a continuous model of your future self:',
                    steps: [
                        { step: "STAGE 01", title: "Values Calibration", desc: "35 Big Five-inspired questions define your core values, aspirations, and triggers." },
                        { step: "STAGE 02", title: "Resilience Tracking", desc: "Remembers past obstacles to prove you have overcome setbacks before." },
                        { step: "STAGE 03", title: "Retrospective Equanimity", desc: "Reframes immediate crises through the lens of a wiser self to neutralize panic." }
                    ]
                },
                {
                    type: 'dynamic',
                    tag: 'NEUROSCIENCE & PSYCHOLOGY',
                    title: 'The Science of the Future Self',
                    highlight: 'OVERCOMING SHORT-TERM PANIC',
                    content: 'Psychological studies show the brain views our future selves almost like total strangers. TwinGenie bridges that gap:',
                    bullets: [
                        'Neural Distance Reduction: Bringing long-term perspective into immediate focus.',
                        'Compounding Perspective: Turning acute setbacks into permanent self-knowledge.',
                        'Longitudinal Resilience: Using pgvector memory to remind you of your proven strength.'
                    ]
                },
                {
                    type: 'cta',
                    tag: 'TWINGENIE • LIVE ON GOOGLE PLAY',
                    title: 'Meet Your Future Self Today',
                    subtitle: 'Gain calm, retrospective clarity on today\'s most stressful dilemmas.',
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
                        user: "I'm having that same recurring argument with someone close to me again.",
                        ai: "I'm sorry to hear that! What kind of argument is it, and who is the person?",
                        outcome: "Zero context. Re-explaining history destroys depth"
                    },
                    right: {
                        badge: '[ TWINGENIE (LONGITUDINAL VECTOR MEMORY) ]',
                        user: "I'm having that same recurring argument with someone close to me again.",
                        ai: "Is this about feeling unappreciated like last week, or setting boundaries? You mentioned wanting to express yourself without defensiveness—let's look at what triggered you.",
                        outcome: "Instant context. Deepens self-awareness and emotional growth"
                    }
                },
                {
                    type: 'modes',
                    tag: 'PERSISTENT MULTI-LENS ENGINE',
                    title: 'Memory Across All Four Perspectives',
                    subtitle: 'Every mode draws from the same shared longitudinal memory graph:',
                    modes: [
                        { name: 'Normal Twin', color: '#9333EA', desc: 'Remembers daily commitments, habits, and ongoing thoughts' },
                        { name: 'Reflective Twin', color: '#38BDF8', desc: 'Retains emotional patterns, recurring stressors, and personal breakthroughs' },
                        { name: 'Honest Twin', color: '#F43F5E', desc: 'Remembers past excuses and gently holds you accountable to your words' },
                        { name: 'Future Twin', color: '#34D399', desc: 'Monitors long-term growth and guards your personal peace' }
                    ]
                },
                {
                    type: 'timeline',
                    tag: 'THE VECTOR PROGRESSION PIPELINE',
                    title: 'How TwinGenie Remembers What Matters',
                    subtitle: 'The 3-stage memory transformation from empty prompt to true digital twin:',
                    steps: [
                        { step: "STAGE 01", title: "Psychological Baseline", desc: "35 Big Five questions establish your emotional style, triggers, and values." },
                        { step: "STAGE 02", title: "Vector Embedding (pgvector)", desc: "Extracts meaningful personal themes across time, preventing context loss." },
                        { step: "STAGE 03", title: "Compounding Alter-Ego", desc: "Notices habits, reflects growth, and evolves into a true lifelong confidant." }
                    ]
                },
                {
                    type: 'dynamic',
                    tag: 'SYSTEM ARCHITECTURE',
                    title: 'Under the Hood: Vector Memory Engine',
                    highlight: 'PRIVACY-FIRST LONGITUDINAL RECALL',
                    content: 'Engineering long-term context retention without token explosion:',
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

        // Default Theme: Honest Mode (Flagship Cognitive Mirror)
        return [
            {
                type: 'cover',
                tag: 'SELF-UNDERSTANDING & AI',
                title: "Why Most AI Chatbots Are Flattering Yes-Men — And How We Built an AI That Truly Understands You",
                subtitle: "When I set out to build TwinGenie, I noticed a fundamental flaw in today's generative AI: LLMs have zero memory and a desperate algorithmic bias to flatter you.",
                takeaways: [
                    "Why stateless LLMs reinforce complacency and avoidance",
                    "The 4-perspective cognitive engine: Normal, Reflective, Honest, Future",
                    "Engineering persistent pgvector memory for genuine personal growth"
                ]
            },
            {
                type: 'comparison',
                tag: 'COGNITIVE AUDIT',
                title: 'Standard AI vs. TwinGenie Honest Mode',
                subtitle: 'Two completely different responses to the exact same avoidance pattern:',
                left: {
                    badge: '[ STANDARD LLM (ZERO MEMORY) ]',
                    user: "I feel like canceling on everyone and staying in bed all weekend because I feel overwhelmed.",
                    ai: "Totally valid! Prioritize self-care, order takeout, and don't feel bad about staying in!",
                    outcome: "Validates avoidance & reinforces isolation loop"
                },
                right: {
                    badge: '[ TWINGENIE (HONEST TWIN) ]',
                    user: "I feel like canceling on everyone and staying in bed all weekend because I feel overwhelmed.",
                    ai: "You've noticed this cycle before: when you feel anxious about upcoming social commitments, you retreat and call it burnout. Rest if you genuinely need it, but be honest with yourself about what you're avoiding.",
                    outcome: "Detects the recurring loop & sparks self-understanding"
                }
            },
            {
                type: 'modes',
                tag: 'MULTI-PERSPECTIVE AI',
                title: 'Four Distinct Cognitive Lenses',
                subtitle: 'Built on Big Five psychological baselines to reflect your thoughts with depth:',
                modes: [
                    { name: 'Normal Twin', color: '#9333EA', desc: 'Your authentic baseline tone & objective daily sounding board' },
                    { name: 'Reflective Twin', color: '#38BDF8', desc: 'High-empathy emotional validation & deep psychological grounding' },
                    { name: 'Honest Twin', color: '#F43F5E', desc: 'Zero flattery, zero bias. Gently exposes blind spots & excuses' },
                    { name: 'Future Twin', color: '#34D399', desc: 'The 5-years-wiser lens viewing today\'s panic in calm retrospect' }
                ]
            },
            {
                type: 'timeline',
                tag: 'PGVECTOR SEMANTIC MEMORY',
                title: 'The Memory Progression Pipeline',
                subtitle: 'How your AI evolves from an empty chatbot into an indispensable alter-ego:',
                steps: [
                    { step: "STAGE 01", title: "Baseline Calibration", desc: "35 Big Five-inspired questions establish your unique emotional and communication map." },
                    { step: "STAGE 02", title: "Pattern Recognition", desc: "Vector embeddings identify recurring stress triggers, decision loops, and emotional habits." },
                    { step: "STAGE 03", title: "True Digital Twin", desc: "Anticipates blind spots, encourages growth, and acts as a 24/7 personal confidant." }
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
                caption: `Every human being has a strength that quietly doubles as their biggest blind spot. 🪞

• Naturally decisive? You dismiss subtle emotional warnings.
• Deeply empathetic? You tolerate mistreatment or people-pleasing.
• Highly analytical? You disguise hesitation as "need more research".

Standard AI chatbots amplify this—they mirror your confirmation bias, stroke your ego, and agree with everything you say.

When building TwinGenie, our goal was to build an honest, private cognitive mirror: 4 distinct perspectives (Normal, Reflective, Honest, Future) and persistent pgvector memory that notices recurring patterns across weeks.

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #SelfAwareness #CognitiveBiases #PersonalGrowth #DigitalTwin #SelfReflection`,
            },
            honest_mode: {
                title: "Why Most AI Chatbots Are Flattering Yes-Men — And How We Built TwinGenie",
                caption: `Most conversational AI is engineered to be a flattering yes-man. It strokes your ego, validates your excuses, and forgets everything the moment you close the app. 🧠

Real personal growth doesn't come from unconditional flattery. It comes from honest self-reflection.

That's why we engineered TwinGenie with 4 distinct cognitive lenses:
• Normal Twin — Your daily conversational partner
• Reflective Twin — Emotional validation & stress decompression
• Honest Twin — Zero flattery; challenges avoidance and rationalizations
• Future Twin — 5-years-wiser retrospective calm

Backed by persistent pgvector memory, TwinGenie remembers who you are and helps you stay true to yourself.

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #SelfUnderstanding #DigitalTwin #MindsetShift #PersonalGrowth`,
            },
            decision_paralysis: {
                title: "The Hidden Cognitive Pattern Behind Why We Stall on Tough Life Decisions",
                caption: `"I just need a little more time before I decide." ⏳

In 90% of life dilemmas, "waiting to feel ready" is just sophisticated procrastination disguised as caution.

Standard chatbots make this worse by generating endless pros and cons—fueling your overthinking loop instead of helping you find clarity.

In TwinGenie, we engineered an AI companion that helps cut through analysis paralysis:
• Semantic Pattern Interception — Detects when you circle the same anxiety for weeks
• 4 Decision Lenses — Clarifies facts, uncovers hidden fears, and evaluates 5-year perspective
• Deterministic Calibration — Balances your innate psychological blind spots

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #DecisionMaking #MentalClarity #SelfGrowth #AICompanion #Overthinking #Mindset`,
            },
            future_perspective: {
                title: "What Your 5-Years-Wiser Self Would Say About Today's Anxiety",
                caption: `Think about the worst crisis you faced 5 years ago. 🔮

Back then, it felt like the world was ending. Today? You can barely remember the panic—or it taught you your most valuable lesson.

Human psychology suffers from severe temporal discounting: we over-index on today's panic and discount our long-term resilience.

That's why we built the Future Twin in TwinGenie:
• Temporal Shift Engine — Simulates the calm, retrospective clarity of your 5-years-wiser self
• Persistent Vector Memory — Retains your historical wins and core values across months
• Multi-Perspective Matrix — Shifts you from acute stress into grounded, long-term peace

Quick question for you:
${bq.prompt}

${bq.optionA}
OR
${bq.optionB}

Drop A or B in the comments! 👇

#TwinGenie #FutureSelf #MentalClarity #SelfGrowth #AICompanion #Resilience #Mindset`,
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
