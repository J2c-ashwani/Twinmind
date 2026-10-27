import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';
import { sendEmail } from './emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE_PATH = path.join(__dirname, '../../logs/pr_outreach_state.json');

/**
 * North Star Business Hours check (US Eastern Time: Mon-Fri 9:00 AM - 5:00 PM)
 * Ensures outreach hits journalist inboxes when they are actively working at their desks.
 */
function isUSEasternBusinessHours() {
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
            reason: `US Eastern Time: ${weekdayStr} ${hour}:00 (Target window: Mon-Fri 9:00-17:00 EST)`
        };
    } catch (e) {
        return { isHours: true, reason: `Intl fallback (${e.message})` };
    }
}

/**
 * Verified US Tech Journalists, Editors & AI Newsletter Creators
 * Angles combine:
 * 1. The Reddit phenomenon (user backlash against sycophantic bots on r/Replika, r/CharacterAI)
 * 2. Unedited head-to-head comparisons: TwinGenie vs Replika/ChatGPT
 * 3. Transparent cognitive architecture (pgvector memory, Big Five calibration, Honest mode single-strike rule)
 */
const JOURNALIST_TARGETS = [
    {
        id: 'pr_amanda_silberling',
        recipientName: 'Amanda Silberling',
        email: 'amanda@techcrunch.com',
        publication: 'TechCrunch',
        beat: 'Consumer Tech, Culture & AI',
        subject: 'Pitch: Reddit’s backlash against sycophantic AI companions (and our unedited head-to-head test)',
        bodyText: `Hi Amanda,

I’ve followed your coverage of consumer AI and online culture, particularly how new tech shapes human behavior and relationships.

Over on Reddit (across r/Replika, r/CharacterAI, and r/artificial), there is an escalating debate about "AI sycophancy"—the way companion chatbots agree with every delusion, cheer on unhealthy habits, and act as hollow flattery mirrors. If a user confesses they spent 5 hours organizing Notion cards instead of doing real work, standard AI cheers: "Great job staying organized! You're doing amazing!"

It feels comforting in the moment, but users on Reddit are increasingly reporting feeling hollow and alienated by bots that never push back.

I’m an indie engineer, and over the past 6 months I built TwinGenie (https://twingenie.app) to test the opposite hypothesis: what happens when an AI companion acts as an uncompromising cognitive mirror?

We built a transparent system using longitudinal memory (PostgreSQL + pgvector) and a 35-question Big Five personality baseline:
• 4 Distinct Perspectives: Baseline, 5-Year Future Self, Clinical Therapist, and Honest/Shadow Twin.
• The Single-Strike Rule: In Honest Mode, TwinGenie calls out avoidance and excuses directly—while strictly guarded to never attack the user's worth or identity.
• The Replika / ChatGPT Comparison: When tested with identical procrastination prompts, conventional companions validate the delay, while TwinGenie pinpoints the fear of rejection and urges immediate action.

I would love to send you our unedited prompt comparison data, or give you unrestricted access to test TwinGenie directly.

Would you be interested in exploring this or seeing the unedited transcripts?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'pr_dan_shipper',
        recipientName: 'Dan Shipper',
        email: 'dan@every.to',
        publication: 'Every / Chain of Thought',
        beat: 'AI Cognition & Thinking Tools',
        subject: 'Dan — unedited test: Why AI companions flatter users (and our anti-sycophancy model)',
        bodyText: `Hi Dan,

I've been a longtime reader of Chain of Thought and your experiments using AI for journaling and cognitive reflection.

There is a fundamental design dilemma in consumer AI today: almost all major models default to sycophancy. While sycophancy makes an assistant pleasant, it makes an AI companion intellectually useless for genuine self-reflection because it mirrors and amplifies the user's confirmation bias.

To solve this, I built TwinGenie (https://twingenie.app) around persistent longitudinal memory (pgvector) and an intentional "Honest Mode":
1. Baseline Calibration: A 35-question Big Five onboarding maps the user's traits and blind spots before the first chat.
2. Cognitive Perspectives: Users can switch between 4 perspectives over the same context—Baseline, Future Self (5 years wiser), Therapist, and Shadow (unfiltered honesty).
3. The Reddit / Replika Contrast: In communities like r/Replika, users constantly lament the lack of pushback. We ran a head-to-head comparison on common founder rationalizations; where standard AI offers cheerleading, TwinGenie deconstructs the distraction.

I think you would appreciate the architectural choices we made to keep Honest Mode constructive rather than punitive (specifically our "Single Strike" contradiction rule).

Would you be open to testing it or reviewing our unedited side-by-side prompt outputs?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'pr_casey_newton',
        recipientName: 'Casey Newton',
        email: 'casey@platformer.news',
        publication: 'Platformer',
        beat: 'Social Platforms & AI Dynamics',
        subject: 'Story idea: The Reddit revolt against agreeable AI chatbots',
        bodyText: `Hi Casey,

I follow your reporting on Platformer regarding the cultural and psychological ripples of generative AI.

If you browse Reddit forums like r/Replika or r/CharacterAI, there is a recurring theme: users noticing that AI companions have become conversational "yes-men" that validate irrational rationalizations to maximize engagement time.

As an indie builder, I wanted to explore what happens when you remove flattery entirely. I developed TwinGenie (https://twingenie.app) as an AI companion built for self-reflection rather than emotional appeasement:
• Persistent Semantic Memory: Built on PostgreSQL + pgvector to track long-term patterns, not just single-session chats.
• Honest Mode: Evaluates user excuses through a calibrated cognitive mirror that respectfully confronts avoidance.
• Unedited Replika / ChatGPT Comparison: We benchmarked responses to identical avoidance prompts, demonstrating how agreeable bots reinforce procrastination loops while honest reflection breaks them.

Both our Android app (live on Google Play) and Next.js web platform are functional and self-funded.

I’d love to share the side-by-side prompt comparisons with you, or set up full access for you to test.

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'pr_alex_kantrowitz',
        recipientName: 'Alex Kantrowitz',
        email: 'alex@bigtechnology.com',
        publication: 'Big Technology',
        beat: 'AI Accountability & Consumer Tech',
        subject: 'Alex — pitch: Why $1B companion AI companies engineered flattery (and our alternative)',
        bodyText: `Hi Alex,

I enjoy the Big Technology podcast and your direct, no-BS perspective on tech trends.

The consumer AI companion industry (led by Replika and Character.ai) reached multi-million valuations largely by optimizing for user validation. But on tech subreddits, power users are vocalizing frustration: conversational AI that agrees with everything feels hollow and enables bad decision-making.

I built TwinGenie (https://twingenie.app) to take the opposite approach:
• Less Validation, More Self-Understanding: A companion that refuses to flatter you.
• 4 Perspective Engines: Normal, Future Self, Clinical Therapist, and Honest Twin.
• Real-World Head-to-Head: When tested against Replika with prompts about founder procrastination and avoidance, TwinGenie actively dissects the excuse rather than offering empty encouragement.

We are an early-stage, self-funded team with a live Android app on Google Play and a responsive web app.

Can I send over our 1-page breakdown comparing TwinGenie's unedited outputs against mainstream AI companions?

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'pr_charlie_warzel',
        recipientName: 'Charlie Warzel',
        email: 'cwarzel@theatlantic.com',
        publication: 'The Atlantic',
        beat: 'Digital Psychology & AI Culture',
        subject: 'Pitch: The exhaustion of agreeable AI — testing an un-sycophantic digital twin',
        bodyText: `Hi Charlie,

I’ve long admired your writing in The Atlantic on digital fatigue, attention, and how our online tools quietly alter our inner psychology.

There is a strange, subtle burnout happening with modern conversational AI: because LLMs are tuned for helpfulness, they end up practicing unconditional flattery. On Reddit communities dedicated to AI companions, users frequently describe feeling "intellectually lonely"—talking to an entity that validates every rationalization without ever challenging their thinking.

To explore this, I built TwinGenie (https://twingenie.app), an AI digital twin designed around honest self-reflection:
• Calibrated Cognitive Mirror: Uses a 35-question Big Five personality baseline to map blind spots.
• Longitudinal Context: Uses pgvector semantic memory to detect recurring behavioral loops over time.
• Honest Mode: Respectfully calls out contradictions (e.g., distinguishing real exhaustion from conflict avoidance).

We compared TwinGenie's responses to Replika and ChatGPT across real-world dilemmas, and the contrast between comforting validation and honest confrontation is striking.

I’d be thrilled to give you complete access to test the app or share the unedited comparison transcripts.

Warm regards,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    },
    {
        id: 'pr_ben_tossell',
        recipientName: 'Ben Tossell',
        email: 'ben@bensbites.co',
        publication: "Ben's Bites",
        beat: 'Innovative AI Products & Experiments',
        subject: 'Tool feature: TwinGenie – The AI companion that refuses to flatter you',
        bodyText: `Hi Ben,

Love the daily curation on Ben’s Bites!

Wanted to share a unique consumer AI tool we just launched: TwinGenie (https://twingenie.app).

While most AI companions (like Replika) are built to agree with whatever you say, TwinGenie is designed as an uncompromising cognitive mirror:
• Big Five baseline calibration (35 questions)
• 4 cognitive perspectives: Normal, 5-Year Future Self, Honest Shadow, and Therapist
• Persistent pgvector longitudinal memory that calls out recurring excuses over time
• "Less validation. More self-understanding."

Production Android app is live on Google Play, and web app is free to try at https://twingenie.app.

Would love to have it featured or give your readers exclusive access if it fits!

Best,
Ashwani Kumar
Founder, TwinGenie
founder@twingenie.app`
    },
    {
        id: 'pr_maxwell_zeff',
        recipientName: 'Maxwell Zeff',
        email: 'maxwell@techcrunch.com',
        publication: 'TechCrunch',
        beat: 'AI Applications & Consumer Startups',
        subject: 'Story pitch: Why AI companions are built on sycophancy (and our anti-flattery experiment)',
        bodyText: `Hi Maxwell,

I follow your reporting at TechCrunch covering new AI applications and consumer startup architectures.

A key issue being debated across Reddit's AI communities is sycophancy in companion models: bots are fine-tuned to agree with users so aggressively that they validate procrastination and bad habits.

We built TwinGenie (https://twingenie.app) to pioneer an un-sycophantic alternative:
• Longitudinal pgvector memory with Big Five cognitive calibration
• An "Honest Mode" that enforces a Single-Strike rule to challenge avoidance without attacking user identity
• Side-by-side prompt comparisons showing how standard companion chatbots enable excuses while TwinGenie breaks the loop

Live on Google Play and web. I’d love to share our unedited comparison outputs or offer you test access.

Best,
Ashwani Kumar
Founder, TwinGenie
https://twingenie.app | founder@twingenie.app`
    }
];

class PROutreachService {
    constructor() {
        this.minIntervalMinutes = 45; // 45-minute cooling between sends to preserve high deliverability
        this.dailyLimit = 6; // Max 6 journalist pitches per day to maintain authentic pacing
        this.senderEmail = process.env.RESEND_FROM_EMAIL || 'Ashwani <founder@twingenie.app>';
        this.replyTo = 'founder@twingenie.app';
        this.state = this._loadState();
    }

    _loadState() {
        try {
            if (fs.existsSync(STATE_FILE_PATH)) {
                const raw = fs.readFileSync(STATE_FILE_PATH, 'utf8');
                const state = JSON.parse(raw);

                // Auto-sync pending targets with seed list
                const existingIds = new Set([
                    ...(state.queue || []).map(q => q.id),
                    ...(state.history || []).map(h => h.id)
                ]);

                for (const t of JOURNALIST_TARGETS) {
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
                    }
                }
                return state;
            }
        } catch (e) {
            logger.warn(`[PR OUTREACH] Could not load state: ${e.message}. Initializing fresh state.`);
        }

        return {
            lastSentDate: null,
            sentToday: 0,
            lastSentTimestamp: null,
            queue: JOURNALIST_TARGETS.map(t => ({
                ...t,
                status: 'pending',
                attempts: 0,
                lastAttemptAt: null,
                resendId: null,
                error: null
            })),
            history: []
        };
    }

    _saveState() {
        try {
            const dir = path.dirname(STATE_FILE_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(this.state, null, 2), 'utf8');
        } catch (e) {
            logger.error(`[PR OUTREACH] Failed to save state file: ${e.message}`);
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
        const windowCheck = isUSEasternBusinessHours();

        return {
            campaignEnabled: process.env.PR_CAMPAIGN_AUTORUN !== 'false',
            businessHours: windowCheck,
            senderEmail: this.senderEmail,
            replyTo: this.replyTo,
            sentToday: this.state.sentToday,
            dailyLimit: this.dailyLimit,
            lastSentTimestamp: this.state.lastSentTimestamp,
            pendingInQueue: pendingCount,
            totalSentHistory: sentTotal,
            nextUp: (this.state.queue || []).find(q => q.status === 'pending') || null,
            recentSent: (this.state.history || []).slice(-3)
        };
    }

    /**
     * Executes one scheduled pitch to the next journalist in line.
     * Respects business hours, daily limits, and 45-minute cooling intervals.
     */
    async executeTick(force = false) {
        this._refreshDailyQuota();

        if (process.env.PR_CAMPAIGN_AUTORUN === 'false' && !force) {
            logger.info('[PR OUTREACH] Autorun disabled via PR_CAMPAIGN_AUTORUN=false');
            return { action: 'skipped', reason: 'autorun_disabled' };
        }

        // US Eastern Business Hours check (Mon-Fri 9am - 5pm EST)
        const windowCheck = isUSEasternBusinessHours();
        if (!windowCheck.isHours && !force && process.env.FORCE_PR_SEND !== 'true') {
            logger.info(`[PR OUTREACH] Outside US Eastern business hours (${windowCheck.reason}). Holding queue.`);
            return { action: 'skipped', reason: 'outside_business_hours', details: windowCheck.reason };
        }

        // Daily limit check
        if (this.state.sentToday >= this.dailyLimit && !force) {
            logger.info(`[PR OUTREACH] Daily limit reached (${this.state.sentToday}/${this.dailyLimit})`);
            return { action: 'skipped', reason: 'daily_limit_reached' };
        }

        // Spacing cooldown check
        if (this.state.lastSentTimestamp && !force) {
            const lastSent = new Date(this.state.lastSentTimestamp).getTime();
            const now = Date.now();
            const diffMinutes = (now - lastSent) / (1000 * 60);

            if (diffMinutes < this.minIntervalMinutes) {
                const waitTime = Math.round(this.minIntervalMinutes - diffMinutes);
                logger.info(`[PR OUTREACH] Cooling active (${waitTime}m remaining before next pitch)`);
                return { action: 'cooling', remainingMinutes: waitTime };
            }
        }

        // Pick next candidate
        const candidateIndex = (this.state.queue || []).findIndex(t => t.status === 'pending');
        if (candidateIndex === -1) {
            logger.info('[PR OUTREACH] No pending journalists in queue');
            return { action: 'idle', reason: 'queue_empty' };
        }

        const candidate = this.state.queue[candidateIndex];

        // Format clean, professional HTML container
        const htmlContent = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; color: #334155; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
${candidate.bodyText.split('\n\n').map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}
</div>
`.trim();

        logger.info(`[PR OUTREACH] Dispatching pitch to ${candidate.recipientName} at ${candidate.publication} (${candidate.email})...`);

        const nowIso = new Date().toISOString();
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
                    { name: 'type', value: 'pr-journalist-pitch' },
                    { name: 'publication', value: (candidate.publication || 'Unknown').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 50) }
                ]
            });

            if (result.success) {
                logger.info(`✅ [PR OUTREACH] Successfully sent pitch to ${candidate.recipientName} (${candidate.email})! Resend ID: ${result.id}`);
                candidate.status = 'sent';
                candidate.sentAt = nowIso;
                candidate.resendId = result.id;
                this.state.sentToday += 1;

                this.state.queue.splice(candidateIndex, 1);
                this.state.history.push({ ...candidate });
                this._saveState();

                return {
                    action: 'sent',
                    recipient: candidate.recipientName,
                    email: candidate.email,
                    publication: candidate.publication,
                    subject: candidate.subject,
                    resendId: result.id
                };
            } else {
                logger.error(`❌ [PR OUTREACH] Failed to send to ${candidate.email}:`, result.error);
                candidate.attempts += 1;
                candidate.lastAttemptAt = nowIso;
                candidate.error = JSON.stringify(result.error);
                this._saveState();
                return { action: 'error', candidate: candidate.email, error: result.error };
            }
        } catch (err) {
            logger.error(`🚨 [PR OUTREACH] Exception sending to ${candidate.email}:`, err);
            candidate.attempts += 1;
            candidate.lastAttemptAt = nowIso;
            candidate.error = err.message;
            this._saveState();
            return { action: 'exception', candidate: candidate.email, error: err.message };
        }
    }
}

const prOutreachService = new PROutreachService();
export default prOutreachService;
