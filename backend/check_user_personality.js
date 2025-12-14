import { supabaseAdmin } from './src/config/supabase.js';

const userId = 'e7310007-0d22-47b8-ac61-281599cf7f85';

async function checkUserPersonality() {
    console.log(`\n🔍 Checking personality data for user: ${userId}\n`);

    try {
        // 1. Check if user exists in users table
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, full_name, email, created_at')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.log('❌ User not found in users table');
            return;
        }

        console.log('✅ User found:');
        console.log(`   Name: ${user.full_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${user.created_at}\n`);

        // 2. Check personality profile
        const { data: personality, error: personalityError } = await supabaseAdmin
            .from('personality_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (personalityError || !personality) {
            console.log('❌ NO PERSONALITY PROFILE FOUND');
            console.log('   This means signup did not complete properly.\n');
            return;
        }

        console.log('✅ Personality Profile found:');
        console.log(`   Created: ${personality.created_at}`);
        console.log(`   AI Model: ${personality.ai_model || 'N/A'}`);

        // Parse and display personality JSON
        let personalityData;
        try {
            personalityData = typeof personality.personality_json === 'string'
                ? JSON.parse(personality.personality_json)
                : personality.personality_json;

            console.log('\n📋 Personality Data:');
            console.log(JSON.stringify(personalityData, null, 2));
        } catch (e) {
            console.log('   ⚠️ Could not parse personality_json');
        }

        // 3. Check onboarding answers
        const { data: answers, error: answersError } = await supabaseAdmin
            .from('personality_answers')
            .select('*')
            .eq('user_id', userId);

        console.log('\n📝 Onboarding Answers:');
        if (answersError || !answers || answers.length === 0) {
            console.log('   ❌ NO ANSWERS FOUND - This might be a mock/default profile!');
        } else {
            console.log(`   ✅ Found ${answers.length} answers`);
            answers.forEach((ans, idx) => {
                console.log(`   ${idx + 1}. Q${ans.question_id}: ${ans.selected_option || 'N/A'}`);
                if (ans.answer_text) {
                    console.log(`      Text: ${ans.answer_text.substring(0, 60)}...`);
                }
            });
        }

        // 4. Analysis
        console.log('\n═══════════════════════════════════════');
        console.log('📊 ANALYSIS:');
        console.log('═══════════════════════════════════════');

        const isMock = !answers || answers.length === 0 ||
            (personalityData &&
                personalityData.core_traits?.includes('supportive') &&
                personalityData.core_traits?.includes('curious') &&
                personalityData.core_traits?.includes('adaptive') &&
                personalityData.style === 'friendly');

        if (isMock) {
            console.log('🚨 VERDICT: This appears to be a MOCK/DEFAULT personality');
            console.log('   Reasons:');
            if (!answers || answers.length === 0) {
                console.log('   - No onboarding answers found');
            }
            if (personalityData?.core_traits?.length === 3 &&
                personalityData.core_traits.includes('supportive')) {
                console.log('   - Contains default fallback traits');
            }
        } else {
            console.log('✅ VERDICT: This appears to be a REAL personality');
            console.log(`   - Has ${answers?.length || 0} real onboarding answers`);
            console.log('   - Personality was generated from user input');
        }
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('Error checking user:', error.message);
    }

    process.exit(0);
}

checkUserPersonality();
