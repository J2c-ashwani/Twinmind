import { createClient } from '@supabase/supabase-js';
import firebaseAdmin from './src/config/firebase.js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://lhwtfjgtripwikxwookp.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxod3Rmamd0cmlwd2lreHdvb2twIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDYwNTQ0NiwiZXhwIjoyMDgwMTgxNDQ2fQ.hN8Zk_lM2J1mS0l_-Xn7rGZ9hC8x1A9N7d8K4h1W4h8'
);

async function sendDirect() {
    console.log('Fetching latest active FCM device token from Supabase...');
    
    const { data, error } = await supabase
        .from('push_device_tokens')
        .select('*')
        .eq('enabled', true)
        .order('updated_at', { ascending: false })
        .limit(1);

    if (error || !data || data.length === 0) {
        console.error('❌ No active FCM token found in Supabase:', error);
        process.exit(1);
    }

    const latestToken = data[0].token;
    console.log(`Sending remote cloud FCM push to token: ${latestToken.substring(0, 30)}...`);

    const message = {
        token: latestToken,
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
        console.log(`\n✅ LIVE CLOUD PUSH DELIVERED! Message ID: ${response}`);
    } catch (e) {
        console.error('❌ Error sending FCM push:', e.message || e);
    }
    process.exit(0);
}

sendDirect();
