'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Check, Download, ExternalLink, ShieldCheck, Smartphone, ArrowRight } from 'lucide-react'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'

interface Pricing {
    country: string
    currency: string
    symbol: string
    monthly: {
        amount: number
        display: string
        usd: number
    }
    yearly: {
        amount: number
        display: string
        usd: number
        savings: string
    }
}

export default function GeoPricingPage() {
    const playStoreUrl =
        process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
        'https://play.google.com/store/apps/details?id=com.asmind.app'

    const fallbackPricing: Pricing = {
        country: 'Global',
        currency: 'USD',
        symbol: '$',
        monthly: {
            amount: 5.99,
            display: '$5.99',
            usd: 5.99,
        },
        yearly: {
            amount: 47.88,
            display: '$47.88',
            usd: 47.88,
            savings: '33%',
        },
    }

    const [pricing, setPricing] = useState<Pricing>(fallbackPricing)
    const [isYearly, setIsYearly] = useState(true)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPricing()
    }, [])

    const fetchPricing = async () => {
        try {
            const res = await fetch('/api/pricing')
            if (res.ok) {
                const data = await res.json()
                if (data.pricing) {
                    setPricing(data.pricing)
                }
            }
        } catch (error) {
            console.error('Failed to fetch pricing, using fallback:', error)
        } finally {
            setLoading(false)
        }
    }

    const selectedPlan = isYearly ? pricing.yearly : pricing.monthly

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
            <SiteHeader />

            <main className="flex-1 px-4 py-14 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-5xl">
                    <div className="mb-12 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider text-emerald-300">
                                <Smartphone className="h-3.5 w-3.5" />
                                Google Play Billing • Cross-Platform Sync
                            </div>
                            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#F4F2EC] sm:text-5xl">
                                Plans aligned for{' '}
                                <span className="font-serif italic text-[#E7C891]">daily clarity.</span>
                            </h1>
                            <p className="mt-4 max-w-2xl text-base leading-relaxed text-neutral-400">
                                Begin your 35-trait psychometric calibration free on Web or Android. Launch
                                subscriptions are processed exclusively through Google Play Billing and unlock
                                unlimited access everywhere you sign in.
                            </p>
                        </div>

                        <div className="enterprise-panel p-6">
                            <div className="flex items-center gap-3.5">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#E7C891]">
                                    <Download className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">Seamless Cross-Device Entitlement</p>
                                    <p className="text-xs text-neutral-400">
                                        Subscribe in the Android app; sign in on twingenie.app with the same account.
                                    </p>
                                </div>
                            </div>
                            <a
                                href={playStoreUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary-ivory mt-5 w-full py-2.5 text-xs"
                            >
                                <span>Open Google Play Store</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>
                    </div>

                    {/* Billing Toggle */}
                    <div className="mb-10 flex justify-center">
                        <div className="inline-flex items-center rounded-xl border border-white/[0.08] bg-[#0D1016] p-1">
                            <button
                                type="button"
                                onClick={() => setIsYearly(false)}
                                className={`rounded-lg px-6 py-2.5 text-xs font-semibold transition-all ${
                                    !isYearly ? 'bg-[#F4F2EC] text-[#07080B]' : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                Monthly
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsYearly(true)}
                                className={`inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-xs font-semibold transition-all ${
                                    isYearly ? 'bg-[#F4F2EC] text-[#07080B]' : 'text-neutral-400 hover:text-white'
                                }`}
                            >
                                <span>Yearly</span>
                                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700">
                                    Save {pricing.yearly.savings}
                                </span>
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="enterprise-panel h-96 animate-pulse p-8" />
                            <div className="enterprise-panel h-96 animate-pulse p-8" />
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                            {/* Free Plan */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="enterprise-panel flex flex-col justify-between p-8"
                            >
                                <div>
                                    <div className="font-mono text-xs uppercase tracking-wider text-neutral-400">
                                        Starter Tier
                                    </div>
                                    <h2 className="mt-2 text-2xl font-semibold text-[#F4F2EC]">Free Companion</h2>
                                    <p className="mt-2 text-sm text-neutral-400">
                                        Calibrate your 35-trait digital twin with zero payment details required.
                                    </p>

                                    <div className="mt-6 flex items-baseline gap-1.5">
                                        <span className="text-4xl font-semibold text-white">{pricing.symbol}0</span>
                                        <span className="text-sm text-neutral-500">/ forever</span>
                                    </div>

                                    <ul className="mt-8 space-y-3 text-sm text-neutral-300">
                                        {[
                                            'Full 35-Question Personality Assessment',
                                            'All 4 AI personality modes',
                                            '10 text messages & 3 voice messages / day',
                                            'Daily challenges & mood tracking',
                                            'Memory timeline & streaks',
                                        ].map((feature, i) => (
                                            <li key={i} className="flex items-center gap-3 text-xs sm:text-sm">
                                                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                                                <span className={i === 0 ? 'font-medium text-white' : ''}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <Link href="/onboarding" className="btn-secondary-obsidian mt-8 w-full py-3.5 text-sm">
                                    <span>Start Free 35-Question Assessment</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </motion.div>

                            {/* Premium Plan */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.06 }}
                                className="enterprise-panel relative flex flex-col justify-between border-[#D9A760]/45 bg-[#10131C] p-8 shadow-[0_0_60px_-24px_rgba(217,167,96,0.28)]"
                            >
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs uppercase tracking-wider text-[#E7C891]">
                                            Pro Companion
                                        </span>
                                        <span className="rounded-full border border-[#D9A760]/40 bg-[#D9A760]/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#E7C891]">
                                            Full Access
                                        </span>
                                    </div>
                                    <h2 className="mt-2 text-2xl font-semibold text-[#F4F2EC]">Unlimited Growth</h2>
                                    <p className="mt-2 text-sm text-neutral-400">
                                        Unlimited messages, infinite vector recall, and all guided coach sprints.
                                    </p>

                                    <div className="mt-6">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-4xl font-semibold text-white">
                                                {selectedPlan.display}
                                            </span>
                                            <span className="text-sm text-neutral-400">
                                                /{isYearly ? 'year' : 'month'}
                                            </span>
                                        </div>
                                        {!isYearly && (
                                            <div className="mt-1 font-mono text-xs text-neutral-500">
                                                Approx. ${pricing.monthly.usd.toFixed(2)} USD
                                            </div>
                                        )}
                                    </div>

                                    <ul className="mt-8 space-y-3 text-sm text-neutral-200">
                                        {[
                                            'Unlimited text & voice reflections',
                                            'All 4 calibrated cognitive perspectives',
                                            'Unbounded semantic vector memory',
                                            'All Multi-Day Life Coach tracks',
                                            'Cognitive insights & proactive check-ins',
                                            'Priority model latency & support',
                                        ].map((feature, i) => (
                                            <li key={i} className="flex items-center gap-3 text-xs sm:text-sm">
                                                <Check className="h-4 w-4 shrink-0 text-[#D9A760]" />
                                                <span className={i === 0 ? 'font-semibold text-white' : ''}>
                                                    {feature}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <a
                                    href={playStoreUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary-ivory mt-8 w-full py-3.5 text-sm"
                                >
                                    <span>Install Android App to Upgrade</span>
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </motion.div>
                        </div>
                    )}

                    <div className="mt-10 flex flex-wrap items-center justify-center gap-6 font-mono text-[11px] text-neutral-500">
                        <span className="inline-flex items-center gap-1.5 text-neutral-300">
                            <ShieldCheck className="h-4 w-4 text-emerald-400" />
                            Verified Google Play Billing
                        </span>
                        <span>Cancel anytime inside Google Play</span>
                        <span>Region: {pricing.country}</span>
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    )
}
