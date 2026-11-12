'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, Database, Shield, Mail, CheckCircle2, AlertTriangle, LogIn } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

const DATA_OPTIONS = [
    {
        id: 'chat',
        label: 'Conversations & Chat History',
        description: 'All conversation threads, chat history messages, summaries, and topic caches.',
    },
    {
        id: 'memories',
        label: 'Saved Memories & Vector Embeddings',
        description: 'Timeline memories, memory anniversaries, life context notes, and semantic embeddings.',
    },
    {
        id: 'voice',
        label: 'Voice Recordings',
        description: 'All stored voice audio files in your private TwinGenie voice storage.',
    },
    {
        id: 'personality',
        label: 'Personality Assessment & Twin Profile',
        description: 'Questionnaire answers, calculated Big Five traits, and generated Twin profile summary.',
    },
    {
        id: 'insights',
        label: 'Emotional Metrics & Insights History',
        description: 'Mood scores, emotional history logs, and personal tracking events.',
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
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
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
            setError(err?.message || 'Could not delete the selected data. Please try again or email support@twingenie.app.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-gray-200">
            <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="TwinGenie"
                            className="w-9 h-9 rounded-xl object-cover shadow-md shadow-purple-500/20"
                        />
                        <span className="font-bold text-xl tracking-tight text-white">TwinGenie</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/delete-account"
                            className="text-sm text-red-300 hover:text-red-200 transition-colors px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10"
                        >
                            Delete Entire Account
                        </Link>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Home
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
                <div className="space-y-4 border-b border-white/10 pb-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                        <Shield className="w-3.5 h-3.5" />
                        TwinGenie (com.asmind.app) • Google Play Data Safety
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">
                        TwinGenie Data Deletion Request
                    </h1>
                    <p className="text-gray-300 leading-relaxed">
                        You can permanently delete specific categories of your personal data stored in <strong className="text-white">TwinGenie</strong> (operated by TwinGenie / Ashwani Kumar) while keeping your account and any active subscription intact.
                    </p>
                </div>

                <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-300">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Delete Specific Data Without Deleting Your Account</h2>
                            <p className="text-sm text-gray-400">
                                Sign in below and select the exact data categories you want permanently erased.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {deletedResult && (
                        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-1">
                            <div className="flex items-center gap-2 font-semibold text-white">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                Selected Data Permanently Deleted
                            </div>
                            <p className="text-sm text-emerald-100/90">
                                Removed categories: <span className="font-mono">{deletedResult.join(', ')}</span>. Your TwinGenie login account remains active.
                            </p>
                        </div>
                    )}

                    {checkingSession ? (
                        <p className="text-sm text-gray-400">Checking current sign-in session...</p>
                    ) : sessionEmail ? (
                        <form onSubmit={handleDeleteSelectedData} className="space-y-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
                                Signed in as <strong className="text-white">{sessionEmail}</strong>
                            </div>
                            <div className="space-y-3">
                                {DATA_OPTIONS.map((opt) => (
                                    <label
                                        key={opt.id}
                                        className="flex items-start gap-3 p-4 rounded-xl bg-slate-950/70 border border-white/10 hover:border-purple-500/40 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(opt.id)}
                                            onChange={() => toggleCategory(opt.id)}
                                            className="mt-1 h-4 w-4 accent-purple-500"
                                        />
                                        <div>
                                            <div className="font-medium text-white">{opt.label}</div>
                                            <div className="text-sm text-gray-400">{opt.description}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold transition-colors"
                            >
                                <Database className="w-4 h-4" />
                                {submitting ? 'Deleting Selected Data...' : 'Delete Selected Data'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleInlineSignIn} className="space-y-4 max-w-md">
                            <div className="grid gap-3">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="TwinGenie account email"
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-purple-400"
                                />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    required
                                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-purple-400"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={signingIn}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-semibold transition-colors"
                            >
                                <LogIn className="w-4 h-4" />
                                {signingIn ? 'Signing In...' : 'Sign In to Manage & Delete Data'}
                            </button>
                        </form>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Alternative Ways to Request Data Deletion</h2>
                    <ol className="list-decimal pl-6 space-y-2 text-gray-300">
                        <li>
                            <strong className="text-white">In-App:</strong> Open TwinGenie &gt; <strong>Settings &gt; Privacy &amp; Data &gt; Clear Chat History</strong>.
                        </li>
                        <li>
                            <strong className="text-white">Email Request:</strong> Email{' '}
                            <a href="mailto:support@twingenie.app?subject=Data%20Deletion%20Request%20-%20TwinGenie" className="text-purple-400 hover:underline">
                                support@twingenie.app
                            </a>{' '}
                            or{' '}
                            <a href="mailto:founder@twingenie.app?subject=Data%20Deletion%20Request%20-%20TwinGenie" className="text-purple-400 hover:underline">
                                founder@twingenie.app
                            </a>{' '}
                            from your registered email specifying which data categories to remove. Email requests are processed within <strong>30 days</strong>.
                        </li>
                    </ol>
                </section>

                <section className="p-5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 space-y-2">
                    <div className="font-semibold text-white flex items-center gap-2">
                        <Mail className="w-4 h-4 text-purple-400" />
                        What Remains After Partial Data Deletion
                    </div>
                    <p>
                        Your TwinGenie login credentials, email address, and Google Play subscription status remain intact unless you request full account deletion on the{' '}
                        <Link href="/delete-account" className="text-purple-400 hover:underline">
                            Account Deletion page
                        </Link>. Encrypted disaster-recovery backups expire automatically within 90 days.
                    </p>
                </section>
            </main>
        </div>
    )
}
