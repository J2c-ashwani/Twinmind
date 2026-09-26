import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateDeterministicPersonality } from '../src/services/deterministicPersonality.js';
import { sendRecoveryEmail } from '../src/services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runRecovery() {
    console.log('🔍 Starting search for stuck users without personality profiles...');

    // 1. Fetch all users from Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
        console.error('Failed to list auth users:', authError);
        return;
    }

    const allUsers = authData.users;
    console.log(`Found ${allUsers.length} total users in Supabase Auth.`);

    // 2. Fetch all existing profiles
    const { data: existingProfiles, error: profError } = await supabase
        .from('personality_profiles')
        .select('user_id');

    if (profError) {
        console.error('Failed to fetch existing profiles:', profError);
        return;
    }

    const existingUserIds = new Set((existingProfiles || []).map(p => p.user_id));
    console.log(`Found ${existingUserIds.size} users with existing profiles.`);

    let recoveredCount = 0;
    let emailsSentCount = 0;

    for (const user of allUsers) {
        if (existingUserIds.has(user.id)) {
            continue; // Already has profile
        }

        // Fetch their answers
        const { data: answers, error: ansError } = await supabase
            .from('personality_answers')
            .select('*')
            .eq('user_id', user.id);

        if (ansError || !answers || answers.length === 0) {
            continue; // User has not submitted answers
        }

        console.log(`\n👉 Recovering user: ${user.email} (${user.id}) with ${answers.length} answers`);

        // Get user's full name from users table or metadata
        const { data: userRow } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const fullName = userRow?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];
        const twinName = `${fullName}'s Twin`;

        // Generate deterministic personality
        const personalityJson = calculateDeterministicPersonality(answers, { full_name: fullName });
        const twinSummary = personalityJson.summary || 'A unique digital twin reflecting your thinking patterns, values, and strengths.';

        // Save to personality_profiles
        const { error: insertError } = await supabase
            .from('personality_profiles')
            .insert({
                user_id: user.id,
                personality_json: personalityJson,
                twin_name: twinName,
                twin_summary: twinSummary,
                generation_prompt: 'Deterministic baseline recovery for post-launch stuck account',
                ai_model: 'deterministic_baseline',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

        if (insertError) {
            console.error(`❌ Failed to insert profile for ${user.email}:`, insertError);
            continue;
        }

        console.log(`✅ Profile successfully created in database for ${user.email}!`);
        recoveredCount++;
        existingUserIds.add(user.id);

        // Send recovery email
        if (user.email && !user.email.includes('tempmail')) {
            console.log(`✉️ Sending recovery email to ${user.email}...`);
            const emailResult = await sendRecoveryEmail({
                email: user.email,
                name: fullName,
                twinName,
                twinSummary
            });

            if (emailResult.success) {
                emailsSentCount++;
                console.log(`✉️ Email queued/sent for ${user.email}`);
            }
        }
    }

    console.log('\n=======================================');
    console.log(`🎉 Recovery Complete!`);
    console.log(`Total Profiles Recovered & Created: ${recoveredCount}`);
    console.log(`Total Recovery Emails Dispatched: ${emailsSentCount}`);
    console.log('=======================================\n');
}

runRecovery().catch(err => {
    console.error('Fatal error during recovery:', err);
});
