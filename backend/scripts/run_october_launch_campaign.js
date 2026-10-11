import { supabaseAdmin } from '../src/config/supabase.js';
import { sendEmail } from '../src/services/emailService.js';

const isDryRun = process.argv.includes('--dry-run');

/**
 * October Community & Product Update Campaign
 * Celebrates 50+ downloads milestone, invites users back to test new twin capabilities,
 * and announces public launch/directory presence.
 */
function buildCampaignEmailHtml({ name, twinName }) {
    const displayName = name || 'there';
    const resolvedTwin = twinName || 'Your AI Twin';
    const appUrl = 'https://twingenie.app/open';
    const playStoreReviewUrl = 'https://play.google.com/store/apps/details?id=com.asmind.app';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TwinGenie Milestone & Update</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0716; color: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #161129; border-radius: 16px; border: 1px solid #2e2456; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #7c3aed, #2563eb); padding: 36px 24px; text-align: center; }
    .badge { display: inline-block; background: rgba(255,255,255,0.2); color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 12px; }
    .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .content { padding: 32px 24px; line-height: 1.6; font-size: 15px; color: #d1d5db; }
    .card { background: #1f173d; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #3c2f70; }
    .card-title { color: #c084fc; font-weight: 700; font-size: 16px; margin-bottom: 8px; }
    .card-text { color: #e5e7eb; font-size: 14.5px; line-height: 1.5; }
    .feature-grid { margin: 20px 0; }
    .feature-item { margin-bottom: 14px; padding-left: 24px; position: relative; font-size: 14px; line-height: 1.5; }
    .feature-item::before { content: "✦"; position: absolute; left: 0; color: #a855f7; font-weight: bold; }
    .btn { display: inline-block; background: linear-gradient(135deg, #9333ea, #3b82f6); color: #ffffff !important; text-decoration: none; padding: 15px 32px; border-radius: 30px; font-weight: 700; font-size: 16px; margin: 20px 0; text-align: center; box-shadow: 0 4px 18px rgba(147, 51, 234, 0.45); }
    .footer { padding: 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #231b42; }
    .ps { margin-top: 24px; padding-top: 16px; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 13.5px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">🎉 Community Milestone • 50+ Installs</div>
      <h1>TwinGenie Just Leveled Up 🪞</h1>
    </div>
    <div class="content">
      <p>Hey ${displayName},</p>
      
      <p>Thanks to early thinkers like you, <strong>TwinGenie</strong> just crossed our first big milestone on Google Play: <strong>50+ active installs</strong>! 🚀</p>
      
      <p>To celebrate, we’ve shipped our biggest engine upgrade yet. Your digital twin is now sharper, more intuitive, and ready to hold deeper conversations with zero latency.</p>
      
      <div class="card">
        <div class="card-title">🪞 What ${resolvedTwin} Can Do For You Today:</div>
        <div class="card-text">
          <div class="feature-item"><strong>Instant Decision Mirror:</strong> Bring any dilemma, pitch, or life crossroad—your twin breaks down your cognitive biases in real-time.</div>
          <div class="feature-item"><strong>4 Twin Modes:</strong> Toggle seamlessly between <em>Reflective</em> (emotional depth), <em>Honest</em> (unfiltered clarity), and <em>Future Twin</em> (5-year perspective).</div>
          <div class="feature-item"><strong>Continuous Memory:</strong> It remembers what you discussed last week, tracking your personal goals and mood streaks.</div>
        </div>
      </div>

      <p style="text-align: center; margin: 28px 0;">
        <a href="${appUrl}" class="btn">Open App & Talk to Your Twin →</a>
      </p>

      <p style="font-size: 13.5px; color: #9ca3af; text-align: center;">
        <em>Installed already? Tapping the button launches the app directly. If not, it opens Google Play.</em>
      </p>

      <div class="ps">
        <p><strong>🌟 Help Us Shape the Future of AI Twins:</strong></p>
        <p>We're currently preparing our public feature across <strong>Product Hunt</strong> and startup discovery platforms. If TwinGenie has sparked even one moment of clarity for you, leaving a quick review on <a href="${playStoreReviewUrl}" style="color: #c084fc; text-decoration: underline;">Google Play</a> means the world to our small team!</p>
      </div>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} TwinGenie AI • You're receiving this because you created a TwinGenie account.</p>
    </div>
  </div>
</body>
</html>
`;
}

async function runCampaign() {
    console.log('================================================================');
    console.log('🚀 EXECUTING OCTOBER 50+ MILESTONE & RE-ENGAGEMENT CAMPAIGN');
    console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Preview only, no emails will be sent)' : '⚡ LIVE SENDING VIA RESEND.COM'}`);
    console.log('================================================================\n');

    // 1. Fetch users from Supabase Auth
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
        console.error('Failed to list auth users:', error);
        process.exit(1);
    }

    // 2. Fetch profiles
    const { data: profiles } = await supabaseAdmin.from('personality_profiles').select('user_id, twin_name');
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    // 3. Filter target users with valid email addresses
    const targetUsers = users.filter(u => {
        if (!u.email) return false;
        const email = u.email.toLowerCase().trim();
        if (email.includes('@twingenie.test') || email.includes('example.com')) return false;
        if (email.endsWith('.comm') || email.endsWith('.invalid')) return false;
        if (email.includes('tempmail') || email.includes('disposable')) return false;
        return true;
    });

    console.log(`Audience: ${targetUsers.length} qualified users ready for campaign.\n`);

    let sent = 0;
    let failed = 0;

    for (let i = 0; i < targetUsers.length; i++) {
        const user = targetUsers[i];
        const rawName = user.user_metadata?.full_name || user.user_metadata?.name || '';
        const displayName = rawName.trim() || user.email.split('@')[0];
        const profile = profileMap.get(user.id);
        const twinName = profile?.twin_name || `${displayName}'s Twin`;

        const subject = `🎉 We hit 50+ downloads! Meet your upgraded AI Twin 🪞`;
        const html = buildCampaignEmailHtml({ name: displayName, twinName });

        if (isDryRun) {
            console.log(`[DRY RUN ${i + 1}/${targetUsers.length}] Would send to: ${user.email} (${displayName})`);
            sent++;
        } else {
            console.log(`[SENDING ${i + 1}/${targetUsers.length}] Sending to: ${user.email} (${displayName})...`);
            const result = await sendEmail({
                to: user.email,
                subject,
                html
            });

            if (result.success) {
                console.log(`  ✅ Sent successfully (Resend ID: ${result.id})`);
                sent++;
            } else {
                console.error(`  ❌ Failed to send to ${user.email}:`, result.error);
                failed++;
            }

            // Respect Resend rate limits: 500ms between requests
            await new Promise(r => setTimeout(r, 500));
        }
    }

    console.log('\n================================================================');
    console.log(`Campaign execution complete!`);
    console.log(`  Total targeted: ${targetUsers.length}`);
    console.log(`  Successfully processed: ${sent}`);
    console.log(`  Failed: ${failed}`);
    console.log('================================================================\n');
}

runCampaign().catch(err => {
    console.error('Fatal campaign error:', err);
    process.exit(1);
});
