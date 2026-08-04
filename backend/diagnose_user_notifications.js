import { supabaseAdmin } from './src/config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const EMAIL = 'join2campus@gmail.com';

async function diagnoseUser() {
    console.log(`\n======================================================`);
    console.log(`🔍 EMPIRICAL AUDIT FOR USER: ${EMAIL}`);
    console.log(`======================================================\n`);

    try {
        // 1. Fetch User Record from `users` table
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('email', EMAIL)
            .single();

        if (userError || !user) {
            console.log(`❌ User matching ${EMAIL} NOT FOUND in 'users' table.`);
            console.log(`Error:`, userError);
            process.exit(1);
        }

        const userId = user.id;
        console.log(`✅ STEP 1: USER ACCOUNT FOUND`);
        console.log(`   User ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Created At: ${user.created_at}`);
        console.log(`   fcm_token in 'users' table: ${user.fcm_token ? 'YES (' + user.fcm_token.substring(0, 20) + '...)' : '❌ NULL / EMPTY'}`);
        console.log(`   Web Push Subscription: ${user.web_push_subscription ? 'YES' : 'NONE'}`);

        // 2. Fetch Multi-device FCM Tokens from `push_device_tokens` table
        console.log(`\n------------------------------------------------------`);
        console.log(`📱 STEP 2: CHECKING 'push_device_tokens' TABLE`);
        console.log(`------------------------------------------------------`);
        const { data: deviceTokens, error: dtError } = await supabaseAdmin
            .from('push_device_tokens')
            .select('*')
            .eq('user_id', userId);

        if (dtError) {
            console.log(`⚠️ Failed to query 'push_device_tokens' table:`, dtError.message);
        } else if (!deviceTokens || deviceTokens.length === 0) {
            console.log(`❌ NO ENTRIES in 'push_device_tokens' table for user ${userId}`);
        } else {
            console.log(`Found ${deviceTokens.length} device token(s):`);
            deviceTokens.forEach((dt, idx) => {
                console.log(`   [${idx + 1}] Platform: ${dt.platform} | Enabled: ${dt.enabled} | Token: ${dt.token?.substring(0, 20)}... | Last Seen: ${dt.last_seen_at}`);
            });
        }

        // 3. Fetch Recent Chat History
        console.log(`\n------------------------------------------------------`);
        console.log(`💬 STEP 3: CHECKING 'chat_history' TABLE (Activity Check)`);
        console.log(`------------------------------------------------------`);
        const { data: chats, error: chatError } = await supabaseAdmin
            .from('chat_history')
            .select('created_at, sender, message')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (chatError) {
            console.log(`⚠️ Failed to query 'chat_history':`, chatError.message);
        } else if (!chats || chats.length === 0) {
            console.log(`❌ NO CHAT HISTORY found for user ${userId}`);
        } else {
            console.log(`Found ${chats.length} recent message(s):`);
            chats.forEach((c) => {
                console.log(`   [${c.created_at}] (${c.sender}): ${c.message?.substring(0, 60)}...`);
            });
        }

        // 4. Fetch User Activity Pattern
        console.log(`\n------------------------------------------------------`);
        console.log(`📊 STEP 4: CHECKING 'user_activity_patterns' TABLE`);
        console.log(`------------------------------------------------------`);
        const { data: pattern, error: patternError } = await supabaseAdmin
            .from('user_activity_patterns')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (patternError) {
            console.log(`⚠️ Error querying 'user_activity_patterns':`, patternError.message);
        } else if (!pattern) {
            console.log(`❌ NO ROW in 'user_activity_patterns' for user ${userId}`);
        } else {
            console.log(`   Last Activity: ${pattern.last_activity}`);
            console.log(`   Typical Wakeup: ${pattern.typical_wakeup_time} | Bedtime: ${pattern.typical_bedtime}`);
        }

        // 5. Fetch In-App Notifications
        console.log(`\n------------------------------------------------------`);
        console.log(`🔔 STEP 5: CHECKING 'notifications' TABLE (In-App Records)`);
        console.log(`------------------------------------------------------`);
        const { data: notifications, error: notifError } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (notifError) {
            console.log(`⚠️ Failed to query 'notifications':`, notifError.message);
        } else if (!notifications || notifications.length === 0) {
            console.log(`❌ NO NOTIFICATIONS found in database for user ${userId}`);
        } else {
            console.log(`Found ${notifications.length} notification record(s):`);
            notifications.forEach((n) => {
                console.log(`   [${n.created_at}] Type: ${n.type} | Read: ${n.is_read} | Title: ${n.title} | Body: ${n.body}`);
            });
        }

        // 6. Fetch Proactive Messages
        console.log(`\n------------------------------------------------------`);
        console.log(`🤖 STEP 6: CHECKING 'proactive_messages' TABLE`);
        console.log(`------------------------------------------------------`);
        const { data: proactive, error: proError } = await supabaseAdmin
            .from('proactive_messages')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (proError) {
            console.log(`⚠️ Failed to query 'proactive_messages':`, proError.message);
        } else if (!proactive || proactive.length === 0) {
            console.log(`❌ NO PROACTIVE MESSAGES found in database for user ${userId}`);
        } else {
            console.log(`Found ${proactive.length} proactive message record(s):`);
            proactive.forEach((p) => {
                console.log(`   [${p.created_at}] Trigger: ${p.trigger_type} | Scheduled: ${p.scheduled_for} | Sent At: ${p.sent_at} | Content: ${p.message_content}`);
            });
        }

        console.log(`\n======================================================\n`);

    } catch (e) {
        console.error('Fatal error during diagnostic run:', e);
    }
    process.exit(0);
}

diagnoseUser();
