'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database, Shield, Mail, CheckCircle2, AlertTriangle, LogIn } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'

const DATA_OPTIONS = [
    {
        id: 'chat',
        label: 'Conversations & Chat History',
        description: 'All conversation threads, chat messages, summaries, and topic caches.',
    },
    {
        id: 'memories',
        label: 'Saved Memories & Vector Embeddings',
        description: 'Timeline memories, life context notes, and 1536-dim semantic embeddings.',
    },
    {
        id: 'voice',
        label: 'Voice Recordings',
        description: 'All stored voice audio files in your private TwinGenie storage.',
    },
    {
        id: 'personality',
        label: '35-Trait Assessment & Twin Profile',
        description: 'Questionnaire responses, computed Big Five traits, and Twin summary.',
    },
    {
        id: 'insights',
        label: 'Emotional Metrics & Insights History',
        description: 'Mood scores, emotional trend logs, and personal tracking events.',
    },
]

export default function DataDeletionView() {
    const supabase = createClientComponentClient()

    const [checkingSession, setCheckingSession] = useState(true)
    const [sessionEmail, setSessionEmail] = useState<string | null>(null)

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [signingIn, setSigningIn] = useState(false)

    const [selected, setSelected] = useState<string[]>(['chat', 'memories'])
    const [submitting, setSubmitting] = useState(false)
    const [deletedResult, setDeletedResult] = useState<string[] | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        let mounted = true
        supabase.auth.getSession().then(({ data }) => {
            if (!mounted) return
            setSessionEmail(data.session?.user?.email || null)
            setCheckingSession(false)
        })
        return () => {
            mounted = false
        }
    }, [supabase])

    const toggleCategory = (id: string) => {
        setDeletedResult(null)
        setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
    }

    const handleInlineSignIn = async (e: React.FormEvent) => {
        e.preventDefault()
        setSigningIn(true)
        setError('')
        try {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            })
            if (signInError) throw signInError
            if (data.session?.access_token) {
                apiClient.setToken(data.session.access_token)
            }
            setSessionEmail(data.user?.email || email.trim())
            setPassword('')
        } catch (err: any) {
            setError(err?.message || 'Sign-in failed. Please verify your email and password.')
        } finally {
            setSigningIn(false)
        }
    }

    const handleDeleteSelectedData = async (e: React.FormEvent) => {
        e.preventDefault()
        if (selected.length === 0) {
            setError('Select at least one data category to delete.')
            return
        }

        setSubmitting(true)
        setError('')
        try {
            const res = await apiClient.deleteUserData(selected)
            setDeletedResult(res?.deletedCategories || selected)
        } catch (err: any) {
            setError(
                err?.message || 'Could not delete the selected data. Please try again or email support@twingenie.app.'
            )
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-neutral-200 flex flex-col">
            <SiteHeader minimal />

            <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 space-y-10">
                <div className="space-y-4 border-b border-white/[0.08] pb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#D9A760]/30 bg-[#D9A760]/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-[#E7C891]">
                        <Shield className="h-3.5 w-3.5" />
                        Google Play Data Safety • com.asmind.app
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-4xl">
                        TwinGenie Data Deletion Request
                    </h1>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        Permanently erase specific categories of stored data inside{' '}
                        <strong className="text-white">TwinGenie</strong> while keeping your account and any active
                        subscription intact.{' '}
                        <Link href="/delete-account" className="text-rose-300 hover:underline">
                            Delete entire account instead →
                        </Link>
                    </p>
                </div>

                <section className="enterprise-panel space-y-6 p-6 md:p-8">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-[#D9A760]/25 bg-[#D9A760]/10 p-2.5 text-[#E7C891]">
                            <Database className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">
                                Select Data Scopes to Permanently Erase
                            </h2>
                            <p className="text-xs text-neutral-400">
                                Sign in below and choose the exact scopes to purge.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {deletedResult && (
                        <div className="space-y-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-100">
                            <div className="flex items-center gap-2 font-semibold text-white">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                Selected Data Permanently Deleted
                            </div>
                            <p className="text-sm text-emerald-100/90">
                                Removed scopes: <span className="font-mono">{deletedResult.join(', ')}</span>. Your
                                TwinGenie login remains active.
                            </p>
                        </div>
                    )}

                    {checkingSession ? (
                        <p className="text-sm text-neutral-400">Checking current session...</p>
                    ) : sessionEmail ? (
                        <form onSubmit={handleDeleteSelectedData} className="space-y-4">
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-neutral-300">
                                Signed in as <strong className="text-white">{sessionEmail}</strong>
                            </div>
                            <div className="space-y-3">
                                {DATA_OPTIONS.map((opt) => (
                                    <label
                                        key={opt.id}
                                        className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4 transition-colors hover:border-[#D9A760]/45"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(opt.id)}
                                            onChange={() => toggleCategory(opt.id)}
                                            className="mt-1 h-4 w-4 accent-[#D9A760]"
                                        />
                                        <div>
                                            <div className="text-sm font-medium text-white">{opt.label}</div>
                                            <div className="text-xs text-neutral-400">{opt.description}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="btn-primary-ivory px-5 py-3 text-sm disabled:opacity-50"
                            >
                                <Database className="h-4 w-4" />
                                <span>{submitting ? 'Deleting Selected Data...' : 'Delete Selected Data'}</span>
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleInlineSignIn} className="max-w-md space-y-4">
                            <div className="grid gap-3">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="TwinGenie account email"
                                    required
                                    className="w-full rounded-xl border border-white/15 bg-[#07080B] px-4 py-2.5 text-sm text-white focus:border-[#D9A760]/60 focus:outline-none"
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    required
                                    className="w-full rounded-xl border border-white/15 bg-[#07080B] px-4 py-2.5 text-sm text-white focus:border-[#D9A760]/60 focus:outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={signingIn}
                                className="btn-primary-ivory px-5 py-2.5 text-sm disabled:opacity-50"
                            >
                                <LogIn className="h-4 w-4" />
                                <span>{signingIn ? 'Signing In...' : 'Sign In to Manage Data'}</span>
                            </button>
                        </form>
                    )}
                </section>

                <section className="enterprise-panel space-y-2 p-5 text-sm text-neutral-300">
                    <div className="flex items-center gap-2 font-semibold text-white">
                        <Mail className="h-4 w-4 text-[#D9A760]" />
                        What Remains After Partial Data Deletion
                    </div>
                    <p className="text-xs leading-relaxed text-neutral-400">
                        Login credentials, email address, and Google Play subscription status stay active unless you
                        request full removal on{' '}
                        <Link href="/delete-account" className="text-[#E7C891] hover:underline">
                            Account Deletion
                        </Link>{' '}
                        or email{' '}
                        <a href="mailto:support@twingenie.app" className="text-[#E7C891] hover:underline">
                            support@twingenie.app
                        </a>
                        . Backups rotate within 90 days.
                    </p>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
