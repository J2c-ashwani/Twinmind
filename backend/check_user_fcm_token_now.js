import { supabaseAdmin } from './src/config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const EMAIL = 'join2campus@gmail.com';

async function checkTokenNow() {
    console.log(`\n======================================================`);
    console.log(`🔍 CHECKING SUPABASE PRODUCTION DATABASE FOR: ${EMAIL}`);
    console.log(`======================================================\n`);

    try {
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, email, fcm_token, updated_at')
            .eq('email', EMAIL)
            .single();

        if (userError || !user) {
            console.log(`❌ User not found:`, userError);
            process.exit(1);
        }

        console.log(`1️⃣ USERS TABLE:`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   fcm_token: ${user.fcm_token ? user.fcm_token : '❌ STILL NULL'}`);

        console.log(`\n2️⃣ PUSH_DEVICE_TOKENS TABLE:`);
        const { data: deviceTokens, error: dtError } = await supabaseAdmin
            .from('push_device_tokens')
            .select('*')
            .eq('user_id', user.id);

        if (dtError) {
            console.log(`   Error:`, dtError.message);
        } else if (!deviceTokens || deviceTokens.length === 0) {
            console.log(`   ❌ 0 rows in push_device_tokens`);
        } else {
            console.log(`   Found ${deviceTokens.length} record(s):`);
            deviceTokens.forEach(dt => console.log(`   - Token: ${dt.token} | Enabled: ${dt.enabled} | Last Seen: ${dt.last_seen_at}`));
        }

        console.log(`\n3️⃣ RECENT CHATS:`);
        const { data: chats } = await supabaseAdmin
            .from('chat_history')
            .select('created_at, sender, message')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(3);

        if (chats) {
            chats.forEach(c => console.log(`   [${c.created_at}] (${c.sender}): ${c.message}`));
        }

    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}

checkTokenNow();
