'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, Download, ExternalLink, ShieldCheck, Smartphone, Sparkles } from 'lucide-react';

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
    const playStoreUrl =
        process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
        'https://play.google.com/store/apps/details?id=com.asmind.app';

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
    const openPlayStore = () => {
        window.location.href = playStoreUrl;
    };

    return (
        <div className="min-h-screen px-4 py-10">
            <div className="mx-auto max-w-5xl">
                <div className="mb-10 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
                    <div>
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200">
                            <Smartphone className="h-4 w-4" />
                            Subscriptions are handled by Google Play
                        </div>
                        <h1 className="mb-4 text-4xl font-bold leading-tight text-white md:text-6xl">
                            Subscribe from the Android app.
                        </h1>
                        <p className="max-w-2xl text-lg leading-8 text-gray-300">
                            For launch, Premium payments are processed through Google Play.
                            Web users can keep using TwinGenie for free, and can upgrade after installing the Android app.
                        </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur">
                        <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-950">
                                <Download className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="font-semibold text-white">Upgrade path for web users</p>
                                <p className="text-sm text-gray-400">Install the app, sign in, then subscribe with Google Play.</p>
                            </div>
                        </div>
                        <button
                            onClick={openPlayStore}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-gray-100"
                        >
                            Open Google Play
                            <ExternalLink className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Billing Toggle */}
                <div className="mb-10 flex justify-center">
                    <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.06] p-1">
                        <button
                            onClick={() => setIsYearly(false)}
                            className={`rounded-xl px-8 py-3 font-semibold transition-all ${!isYearly
                                ? 'bg-white text-slate-950'
                                : 'text-gray-300'
                                }`}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setIsYearly(true)}
                            className={`relative rounded-xl px-8 py-3 font-semibold transition-all ${isYearly
                                ? 'bg-white text-slate-950'
                                : 'text-gray-300'
                                }`}
                        >
                            Yearly
                            <span className="absolute -right-2 -top-2 rounded-full bg-emerald-500 px-2 py-1 text-xs text-white">
                                Save {pricing.yearly.savings}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Free Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl shadow-black/20"
                    >
                        <h3 className="text-2xl font-bold mb-2">Free</h3>
                        <p className="text-gray-400 mb-6">Start reflecting without adding payment details.</p>

                        <div className="mb-6">
                            <span className="text-5xl font-bold">{pricing.symbol}0</span>
                            <span className="text-gray-400">/forever</span>
                        </div>

                        <ul className="space-y-4 mb-8">
                            {[
                                'All 4 AI personality modes',
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
                        <button className="w-full rounded-xl bg-white/10 py-3 font-semibold text-gray-300 transition-colors hover:bg-white/20">
                            Current Plan
                        </button>
                    </motion.div>

                    {/* Premium Plan */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="relative overflow-hidden rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-slate-100 to-emerald-100 p-8 text-slate-950 shadow-2xl shadow-emerald-950/20"
                    >
                        <div className="absolute top-4 right-4">
                            <Sparkles className="h-6 w-6 text-emerald-700" />
                        </div>

                        <h3 className="text-2xl font-bold mb-2">Premium</h3>
                        <p className="mb-6 text-slate-600">Unlimited support, purchased through Google Play.</p>

                        <div className="mb-6">
                            <span className="text-5xl font-bold">{selectedPlan.display}</span>
                            <span className="text-slate-600">/{isYearly ? 'year' : 'month'}</span>
                            {!isYearly && (
                                <div className="mt-2 text-sm text-slate-600">
                                    Approx. ${pricing.monthly.usd.toFixed(2)} USD
                                </div>
                            )}
                        </div>

                        <ul className="space-y-4 mb-8">
                            {[
                                'Unlimited messages/day',
                                'All 4 AI personality modes',
                                'Voice messages',
                                'Priority response speed',
                                'Advanced insights',
                                'Proactive check-ins',
                                'Weekly reports',
                                'Priority support',
                            ].map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <Check className="w-5 h-5 text-emerald-700" />
                                    <span className={i === 0 ? 'font-bold' : ''}>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mb-6 rounded-xl border border-emerald-700/10 bg-emerald-700/10 p-4">
                            <p className="text-center text-sm text-emerald-950">
                                Use the same account on web after upgrading in the Android app.
                            </p>
                        </div>

                        <button
                            onClick={openPlayStore}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 py-3 font-semibold text-white transition-all hover:bg-slate-800"
                        >
                            Install Android App
                            <ExternalLink className="h-4 w-4" />
                        </button>

                        {isYearly && (
                            <p className="mt-4 text-center text-sm text-slate-600">
                                Save {pricing.yearly.savings} with yearly billing
                            </p>
                        )}
                    </motion.div>
                </div>

                {/* Features Comparison */}
                <div className="mt-10 flex flex-wrap items-center justify-center gap-5 text-sm text-gray-400">
                    <span className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Google Play billing
                    </span>
                    <span>Cancel anytime in Play Store</span>
                    <span>Detected region: {pricing.country}</span>
                </div>
            </div>
        </div>
    );
}
