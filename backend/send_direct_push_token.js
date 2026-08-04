import firebaseAdmin from './src/config/firebase.js';
import dotenv from 'dotenv';
dotenv.config();

const TOKEN = 'fVTlWYL5Sle8NWvgDIVLvS:APA91bGLhC3Ypctl7EfIXKQxQ3L7jEZ9Vb5GxS2XSxzH3kG2RXQyJsDX1un3wYpRbHsg11BKYwT15jn4DcYIXERxqcjO0XegpeSuiOZuxz6avH040nSaJro';

async function sendDirect() {
    console.log(`Sending remote cloud FCM push notification...`);
    const message = {
        token: TOKEN,
        notification: {
            title: '✨ TwinGenie Remote Cloud Notification',
            body: 'Delivered over Wi-Fi / Mobile Data anywhere in the world!'
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
        console.log(`\n✅ CLOUD PUSH DELIVERED! Message ID: ${response}`);
    } catch (e) {
        console.error('❌ Error sending FCM push:', e);
    }
    process.exit(0);
}

sendDirect();
