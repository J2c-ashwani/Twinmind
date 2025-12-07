/**
 * Analytics Service
 * Placeholder for PostHog/Mixpanel integration
 */

type EventName =
    | 'page_view'
    | 'signup'
    | 'login'
    | 'message_sent'
    | 'voice_message_sent'
    | 'program_started'
    | 'session_completed'
    | 'insight_viewed';

class AnalyticsService {
    private initialized = false;

    init() {
        if (this.initialized) return;

        // Initialize PostHog/Mixpanel here
        // if (process.env.NEXT_PUBLIC_ANALYTICS_KEY) { ... }

        console.log('Analytics initialized (Dev Mode)');
        this.initialized = true;
    }

    track(event: EventName, properties?: Record<string, any>) {
        if (!this.initialized) this.init();

        // Send to analytics provider
        if (process.env.NODE_ENV === 'production') {
            // posthog.capture(event, properties);
        } else {
            console.log(`[Analytics] ${event}`, properties);
        }
    }

    identify(userId: string, traits?: Record<string, any>) {
        if (!this.initialized) this.init();

        if (process.env.NODE_ENV === 'production') {
            // posthog.identify(userId, traits);
        } else {
            console.log(`[Analytics] Identify: ${userId}`, traits);
        }
    }
}

export const analytics = new AnalyticsService();
