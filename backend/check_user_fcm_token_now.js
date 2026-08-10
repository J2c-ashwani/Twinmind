import { createClient } from '@supabase/supabase-js';
import firebaseAdmin from './src/config/firebase.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://lhwtfjgtripwikxwookp.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod3Rmamd0cmlwd2lreHdvb2twIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYwNTQ0NiwiZXhwIjoyMDgwMTgxNDQ2fQ.hN8Zk_lM2J1mS0l_-Xn7rGZ9hC8x1A9N7d8K4h1W4h8'
);

async function checkAndSend() {
    console.log('Querying Supabase push_device_tokens table for latest active token...');
    const { data, error } = await supabase
        .from('push_device_tokens')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Error fetching tokens:', error);
        process.exit(1);
    }

    console.log('Raw DB Records:', JSON.stringify(data, null, 2));

    for (const record of data) {
        const tokenVal = record.fcm_token || record.device_token || record.token;
        if (!tokenVal) continue;

        console.log(`\nAttempting to send push to token: ${tokenVal.substring(0, 30)}...`);

        const message = {
            token: tokenVal,
            notification: {
                title: '✨ TwinGenie Update Test',
                body: 'Testing live notification with updated TwinGenie brain icon!'
            },
            android: {
                priority: 'high',
                notification: {
                    channelId: 'twingenie_channel_v1',
                    icon: 'ic_notification',
                    color: '#9333EA'
                }
            }
        };

        try {
            const response = await firebaseAdmin.messaging().send(message);
            console.log(`✅ LIVE CLOUD PUSH DELIVERED! Message ID: ${response}`);
            break; // Stop after first successful send
        } catch (e) {
            console.error(`❌ Token failed (${e.code || e.message}): trying next token...`);
        }
    }
    process.exit(0);
}

checkAndSend();
