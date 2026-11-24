'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { motion } from 'framer-motion'
import { Lock, Mail, User } from 'lucide-react'
import {
    captureAttributionFromLocation,
    clearPendingAttribution,
    getPendingAttribution,
} from '@/lib/attribution'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'
import { BrandEmblem } from '@/components/Layout/BrandMark'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [infoMessage, setInfoMessage] = useState('')
    const [referralCode, setReferralCode] = useState('')
    const router = useRouter()
    const supabase = createClientComponentClient()

    useEffect(() => {
        const captured = captureAttributionFromLocation()
        if (captured.referralCode) {
            setReferralCode(captured.referralCode)
        }
    }, [])

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setInfoMessage('')

        const attribution = getPendingAttribution()
        const activeRef = (referralCode || attribution.referralCode || '').trim().toUpperCase() || undefined

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        ...(activeRef ? { referral_code: activeRef } : {}),
                        ...(Object.keys(attribution).length > 0 ? { attribution } : {}),
                    },
                },
            })

            if (signUpError) throw signUpError

            if (data.user && data.session?.access_token) {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${data.session.access_token}`,
                    },
                    body: JSON.stringify({
                        userId: data.user.id,
                        email: data.user.email,
                        fullName: fullName,
                        referralCode: activeRef,
                        attribution,
                    }),
                })

                if (response.ok) {
                    clearPendingAttribution()
                } else {
                    console.warn('Backend signup setup returned non-200; deferred attribution preserved for next login')
                }

                router.refresh()
                router.push('/onboarding')
            } else if (data.user) {
                setInfoMessage(
                    'Check your email to confirm your account, then sign in. Your invite code and onboarding progress are preserved.'
                )
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign up')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
            <SiteHeader minimal />

            <main className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-grid-architectural opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative z-10 w-full max-w-md"
                >
                    <div className="enterprise-panel p-8">
                        <div className="mb-8 text-center">
                            <div className="mb-4 flex justify-center">
                                <BrandEmblem size="lg" />
                            </div>
                            <h1 className="text-2xl font-semibold tracking-tight text-[#F4F2EC]">
                                Create your TwinGenie account
                            </h1>
                            <p className="mt-1.5 text-sm text-neutral-400">
                                Proceed directly to your 35-question twin calibration
                            </p>
                        </div>

                        <form onSubmit={handleSignup} className="space-y-4">
                            {referralCode && (
                                <div className="rounded-xl border border-[#D9A760]/30 bg-[#D9A760]/10 px-4 py-2.5 text-xs text-[#E7C891]">
                                    Invite code applied: <strong className="font-mono">{referralCode}</strong>
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-neutral-300">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                        placeholder="Jane Doe"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-neutral-300">
                                    Email
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                        placeholder="you@domain.com"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1.5 block text-xs font-medium text-neutral-300">
                                    Password
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                        placeholder="Minimum 6 characters"
                                        minLength={6}
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">
                                    {error}
                                </div>
                            )}

                            {infoMessage && (
                                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                                    {infoMessage}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary-ivory mt-2 w-full py-3.5 text-sm disabled:opacity-50"
                            >
                                {loading ? 'Creating account...' : 'Continue to 35-Trait Assessment'}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-xs text-neutral-400">
                            Already have an account?{' '}
                            <Link href="/login" className="font-medium text-[#E7C891] hover:underline">
                                Sign in
                            </Link>
                        </p>

                        <p className="mt-4 text-center text-[11px] text-neutral-500">
                            By signing up, you agree to our{' '}
                            <Link href="/terms" className="text-neutral-300 hover:underline">
                                Terms
                            </Link>{' '}
                            and{' '}
                            <Link href="/privacy" className="text-neutral-300 hover:underline">
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </div>
                </motion.div>
            </main>

            <SiteFooter />
        </div>
    )
}
