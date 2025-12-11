import express from 'express';
import Stripe from 'stripe';
import { authenticateUser } from '../middleware/authMiddleware.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../config/logger.js';

const router = express.Router();
// Check if we should use Mock Mode (Missing key OR Explicit mock key)
const isMockMode = !process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('mock_');

const stripe = !isMockMode
    ? new Stripe(process.env.STRIPE_SECRET_KEY)
    : {
        checkout: {
            sessions: {
                create: async (params) => {
                    logger.info('💰 Mock Payment: Creating fake checkout session');
                    return {
                        url: `${process.env.WEB_APP_URL || 'http://localhost:3000'}/subscription/success?session_id=mock_session_${Date.now()}&mock=true`,
                        customer: 'cus_mock_123',
                        subscription: 'sub_mock_123'
                    };
                }
            }
        },
        webhooks: {
            constructEvent: (body) => {
                // Return a fake 'checkout.session.completed' event
                return {
                    type: 'checkout.session.completed',
                    data: {
                        object: {
                            customer: 'cus_mock_123',
                            subscription: 'sub_mock_123',
                            metadata: JSON.parse(body.toString()).metadata
                        }
                    }
                };
            }
        },
        subscriptions: {
            cancel: async () => { logger.info('💰 Mock Payment: Subscription cancelled'); return {}; }
        }
    };

if (isMockMode) {
    logger.warn('⚠️ Stripe running in MOCK MODE. Payments will be simulated.');
}

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

        // ---------------------------------------------------------
        // MOCK MODE: Auto-upgrade immediately (since no webhook will come)
        // ---------------------------------------------------------
        if (isMockMode) {
            logger.info(`💰 Mock/Dev: Auto-upgrading user ${userId} to PRO`);
            await supabaseAdmin
                .from('subscriptions')
                .upsert({
                    user_id: userId,
                    plan_type: 'pro',
                    status: 'active',
                    stripe_customer_id: 'cus_mock_' + userId,
                    stripe_subscription_id: 'sub_mock_' + Date.now(),
                    current_period_start: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
        }
        // ---------------------------------------------------------

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
