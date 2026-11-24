'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react'
import { useUserStore } from '@/store/useStore'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { flushPendingAttribution } from '@/lib/attribution'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'
import { BrandEmblem } from '@/components/Layout/BrandMark'

export default function LoginPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const { setUser } = useUserStore()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            })

            if (signInError) throw signInError

            if (data.user) {
                if (data.session?.access_token) {
                    await flushPendingAttribution({
                        accessToken: data.session.access_token,
                        userId: data.user.id,
                        email: data.user.email,
                        fullName: data.user.user_metadata?.full_name,
                        userMetadata: data.user.user_metadata,
                    })
                }

                setUser({
                    id: data.user.id,
                    email: data.user.email || '',
                    name: data.user.user_metadata?.full_name,
                    is_pro: false,
                })

                router.refresh()

                const { data: profile, error: profileError } = await supabase
                    .from('personality_profiles')
                    .select('user_id')
                    .eq('user_id', data.user.id)
                    .single()

                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Error checking profile:', profileError)
                }

                if (profile) {
                    router.push('/chat')
                } else {
                    router.push('/onboarding')
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign in')
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
                                Sign in to TwinGenie
                            </h1>
                            <p className="mt-1.5 text-sm text-neutral-400">
                                Access your calibrated psychometric workspace
                            </p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            {error && (
                                <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-neutral-300">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@domain.com"
                                        required
                                        className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-medium text-neutral-300">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                        className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="btn-primary-ivory mt-2 w-full py-3 text-sm disabled:opacity-50"
                            >
                                {loading ? (
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#07080B]/30 border-t-[#07080B]" />
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-xs text-neutral-400">
                            New to TwinGenie?{' '}
                            <Link href="/onboarding" className="font-medium text-[#E7C891] hover:underline">
                                Complete the 35-question calibration
                            </Link>
                        </p>
                    </div>
                </motion.div>
            </main>

            <SiteFooter />
        </div>
    )
}
