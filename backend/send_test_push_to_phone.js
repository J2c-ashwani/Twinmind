import { sendPushNotification } from './src/services/pushNotificationService.js';
import dotenv from 'dotenv';
dotenv.config();

const USER_ID = 'da55e47a-a913-4d5c-b83b-ef135db4505b';

async function sendTestPush() {
    console.log(`\n======================================================`);
    console.log(`🚀 SENDING LIVE TEST PUSH NOTIFICATION TO PHONE`);
    console.log(`User ID: ${USER_ID}`);
    console.log(`======================================================\n`);

    try {
        const success = await sendPushNotification(
            USER_ID,
            '🎉 TwinGenie Push Verification',
            'Your push notification pipeline is 100% operational!',
            { type: 'test_notification' }
        );

        if (success) {
            console.log(`\n✅ PUSH DELIVERED TO FIREBASE MULTICAST SENDER SUCCESSFULLY!`);
            console.log(`   Check your phone's notification bar right now!`);
        } else {
            console.log(`\n❌ Push send returned false.`);
        }

    } catch (e) {
        console.error('Error sending test push:', e);
    }
    process.exit(0);
}

sendTestPush();
