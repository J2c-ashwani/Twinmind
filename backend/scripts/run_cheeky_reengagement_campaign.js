import { supabaseAdmin } from '../src/config/supabase.js';
import { sendCheekyReEngagementEmail } from '../src/services/emailService.js';
import { calculateDeterministicPersonality } from '../src/services/deterministicPersonality.js';

const isDryRun = process.argv.includes('--dry-run');

async function runCampaign() {
    console.log('================================================================');
    console.log(`🚀 EXECUTING CHEEKY RE-ENGAGEMENT CAMPAIGN (Aug 24 -> Present)`);
    console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (Preview only, no emails sent)' : '⚡ LIVE SENDING'}`);
    console.log('================================================================\n');

    // 1. Fetch all auth users
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) {
        console.error('Failed to list auth users:', error);
        process.exit(1);
    }

    // 2. Fetch existing profiles and messages
    const { data: profiles } = await supabaseAdmin.from('personality_profiles').select('user_id, twin_name, twin_summary');
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

    const { data: chats } = await supabaseAdmin.from('chat_history').select('user_id, sender');
    const userMsgCount = new Map();
    (chats || []).forEach(c => {
        if (c.sender === 'user') {
            userMsgCount.set(c.user_id, (userMsgCount.get(c.user_id) || 0) + 1);
        }
    });

    const aug24 = new Date('2026-08-24T00:00:00Z');

    // 3. Filter audience: registered Aug 24+ and valid email
    const targetUsers = users.filter(u => {
        const created = new Date(u.created_at);
        if (created < aug24) return false;
        if (!u.email) return false;
        if (u.email.includes('@twingenie.test')) return false;
        if (u.email.endsWith('.comm') || u.email.includes('tempmail')) return false; // Filter invalid/temp emails
        return true;
    });

    console.log(`Found ${targetUsers.length} target users registered since Aug 24, 2026.\n`);

    let sentCount = 0;
    let failCount = 0;

    for (let i = 0; i < targetUsers.length; i++) {
        const user = targetUsers[i];
        const rawName = user.user_metadata?.name || user.user_metadata?.full_name || '';
        const displayName = rawName.trim() || user.email.split('@')[0];
        let profile = profileMap.get(user.id);
        const msgs = userMsgCount.get(user.id) || 0;

        // If profile missing, ensure deterministic profile exists
        if (!profile && !isDryRun) {
            try {
                const personalityJson = calculateDeterministicPersonality([], { name: displayName });
                const twinName = `${displayName}'s Twin`;
                const twinSummary = personalityJson.summary || 'A unique digital twin reflecting your thinking patterns and decision style.';

                await supabaseAdmin.from('personality_profiles').insert({
                    user_id: user.id,
                    personality_json: personalityJson,
                    twin_name: twinName,
                    twin_summary: twinSummary,
                    generation_prompt: 'Deterministic baseline recovery for re-engagement campaign',
                    ai_model: 'deterministic_baseline',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

                profile = { user_id: user.id, twin_name: twinName, twin_summary: twinSummary };
                console.log(`  [Profile Seeded] Created deterministic twin for ${displayName}`);
            } catch (err) {
                console.warn(`  [Warning] Could not seed profile for ${user.email}: ${err.message}`);
            }
        }

        const twinName = profile?.twin_name || `${displayName}'s AI Twin`;
        const twinSummary = profile?.twin_summary || "Tuned to reflect your thinking style, help make decisions, and support your daily personal growth.";

        console.log(`[${i + 1}/${targetUsers.length}] ${displayName} <${user.email}> (User Messages: ${msgs})`);

        if (isDryRun) {
            console.log(`  -> Would send: "Did you forget you created another version of yourself? 🪞" to ${user.email}`);
            sentCount++;
            continue;
        }

        // Live send via Resend
        const result = await sendCheekyReEngagementEmail({
            email: user.email,
            name: displayName,
            twinName,
            twinSummary
        });

        if (result.success) {
            sentCount++;
            console.log(`  ✅ Sent successfully (ID: ${result.id})`);
        } else {
            failCount++;
            console.error(`  ❌ Failed to send:`, result.error);
        }

        // Respect rate limits: pause 600ms between sends
        await new Promise(r => setTimeout(r, 600));
    }

    console.log('\n================================================================');
    console.log(`🎉 Campaign Complete: ${sentCount} sent, ${failCount} failed.`);
    console.log('================================================================');
}

runCampaign().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Fatal campaign error:', err);
    process.exit(1);
});
