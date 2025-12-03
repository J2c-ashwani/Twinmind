// Web Push Notifications Service

class NotificationService {
    private registration: ServiceWorkerRegistration | null = null;

    async initialize() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported');
            return false;
        }

        try {
            // Register service worker
            this.registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker registered');
            return true;
        } catch (error) {
            console.error('Service Worker registration failed:', error);
            return false;
        }
    }

    async requestPermission(): Promise<boolean> {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    async subscribeToPush(): Promise<PushSubscription | null> {
        if (!this.registration) {
            await this.initialize();
        }

        if (!this.registration) return null;

        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
                ) as unknown as BufferSource,
            });

            // Send subscription to backend
            await fetch('/api/notifications/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription),
            });

            return subscription;
        } catch (error) {
            console.error('Push subscription failed:', error);
            return null;
        }
    }

    async showNotification(title: string, options?: NotificationOptions) {
        if (!this.registration) return;

        await this.registration.showNotification(title, {
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            ...options,
        });
    }

    // Helper to convert VAPID key
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
}

export const notificationService = new NotificationService();

// Notification types
export const NotificationTypes = {
    PROACTIVE_MESSAGE: 'proactive_message',
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked',
    STREAK_REMINDER: 'streak_reminder',
    DAILY_CHALLENGE: 'daily_challenge',
    MEMORY_ANNIVERSARY: 'memory_anniversary',
};

// Helper to show different notification types
export const showNotification = async (
    type: string,
    data: any
) => {
    const notifications = {
        [NotificationTypes.PROACTIVE_MESSAGE]: {
            title: 'Message from your Twin',
            body: data.message,
            icon: '/twin-icon.png',
        },
        [NotificationTypes.ACHIEVEMENT_UNLOCKED]: {
            title: '🏆 Achievement Unlocked!',
            body: `You earned: ${data.name}`,
            icon: '/achievement-icon.png',
        },
        [NotificationTypes.STREAK_REMINDER]: {
            title: '🔥 Don\'t break your streak!',
            body: `You have a ${data.streak} day streak. Check in today!`,
            icon: '/streak-icon.png',
        },
        [NotificationTypes.DAILY_CHALLENGE]: {
            title: '✨ New Daily Challenges',
            body: 'Your daily challenges are ready!',
            icon: '/challenge-icon.png',
        },
        [NotificationTypes.MEMORY_ANNIVERSARY]: {
            title: '💙 Memory Anniversary',
            body: `Remember this? ${data.title}`,
            icon: '/memory-icon.png',
        },
    };

    const config = notifications[type];
    if (config) {
        await notificationService.showNotification(config.title, {
            body: config.body,
            icon: config.icon,
            data: data,
            tag: type,
        });
    }
};
