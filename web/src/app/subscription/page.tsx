'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';

interface Pricing {
    country: string;
    currency: string;
    symbol: string;
    monthly: {
        amount: number;
        display: string;
        usd: number;
    };
    yearly: {
        amount: number;
        display: string;
        usd: number;
        savings: string;
    };
}

export default function GeoPricingPage() {
    // Fallback pricing in case API fails
    const fallbackPricing: Pricing = {
        country: 'India',
        currency: 'INR',
        symbol: '₹',
        monthly: {
            amount: 499,
            display: '₹499',
            usd: 5.99
        },
        yearly: {
            amount: 3999,
            display: '₹3,999',
            usd: 47.88,
            savings: '33%'
        }
    };

    const [pricing, setPricing] = useState<Pricing>(fallbackPricing);
    const [isYearly, setIsYearly] = useState(true);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPricing();
    }, []);

    const fetchPricing = async () => {
        try {
            const res = await fetch('/api/pricing');
            if (res.ok) {
                const data = await res.json();
                if (data.pricing) {
                    setPricing(data.pricing);
                }
            }
        } catch (error) {
            console.error('Failed to fetch pricing, using fallback:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
            </div>
        );
    }

    const selectedPlan = isYearly ? pricing.yearly : pricing.monthly;

    return (
        <div className="min-h-screen py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold mb-4 gradient-text">
                        Choose Your Plan
                    </h1>
                    <p className="text-xl text-gray-300">
                        Pricing optimized for your region
                    </p>
                    <p className="text-sm text-gray-400 mt-2">
                        📍 Detected location: {pricing.country}
                    </p>
                </div>

                {/* Billing Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="glass-card p-1 inline-flex">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`px-8 py-3 rounded-full font-semibold transition-all ${!isYearly
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'text-gray-300'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`px-8 py-3 rounded-full font-semibold transition-all relative ${isYearly
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'text-gray-300'
                                }`}
                        >
                            Yearly
                            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                                Save {pricing.yearly.savings}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Free Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-8"
                    >
                        <h3 className="text-2xl font-bold mb-2">Free</h3>
                        <p className="text-gray-400 mb-6">Get started with basics</p>

                        <div className="mb-6">
                            <span className="text-5xl font-bold">{pricing.symbol}0</span>
                            <span className="text-gray-400">/forever</span>
                        </div>

                        <ul className="space-y-4 mb-8">
                            {[
                                '✨ All 4 AI personality modes',
                                '10 messages per day',
                                'Daily challenges',
                                'Mood tracking',
                                'Memory timeline',
                                'Achievements & streaks',
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-green-400" />
                                    <span className={i === 0 ? 'font-semibold' : 'text-gray-300'}>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <p className="text-sm text-gray-400 mb-6 text-center">
                            Try all features with daily limit
                        </p>
                        <button className="w-full py-3 bg-white/10 text-gray-300 rounded-xl font-semibold hover:bg-white/20 transition-colors">
                            Current Plan
                        </button>
                    </motion.div>

                    {/* Premium Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl shadow-2xl p-8 text-white relative overflow-hidden"
                    >
                        <div className="absolute top-4 right-4">
                            <Sparkles className="w-6 h-6" />
                        </div>

                        <h3 className="text-2xl font-bold mb-2">Premium</h3>
                        <p className="text-purple-100 mb-6">Unlock full potential</p>

                        <div className="mb-6">
                            <span className="text-5xl font-bold">{selectedPlan.display}</span>
                            <span className="text-purple-100">/{isYearly ? 'year' : 'month'}</span>
                            {!isYearly && (
                                <div className="text-sm text-purple-100 mt-2">
                                    ≈ ${pricing.monthly.usd.toFixed(2)} USD
                                </div>
                            )}
                        </div>

                        <ul className="space-y-4 mb-8">
                            {[
                                '🚀 Unlimited messages/day',
                                '✨ All 4 AI personality modes',
                                '🎤 Voice messages',
                                '⚡ Priority response speed',
                                '📊 Advanced insights',
                                '💜 Proactive check-ins',
                                '📈 Weekly reports',
                                '🎯 Priority support',
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-white" />
                                    <span className={i === 0 ? 'font-bold' : ''}>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="bg-white/10 rounded-xl p-4 mb-6">
                            <p className="text-sm text-white text-center">
                                Same AI modes you tried in Free - just unlimited! 🎉
                            </p>
                        </div>

                        <button
                            onClick={() => alert('Payment integration with Stripe/Razorpay coming soon! For now, this is a demo.')}
                            className="w-full py-3 bg-white text-purple-600 rounded-xl font-semibold hover:shadow-lg transition-all"
                        >
                            Upgrade to Premium
                        </button>

                        {isYearly && (
                            <p className="text-center text-sm text-purple-100 mt-4">
                                🎉 You save {pricing.yearly.savings} with yearly billing
                            </p>
                        )}
                    </motion.div>
                </div>

                {/* Features Comparison */}
                <div className="mt-12 text-center text-gray-400">
                    <p className="text-sm">
                        💳 Secure payment • 🔒 Cancel anytime • 💯 30-day money-back guarantee
                    </p>
                </div>
            </div>
        </div>
    );
}
