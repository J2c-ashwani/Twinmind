import express from 'express';
import Stripe from 'stripe';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * GET /api/subscription/status
 * Get current subscription status
 */
router.get('/status', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;

        const { data, error } = await supabaseAdmin
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        const subscription = data || {
            plan_type: 'free',
            status: 'active'
        };

        res.json({ subscription });

    } catch (error) {
        logger.error('Error fetching subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

/**
 * POST /api/subscription/create-checkout
 * Create Stripe checkout session
 */
router.post('/create-checkout', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { priceId, planType } = req.body; // 'monthly' or 'yearly'

        // Get user email
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('email')
            .eq('id', userId)
            .single();

        // Create Stripe checkout session
        const session = await stripe.checkout.sessions.create({
            customer_email: user.email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.WEB_APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.WEB_APP_URL}/subscription`,
            metadata: {
                userId: userId,
                planType: planType
            }
        });

        res.json({ url: session.url });

    } catch (error) {
        logger.error('Error creating checkout:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

/**
 * POST /api/subscription/webhook
 * Stripe webhook handler
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        const event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );

        // Handle different event types
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata.userId;

                // Update subscription in database
                await supabaseAdmin
                    .from('subscriptions')
                    .upsert({
                        user_id: userId,
                        plan_type: 'pro',
                        status: 'active',
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: session.subscription,
                        current_period_start: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                logger.info(`Subscription activated for user ${userId}`);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object;

                // Mark subscription as cancelled
                await supabaseAdmin
                    .from('subscriptions')
                    .update({
                        status: 'cancelled',
                        updated_at: new Date().toISOString()
                    })
                    .eq('stripe_subscription_id', subscription.id);

                logger.info(`Subscription cancelled: ${subscription.id}`);
                break;
            }

            // Handle other events...
        }

        res.json({ received: true });

    } catch (error) {
        logger.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook handler failed' });
    }
});

/**
 * POST /api/subscription/cancel
 * Cancel subscription
 */
router.post('/cancel', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;

        // Get subscription
        const { data: subscription } = await supabaseAdmin
            .from('subscriptions')
            .select('stripe_subscription_id')
            .eq('user_id', userId)
            .single();

        if (!subscription?.stripe_subscription_id) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        // Cancel in Stripe
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);

        // Update database
        await supabaseAdmin
            .from('subscriptions')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId);

        res.json({ success: true });

    } catch (error) {
        logger.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

export default router;
