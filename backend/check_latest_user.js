import { supabaseAdmin } from './src/config/supabase.js';

const userId = 'aabff44c-a191-4f17-aa89-7d6e918cb1a5';

async function checkUserProfile() {
    console.log(`\n🔍 Checking profile for user: ${userId}\n`);

    try {
        // Check user
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.log('❌ User not found');
            return;
        }

        console.log('✅ User Account:');
        console.log(`   Name: ${user.full_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created: ${user.created_at}`);

        // Check personality
        const { data: personality, error: pError } = await supabaseAdmin
            .from('personality_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();

        console.log('\n📋 Personality Profile:');
        if (pError || !personality) {
            console.log('❌ NOT FOUND');
        } else {
            console.log('✅ EXISTS');
            console.log(`   Created: ${personality.created_at}`);
        }

        // Check answers
        const { data: answers } = await supabaseAdmin
            .from('personality_answers')
            .select('*')
            .eq('user_id', userId);

        console.log('\n📝 Answers:');
        if (!answers || answers.length === 0) {
            console.log('❌ NO ANSWERS SAVED');
        } else {
            console.log(`✅ ${answers.length} answers saved`);
        }

        console.log('\n═══════════════════════════════════════');
        console.log('DIAGNOSIS: Account created but backend API calls failed');
        console.log('═══════════════════════════════════════\n');

    } catch (error) {
        console.error('Error:', error.message);
    }

    process.exit(0);
}

checkUserProfile();
