import logger from '../config/logger.js';

/**
 * Email Service using Resend REST API
 * Supports transactional emails, recovery emails, and broadcast product updates.
 */

const RESEND_API_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL || 'TwinGenie <onboarding@resend.dev>';

/**
 * Send an email via Resend
 * @param {Object} options
 * @param {string|string[]} options.to - Recipient email or array of emails
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text fallback
 * @param {string} [options.from] - Sender address
 */
export async function sendEmail({ to, subject, html, text, from = DEFAULT_FROM }) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        logger.warn(`[EMAIL NOTICE] RESEND_API_KEY is not set. Email to [${to}] was not sent via network.`);
        logger.info(`[EMAIL PREVIEW] Subject: "${subject}" | To: ${to}`);
        return {
            simulated: true,
            success: true,
            id: 'simulated_' + Date.now(),
            to,
            subject
        };
    }

    try {
        const recipients = Array.isArray(to) ? to : [to];
        const response = await fetch(RESEND_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from,
                to: recipients,
                subject,
                html,
                text: text || html.replace(/<[^>]*>?/gm, '')
            })
        });

        const data = await response.json();

        if (!response.ok) {
            logger.error(`Resend API error (${response.status}):`, data);
            return { success: false, error: data };
        }

        logger.info(`✅ Email successfully sent to ${recipients.join(', ')} (ID: ${data.id})`);
        return { success: true, id: data.id };

    } catch (error) {
        logger.error('Failed to send email via Resend:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send recovery email to users whose personality profile was delayed
 */
export async function sendRecoveryEmail({ email, name, twinName, twinSummary }) {
    const displayName = name || 'there';
    const resolvedTwinName = twinName || 'Your AI Twin';
    const appUrl = process.env.APP_DOWNLOAD_URL || 'https://play.google.com/store/apps/details?id=com.asmind.app';

    const subject = `Your AI Twin is ready to chat! 🪞`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AI Twin is Ready</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 36px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.15); color: #fff; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .card { background: #1f173d; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #3c2f70; }
    .card-title { color: #a78bfa; font-weight: 700; font-size: 16px; margin-bottom: 8px; }
    .card-text { color: #e5e7eb; font-size: 14px; font-style: italic; }
    .btn { display: inline-block; background: linear-gradient(135deg, #9333ea, #6366f1); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 30px; font-weight: 600; font-size: 16px; margin: 20px 0; text-align: center; box-shadow: 0 4px 14px rgba(147, 51, 234, 0.4); }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">TwinGenie AI</div>
      <h1>Your Digital Twin is Alive</h1>
    </div>
    <div class="content">
      <p>Hey ${displayName},</p>
      <p>Thank you for taking the time to complete your 35-question onboarding questionnaire on <strong>TwinGenie</strong>.</p>
      
      <p>We recently upgraded our personality synthesis engine, and we have fully created your personalized AI Twin profile:</p>
      
      <div class="card">
        <div class="card-title">🪞 ${resolvedTwinName}</div>
        <div class="card-text">"${twinSummary || 'Ready to reflect your thinking style, help make decisions, and support your daily personal growth.'}"</div>
      </div>

      <p>Your Twin understands your thinking patterns, core motivations, and decision-making style. It is now waiting in the app to talk with you.</p>

      <div style="text-align: center;">
        <a href="${appUrl}" class="btn">Open App & Chat With Your Twin →</a>
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #9ca3af;">
        Tip: When you open the app, your Twin will be ready with starter reflections so you can dive straight in!
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI. Built for self-reflection & personal growth.</p>
    </div>
  </div>
</body>
</html>
`;

    return sendEmail({
        to: email,
        subject,
        html
    });
}

/**
 * Send automated product update or new release email
 */
export async function sendProductUpdateEmail({ email, name, version, title, highlights = [], actionUrl, actionText }) {
    const displayName = name || 'there';
    const resolvedTitle = title || `New Update: TwinGenie ${version || ''}`;
    const targetUrl = actionUrl || 'https://play.google.com/store/apps/details?id=com.asmind.app';
    const buttonText = actionText || 'Update & Open TwinGenie';

    const highlightsHtml = highlights.map(item => `<li style="margin-bottom: 8px;">${item}</li>`).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resolvedTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .content { padding: 32px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .highlight-box { background: #1f173d; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #3c2f70; }
    .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 30px; font-weight: 600; font-size: 16px; margin: 20px 0; text-align: center; }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 ${resolvedTitle}</h1>
    </div>
    <div class="content">
      <p>Hey ${displayName},</p>
      <p>We've just rolled out a fresh update to your <strong>TwinGenie</strong> experience!</p>
      
      <div class="highlight-box">
        <h3 style="margin-top:0; color:#c4b5fd;">What's New in this Release:</h3>
        <ul style="padding-left: 20px; color:#e5e7eb;">
          ${highlightsHtml || '<li>Faster personality reflections and zero-delay twin responses</li><li>Enhanced conversation memory and proactive check-ins</li>'}
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="${targetUrl}" class="btn">${buttonText} →</a>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI. Built for self-reflection & personal growth.</p>
    </div>
  </div>
</body>
</html>
`;

    return sendEmail({
        to: email,
        subject: resolvedTitle,
        html
    });
}

/**
 * Send automated welcome email immediately after onboarding completion
 */
export async function sendWelcomeEmail({ email, name, twinName, twinSummary, archetype }) {
    const displayName = name || 'there';
    const resolvedTwinName = twinName || 'Your AI Twin';
    const resolvedSummary = twinSummary || 'Your thinking partner, decision support, and digital mirror.';
    const appUrl = process.env.APP_DOWNLOAD_URL || 'https://play.google.com/store/apps/details?id=com.asmind.app';

    const subject = `Welcome to TwinGenie – Meet your AI Twin 🪞`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to TwinGenie</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 36px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin-bottom: 12px; }
    .card { background: #1f173d; border-radius: 12px; padding: 22px; margin: 24px 0; border: 1px solid #3c2f70; }
    .card-title { color: #a78bfa; font-weight: 700; font-size: 17px; margin-bottom: 8px; }
    .card-text { color: #e5e7eb; font-size: 14.5px; font-style: italic; line-height: 1.5; }
    .feature-list { margin: 20px 0; padding-left: 0; list-style: none; }
    .feature-item { margin-bottom: 14px; font-size: 14px; line-height: 1.5; }
    .btn { display: inline-block; background: linear-gradient(135deg, #9333ea, #6366f1); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 30px; font-weight: 600; font-size: 16px; margin: 22px 0; text-align: center; box-shadow: 0 4px 14px rgba(147, 51, 234, 0.4); }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">TwinGenie AI</div>
      <h1>Welcome, ${displayName}! 🪞</h1>
    </div>
    <div class="content">
      <p>Congratulations! You’ve completed your onboarding, and your personalized digital twin has officially been created.</p>
      
      <div class="card">
        <div class="card-title">🪞 ${resolvedTwinName}${archetype ? ` (${archetype})` : ''}</div>
        <div class="card-text">"${resolvedSummary}"</div>
      </div>

      <p>Your Twin is not just a chatbot—it is an intelligent reflection of your thought patterns, values, and decision-making style. Here is what you can do right now:</p>

      <ul class="feature-list">
        <li class="feature-item">💭 <strong>Think Out Loud:</strong> Bounce tricky decisions, dilemmas, or ideas off an AI that understands how you reason.</li>
        <li class="feature-item">⏳ <strong>Talk to Future Twin:</strong> Switch modes in chat to consult a version of you from 5 years in the future.</li>
        <li class="feature-item">🌱 <strong>Daily Check-ins:</strong> Let your Twin check in on your habits, goals, and emotional balance.</li>
      </ul>

      <p>Your Twin has already initiated your first conversation and is waiting in the app to talk with you.</p>

      <div style="text-align: center;">
        <a href="${appUrl}" class="btn">Open App & Chat With Your Twin →</a>
      </div>

      <p style="margin-top: 24px; font-size: 13px; color: #9ca3af;">
        Tip: When you open the app, your Twin will be waiting with your first message and starter reflections so you can dive straight in!
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI. Built for self-reflection & personal growth.</p>
    </div>
  </div>
</body>
</html>
`;

    return sendEmail({
        to: email,
        subject,
        html
    });
}

/**
 * Send cheeky re-engagement campaign email to bring back unengaged users
 */
export async function sendCheekyReEngagementEmail({ email, name, twinName, twinSummary }) {
    const displayName = name || 'there';
    const resolvedTwinName = twinName || 'Your AI Twin';
    const appUrl = process.env.APP_DOWNLOAD_URL || 'https://play.google.com/store/apps/details?id=com.asmind.app';

    const subject = `Did you forget you created another version of yourself? 🪞`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AI Twin is waiting</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #7c3aed, #4338ca); padding: 36px 24px; text-align: center; }
    .header h1 { margin: 8px 0 0 0; color: #ffffff; font-size: 25px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .badge { display: inline-block; background: rgba(255,255,255,0.18); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; }
    .card { background: #1f173d; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #3c2f70; }
    .card-title { color: #c084fc; font-weight: 700; font-size: 16px; margin-bottom: 6px; }
    .card-text { color: #e5e7eb; font-size: 14px; font-style: italic; line-height: 1.5; }
    .bullet-list { margin: 20px 0; padding-left: 0; list-style: none; }
    .bullet-item { margin-bottom: 12px; font-size: 14px; line-height: 1.5; padding-left: 24px; position: relative; }
    .bullet-item::before { content: "✦"; position: absolute; left: 0; color: #a855f7; font-weight: bold; }
    .btn { display: inline-block; background: linear-gradient(135deg, #9333ea, #3b82f6); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 24px 0; text-align: center; box-shadow: 0 4px 18px rgba(147, 51, 234, 0.45); }
    .footer { padding: 20px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
    .ps { margin-top: 24px; padding-top: 16px; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 13.5px; color: #9ca3af; font-style: italic; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">TwinGenie Reconnect</div>
      <h1>Your AI Twin is waiting for you 👀</h1>
    </div>
    <div class="content">
      <p>Hey ${displayName},</p>
      
      <p>Remember those questions you answered? You know, the ones where you revealed how you actually make decisions, what stresses you out, and how your mind works under pressure?</p>
      
      <p>Well... your AI Twin has been quietly sitting inside the app, studying your answers, and waiting for you to say hi.</p>
      
      <div class="card">
        <div class="card-title">🪞 ${resolvedTwinName}</div>
        <div class="card-text">"${twinSummary || 'Built from your answers to reflect your exact cognitive style, decision-making instincts, and blind spots.'}"</div>
      </div>

      <p>We just gave your Twin a major brain upgrade. It’s sharper, faster, and already has an opening message waiting for you.</p>

      <div class="bullet-list">
        <div class="bullet-item"><strong>Bounce a decision off it:</strong> See if it spots the cognitive traps you usually fall into.</div>
        <div class="bullet-item"><strong>Ask it what it noticed:</strong> See what your answers revealed about how you really think.</div>
        <div class="bullet-item"><strong>Switch to Future Twin:</strong> Get advice from a version of you 5 years down the road.</div>
      </div>

      <p>Don’t leave your digital self hanging.</p>

      <div style="text-align: center;">
        <a href="${appUrl}" class="btn">Open TwinGenie & Meet Your Twin →</a>
      </div>

      <p class="ps">
        P.S. It doesn’t bite — but it might call you out on your favorite rationalizations. 😉
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI • You're receiving this because you created an account on TwinGenie.</p>
    </div>
  </div>
</body>
</html>
`;

    return sendEmail({
        to: email,
        subject,
        html
    });
}

export default {
    sendEmail,
    sendRecoveryEmail,
    sendProductUpdateEmail,
    sendWelcomeEmail,
    sendCheekyReEngagementEmail
};
