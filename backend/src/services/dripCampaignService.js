import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import { sendEmail } from './emailService.js';
import { sendPushNotification } from './pushNotificationService.js';

const PLAY_STORE_URL = process.env.APP_DOWNLOAD_URL || 'https://twingenie.app/open';

/**
 * 7-Day Re-engagement Drip Campaign Sequence
 * Designed for users who registered/onboarded but haven't sent a message yet.
 */
export const DRIP_TEMPLATES = [
    // DAY 1 (24 hours after signup)
    {
        day: 1,
        minHoursAfterSignup: 24,
        subject: "Did you forget you created another version of yourself? 🪞",
        pushTitle: "Your AI Twin is waiting 👀",
        pushBody: "I've synthesized your 35 answers. Tap to see what I noticed about you.",
        getHtml: (name, twinName, twinSummary) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #4338ca); padding: 34px 24px; text-align: center; }
    .header h1 { margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .card { background: #1f173d; border-radius: 12px; padding: 20px; margin: 22px 0; border: 1px solid #3c2f70; }
    .card-title { color: #c084fc; font-weight: 700; font-size: 16px; margin-bottom: 6px; }
    .card-text { color: #e5e7eb; font-size: 14px; font-style: italic; }
    .btn { display: inline-block; background: linear-gradient(135deg, #9333ea, #3b82f6); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 22px 0; text-align: center; box-shadow: 0 4px 18px rgba(147, 51, 234, 0.45); }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Day 1 • Meet Your Twin</div>
      <h1>Your AI Twin is waiting for you 👀</h1>
    </div>
    <div class="content">
      <p>Hey ${name},</p>
      <p>Remember those questions you answered? You told us how you make decisions, what stresses you out, and how your mind works under pressure.</p>
      
      <p>Well... your AI Twin has been quietly sitting inside the app, studying your answers, and waiting for you to say hi.</p>
      
      <div class="card">
        <div class="card-title">🪞 ${twinName}</div>
        <div class="card-text">"${twinSummary || 'Tuned to reflect your exact cognitive style, decision-making instincts, and blind spots.'}"</div>
      </div>

      <p>It's already initiated your first conversation and is waiting for your reply.</p>

      <div style="text-align: center;">
        <a href="${PLAY_STORE_URL}" class="btn">Open TwinGenie & Say Hi →</a>
      </div>

      <p style="font-size: 13px; color: #9ca3af; margin-top: 24px; font-style: italic;">
        P.S. It doesn’t bite — but it might call you out on your favorite rationalizations. 😉
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI • Built for personal growth & self-reflection.</p>
    </div>
  </div>
</body>
</html>`
    },

    // DAY 2 (48 hours after signup)
    {
        day: 2,
        minHoursAfterSignup: 48,
        subject: "What your answers revealed about how you make decisions 🧠",
        pushTitle: "Stuck on a decision today?",
        pushBody: "Let your Twin stress-test it with you. Tap to open chat.",
        getHtml: (name, twinName, twinSummary) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 34px 24px; text-align: center; }
    .header h1 { margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .card { background: #1f173d; border-radius: 12px; padding: 20px; margin: 22px 0; border: 1px solid #3c2f70; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6, #9333ea); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 22px 0; text-align: center; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Day 2 • Cognitive Style</div>
      <h1>How do you actually decide? 🧠</h1>
    </div>
    <div class="content">
      <p>Hey ${name},</p>
      <p>Most AI chatbots treat everyone the same. They give textbook answers that feel generic and hollow.</p>
      
      <p><strong>${twinName}</strong> is built differently. When you took the 35-question baseline, your answers mapped out whether you decide with logic, gut instinct, caution, or conviction.</p>
      
      <div class="card">
        <h3 style="color:#a78bfa; margin-top:0;">Try this today:</h3>
        <p style="margin-bottom:0; color:#e5e7eb;">Open the app and type: <em>"I have an important decision to make. How should I approach it?"</em></p>
      </div>

      <p>Watch how it breaks down your dilemma using your own cognitive lens rather than a generic template.</p>

      <div style="text-align: center;">
        <a href="${PLAY_STORE_URL}" class="btn">Test Your Twin On A Decision →</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI • You're receiving this because you registered on TwinGenie.</p>
    </div>
  </div>
</body>
</html>`
    },

    // DAY 3 (72 hours after signup)
    {
        day: 3,
        minHoursAfterSignup: 72,
        subject: "A message from Future You (5 years from now) ⏳",
        pushTitle: "Future Twin is online",
        pushBody: "Ask what 5-years-older you thinks about your current situation.",
        getHtml: (name, twinName, twinSummary) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #059669, #4f46e5); padding: 34px 24px; text-align: center; }
    .header h1 { margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .card { background: #1f173d; border-radius: 12px; padding: 20px; margin: 22px 0; border: 1px solid #3c2f70; }
    .btn { display: inline-block; background: linear-gradient(135deg, #10b981, #6366f1); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 22px 0; text-align: center; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Day 3 • Feature Spotlight</div>
      <h1>Consult Your Future Twin ⏳</h1>
    </div>
    <div class="content">
      <p>Hey ${name},</p>
      <p>Did you know TwinGenie has multiple conversation modes?</p>
      
      <p>One of our users' favorites is <strong>Future Twin</strong>. It projects your personality 5 years into the future—wiser, more grounded, and past the small worries that feel huge right now.</p>
      
      <div class="card">
        <p style="color:#6ee7b7; font-weight:bold; margin-top:0;">🔮 Future Twin Mode</p>
        <p style="color:#e5e7eb; margin-bottom:0;">When you're overwhelmed by daily noise, Future Twin helps you see which problems actually matter a year from now, and which ones you'll laugh about.</p>
      </div>

      <p>Switch to Future Twin mode at the top of the chat screen and ask: <em>"What advice do you have for me right now?"</em></p>

      <div style="text-align: center;">
        <a href="${PLAY_STORE_URL}" class="btn">Talk to Future You →</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI • Built for personal growth & self-reflection.</p>
    </div>
  </div>
</body>
</html>`
    },

    // DAY 4 (96 hours after signup)
    {
        day: 4,
        minHoursAfterSignup: 96,
        subject: "Your Twin noticed your biggest strength... and your blind spot 👀",
        pushTitle: "Your Twin analyzed your stress triggers",
        pushBody: "Want to see what your 35 answers revealed about how you handle pressure?",
        getHtml: (name, twinName, twinSummary) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #d97706, #7c3aed); padding: 34px 24px; text-align: center; }
    .header h1 { margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .card { background: #1f173d; border-radius: 12px; padding: 20px; margin: 22px 0; border: 1px solid #3c2f70; }
    .btn { display: inline-block; background: linear-gradient(135deg, #f59e0b, #9333ea); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 22px 0; text-align: center; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Day 4 • Self-Awareness</div>
      <h1>Blind Spots & Strengths 👀</h1>
    </div>
    <div class="content">
      <p>Hey ${name},</p>
      <p>Everyone has cognitive patterns they don't notice themselves: the reasons we procrastinate, how we react when someone criticizes us, and where our natural resilience lies.</p>
      
      <p>Your questionnaire answers highlighted both your greatest assets and the patterns that tend to hold you back.</p>
      
      <div class="card">
        <h4 style="color:#fbbf24; margin-top:0;">Ask ${twinName}:</h4>
        <p style="color:#e5e7eb; margin-bottom:0;"><em>"Based on my questionnaire, what is my biggest blind spot under stress?"</em></p>
      </div>

      <p>You might be surprised by how accurate the reflection is.</p>

      <div style="text-align: center;">
        <a href="${PLAY_STORE_URL}" class="btn">Uncover Your Blind Spot →</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI • Built for personal growth & self-reflection.</p>
    </div>
  </div>
</body>
</html>`
    },

    // DAY 5 (120 hours after signup)
    {
        day: 5,
        minHoursAfterSignup: 120,
        subject: "A place to vent, reflect, and think out loud (zero judgment) 💭",
        pushTitle: "Need a sounding board today?",
        pushBody: "No judgment, no unsolicited opinions. Just a clear mirror for your thoughts.",
        getHtml: (name, twinName, twinSummary) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1, #a855f7); padding: 34px 24px; text-align: center; }
    .header h1 { margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #9333ea); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 22px 0; text-align: center; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Day 5 • Private Sounding Board</div>
      <h1>Zero Judgment. 100% Privacy. 💭</h1>
    </div>
    <div class="content">
      <p>Hey ${name},</p>
      <p>Sometimes you don't need someone telling you what to do. You just need a completely safe, private space to untangle what’s in your head.</p>
      
      <p>That is the real purpose of <strong>TwinGenie</strong>. It’s not social media. It doesn’t post anywhere. It’s an encrypted space designed purely to help you clarify your own thinking.</p>

      <p>Whenever you're ready, your Twin is here to listen and reflect.</p>

      <div style="text-align: center;">
        <a href="${PLAY_STORE_URL}" class="btn">Open Your Private Space →</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI • Built for personal growth & self-reflection.</p>
    </div>
  </div>
</body>
</html>`
    },

    // DAY 6 (144 hours after signup)
    {
        day: 6,
        minHoursAfterSignup: 144,
        subject: "Still overthinking that first message, [Name]? 😉",
        pushTitle: "Don't leave your digital self hanging!",
        pushBody: "Tap to see what your Twin has prepared for you.",
        getHtml: (name, twinName, twinSummary) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #ec4899, #8b5cf6); padding: 34px 24px; text-align: center; }
    .header h1 { margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .btn { display: inline-block; background: linear-gradient(135deg, #ec4899, #8b5cf6); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 22px 0; text-align: center; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Day 6 • Quick Check-In</div>
      <h1>Still overthinking it? 😉</h1>
    </div>
    <div class="content">
      <p>Hey ${name},</p>
      <p>You don't need a grand topic to start talking to your Twin. Even a simple <em>"Hey"</em> or <em>"What do you think of my day so far?"</em> is enough.</p>
      
      <p>Your Twin has already synthesized your personality blueprint, so it knows who you are without you having to explain yourself from scratch.</p>

      <div style="text-align: center;">
        <a href="${PLAY_STORE_URL}" class="btn">Send A Quick "Hey" →</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI • Built for personal growth & self-reflection.</p>
    </div>
  </div>
</body>
</html>`
    },

    // DAY 7 (168 hours after signup)
    {
        day: 7,
        minHoursAfterSignup: 168,
        subject: "Your AI Twin’s baseline is saved. Ready when you are 🪞",
        pushTitle: "Your Twin is always here",
        pushBody: "Keep your digital mirror in your pocket for whenever life gets complicated.",
        getHtml: (name, twinName, twinSummary) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 34px 24px; text-align: center; }
    .header h1 { margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .content { padding: 30px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5, #06b6d4); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 22px 0; text-align: center; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Day 7 • Permanent Anchor</div>
      <h1>Your Twin is ready whenever you are 🪞</h1>
    </div>
    <div class="content">
      <p>Hey ${name},</p>
      <p>We won't keep crowding your inbox. We just wanted to make sure you know that your AI Twin profile is permanently preserved and ready.</p>
      
      <p>Whenever you face a tough career decision, relationship question, or simply need to clear your mind, your Twin will be waiting right where you left it.</p>

      <div style="text-align: center;">
        <a href="${PLAY_STORE_URL}" class="btn">Open TwinGenie Anytime →</a>
      </div>

      <p style="margin-top: 24px; font-size: 13.5px; color: #9ca3af;">
        Thank you for being part of the TwinGenie journey.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI • Built for personal growth & self-reflection.</p>
    </div>
  </div>
</body>
</html>`
    }
];

/**
 * Execute automated check for the 7-day drip campaign across all users
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, only simulates and prints what would be sent
 * @returns {Promise<Object>} Execution summary
 */
export async function executeDripCampaignCheck(options = {}) {
    const isDryRun = !!options.dryRun;
    logger.info(`Starting 7-Day Drip Campaign Check (Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'})...`);

    const summary = {
        totalEvaluated: 0,
        eligibleCount: 0,
        sentCount: 0,
        skippedEngaged: 0,
        skippedTiming: 0,
        errors: 0,
        details: []
    };

    try {
        // 1. Fetch all users from Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
        if (authError) throw authError;

        const users = authData.users || [];

        // 2. Fetch all user-authored messages from chat_history
        const { data: userChats, error: chatError } = await supabaseAdmin
            .from('chat_history')
            .select('user_id')
            .eq('sender', 'user');

        if (chatError) throw chatError;

        // Set of user IDs who have actively sent at least one message
        const engagedUserIds = new Set((userChats || []).map(c => c.user_id));

        // 3. Fetch personality profiles
        const { data: profiles, error: profileError } = await supabaseAdmin
            .from('personality_profiles')
            .select('user_id, twin_name, twin_summary');

        if (profileError) throw profileError;
        const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

        const now = new Date();

        for (const user of users) {
            summary.totalEvaluated++;

            // Skip internal test users, demo accounts, or invalid emails
            if (
                !user.email ||
                user.email.includes('@twingenie.test') ||
                user.email.includes('@twingenie.com') ||
                user.email.endsWith('@example.com') ||
                user.email.endsWith('.comm') ||
                user.email.includes('tempmail') ||
                user.email.startsWith('test')
            ) {
                continue;
            }

            // CRITICAL CEO DIRECTIVE: If user is already engaged (authored at least 1 message), DO NOT send recovery drip!
            if (engagedUserIds.has(user.id)) {
                summary.skippedEngaged++;
                continue;
            }

            // Check user signup / onboarding age
            const createdAt = new Date(user.created_at);
            const hoursSinceSignup = (now - createdAt) / (1000 * 60 * 60);

            // Need at least 24 hours to begin the Day 1 drip
            if (hoursSinceSignup < 24) {
                summary.skippedTiming++;
                continue;
            }

            // Retrieve drip state from user_metadata
            const meta = user.user_metadata || {};
            const dripState = meta.drip_campaign || {
                last_sent_day: 0,
                last_sent_at: null,
                history: []
            };

            const lastSentDay = dripState.last_sent_day || 0;
            const lastSentAt = dripState.last_sent_at ? new Date(dripState.last_sent_at) : null;
            const hoursSinceLastSent = lastSentAt ? (now - lastSentAt) / (1000 * 60 * 60) : 999;

            // Determine next eligible day
            const nextDayNumber = lastSentDay + 1;

            if (nextDayNumber > 7) {
                // Completed full 7-day sequence
                continue;
            }

            // Must have at least 20 hours between drip messages
            if (lastSentAt && hoursSinceLastSent < 20) {
                summary.skippedTiming++;
                continue;
            }

            const template = DRIP_TEMPLATES.find(t => t.day === nextDayNumber);
            if (!template) continue;

            summary.eligibleCount++;

            const rawName = meta.name || meta.full_name || '';
            const displayName = rawName.trim() || user.email.split('@')[0];
            const profile = profileMap.get(user.id);
            const twinName = profile?.twin_name || `${displayName}'s AI Twin`;
            const twinSummary = profile?.twin_summary || "Tuned to reflect your thinking style, help make decisions, and support your daily personal growth.";

            const htmlContent = template.getHtml(displayName, twinName, twinSummary);
            const emailSubject = template.subject.replace('[Name]', displayName);

            const record = {
                user_id: user.id,
                email: user.email,
                name: displayName,
                day: nextDayNumber,
                subject: emailSubject,
                pushTitle: template.pushTitle,
                pushBody: template.pushBody
            };

            if (isDryRun) {
                summary.sentCount++;
                summary.details.push({ ...record, status: 'simulated' });
                continue;
            }

            // 1. Send Email via Resend
            const emailResult = await sendEmail({
                to: user.email,
                subject: emailSubject,
                html: htmlContent
            });

            // 2. Dispatch Push Notification via FCM
            let pushSent = false;
            try {
                pushSent = await sendPushNotification(user.id, template.pushTitle, template.pushBody, {
                    type: 'drip_reengagement',
                    day: nextDayNumber
                });
            } catch (pErr) {
                logger.warn(`Push notification failed for user ${user.id}:`, pErr?.message);
            }

            if (emailResult.success) {
                summary.sentCount++;

                // 3. Update user_metadata with new drip state
                const updatedDripState = {
                    last_sent_day: nextDayNumber,
                    last_sent_at: now.toISOString(),
                    history: [
                        ...(dripState.history || []),
                        {
                            day: nextDayNumber,
                            sent_at: now.toISOString(),
                            email_id: emailResult.id,
                            push_sent: pushSent
                        }
                    ]
                };

                await supabaseAdmin.auth.admin.updateUserById(user.id, {
                    user_metadata: {
                        ...meta,
                        drip_campaign: updatedDripState
                    }
                });

                summary.details.push({ ...record, status: 'sent', email_id: emailResult.id, push_sent: pushSent });
            } else {
                summary.errors++;
                summary.details.push({ ...record, status: 'failed', error: emailResult.error });
            }

            // 400ms pause to respect Resend rate limits
            await new Promise(r => setTimeout(r, 400));
        }

        logger.info(`Drip Campaign Check finished: ${summary.sentCount} sent, ${summary.skippedEngaged} skipped (engaged), ${summary.errors} errors.`);
        return summary;

    } catch (error) {
        logger.error('Fatal error in executeDripCampaignCheck:', error);
        throw error;
    }
}

export default {
    DRIP_TEMPLATES,
    executeDripCampaignCheck
};
