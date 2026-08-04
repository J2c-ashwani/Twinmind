import { supabaseAdmin } from './src/config/supabase.js';
import reminderService from './src/services/reminderService.js';
import dotenv from 'dotenv';
dotenv.config();

const USER_ID = 'da55e47a-a913-4d5c-b83b-ef135db4505b';
const TEST_TOKEN = 'TEST_FCM_TOKEN_EXPERIMENT_' + Date.now();

async function testBackendTokenUpdate() {
    console.log(`\n======================================================`);
    console.log(`🧪 TESTING BACKEND TOKEN UPDATE FUNCTION FOR USER`);
    console.log(`User ID: ${USER_ID}`);
    console.log(`Test Token: ${TEST_TOKEN}`);
    console.log(`======================================================\n`);

    try {
        console.log(`1️⃣ Invoking reminderService.updateDeviceToken()...`);
        await reminderService.updateDeviceToken(USER_ID, TEST_TOKEN);
        console.log(`✅ Function executed without throwing errors.`);

        console.log(`\n2️⃣ Querying Supabase 'users' table to read back fcm_token...`);
        const { data: user, error: userError } = await supabaseAdmin
            .from('users')
            .select('id, email, fcm_token')
            .eq('id', USER_ID)
            .single();

        if (userError) {
            console.log(`❌ Error reading back from 'users':`, userError);
        } else {
            console.log(`   Read back fcm_token: ${user.fcm_token}`);
            if (user.fcm_token === TEST_TOKEN) {
                console.log(`   ✅ SUCCESS: 'users.fcm_token' updated correctly in Supabase!`);
            } else {
                console.log(`   ❌ MISMATCH: Token in 'users' table is not equal to test token.`);
            }
        }

        console.log(`\n3️⃣ Querying Supabase 'push_device_tokens' table...`);
        const { data: deviceTokens, error: dtError } = await supabaseAdmin
            .from('push_device_tokens')
            .select('*')
            .eq('user_id', USER_ID);

        if (dtError) {
            console.log(`⚠️ Warning querying 'push_device_tokens':`, dtError.message);
        } else {
            console.log(`   Found ${deviceTokens.length} device token record(s):`);
            deviceTokens.forEach(dt => console.log(`   - Token: ${dt.token} | Enabled: ${dt.enabled}`));
        }

        console.log(`\n4️⃣ Cleaning up test token...`);
        await supabaseAdmin.from('users').update({ fcm_token: null }).eq('id', USER_ID);
        await supabaseAdmin.from('push_device_tokens').delete().eq('user_id', USER_ID).eq('token', TEST_TOKEN);
        console.log(`✅ Cleanup complete.`);

    } catch (e) {
        console.error('❌ Test failed with exception:', e);
    }
    process.exit(0);
}

testBackendTokenUpdate();
