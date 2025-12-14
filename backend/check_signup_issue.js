import { supabaseAdmin } from './src/config/supabase.js';

const userId = '21862d0b-9851-4af3-ba29-7b59b93e2133';

async function checkUserProfile() {
    console.log(`\n🔍 Checking profile for user: ${userId}\n`);

    try {
        // 1. Check user in users table
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.log('❌ User not found in users table');
            return;
        }

        console.log('✅ User found:');
        console.log(`   Name: ${user.full_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${user.created_at}`);

        // 2. Check personality profile
        const { data: personality, error: personalityError } = await supabaseAdmin
            .from('personality_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        console.log('\n📋 Personality Profile:');
        if (personalityError || !personality) {
            console.log('❌ NO PERSONALITY PROFILE FOUND');
            console.log('   Status: Account created but onboarding INCOMPLETE');
        } else {
            console.log('✅ Personality exists');
            console.log(`   Created: ${personality.created_at}`);
        }

        // 3. Check onboarding answers
        const { data: answers, error: answersError } = await supabaseAdmin
            .from('personality_answers')
            .select('*')
            .eq('user_id', userId);

        console.log('\n📝 Onboarding Answers:');
        if (answersError || !answers || answers.length === 0) {
            console.log('❌ NO ANSWERS FOUND');
        } else {
            console.log(`✅ Found ${answers.length} answers`);
        }

        console.log('\n═══════════════════════════════════════');
        console.log('📊 DIAGNOSIS:');
        console.log('═══════════════════════════════════════');

        if (!personality && (!answers || answers.length === 0)) {
            console.log('🚨 ISSUE CONFIRMED:');
            console.log('   - Auth account: CREATED ✓');
            console.log('   - User profile: CREATED ✓');
            console.log('   - Onboarding answers: NOT SAVED ✗');
            console.log('   - Personality: NOT GENERATED ✗');
            console.log('\n   ROOT CAUSE: Signup succeeded but personality generation failed');
            console.log('   USER SAW: Error message (but was actually logged in)');
        }
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('Error:', error.message);
    }

    process.exit(0);
}

checkUserProfile();
