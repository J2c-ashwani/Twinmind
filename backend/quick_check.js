import { supabaseAdmin } from './src/config/supabase.js';

const userId = '058a5376-b29a-49cf-8553-f28cd6a1360d';

async function checkUser() {
    const { data: user } = await supabaseAdmin.from('users').select('*').eq('id', userId).single();
    const { data: personality } = await supabaseAdmin.from('personality_profiles').select('*').eq('user_id', userId).single();
    const { data: answers } = await supabaseAdmin.from('personality_answers').select('*').eq('user_id', userId);

    console.log('\n✅ User:', user?.full_name, user?.email);
    console.log('📋 Personality:', personality ? 'EXISTS' : '❌ NOT FOUND');
    console.log('📝 Answers:', answers?.length || 0, 'saved');
    console.log('\nCreated:', user?.created_at);

    process.exit(0);
}

checkUser();
