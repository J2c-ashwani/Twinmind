'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { ArrowLeft, Trash2, Shield, Mail, CheckCircle2, AlertTriangle, LogIn } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useUserStore } from '@/store/useStore'

export default function AccountDeletionView() {
    const supabase = createClientComponentClient()
    const { logout } = useUserStore()

    const [checkingSession, setCheckingSession] = useState(true)
    const [sessionEmail, setSessionEmail] = useState<string | null>(null)

    // Optional inline sign-in for users opening the link directly from Google Play
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [signingIn, setSigningIn] = useState(false)

    const [confirmText, setConfirmText] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [deleted, setDeleted] = useState(false)
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

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault()
        if (confirmText.trim().toUpperCase() !== 'DELETE') {
            setError('Please type DELETE to confirm permanent account deletion.')
            return
        }

        setDeleting(true)
        setError('')
        try {
            await apiClient.deleteAccount()
            await supabase.auth.signOut().catch(() => {})
            logout()
            setSessionEmail(null)
            setDeleted(true)
        } catch (err: any) {
            setError(err?.message || 'Could not complete account deletion. Please try again or email support@twingenie.app.')
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-gray-200">
            <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <img
                            src="/logo.png"
                            alt="TwinGenie"
                            className="w-9 h-9 rounded-xl object-cover shadow-md shadow-purple-500/20"
                        />
                        <span className="font-bold text-xl tracking-tight text-white">TwinGenie</span>
                    </Link>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/delete-data"
                            className="text-sm text-purple-300 hover:text-purple-200 transition-colors px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10"
                        >
                            Delete Specific Data Instead
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-medium">
                        <Shield className="w-3.5 h-3.5" />
                        TwinGenie (com.asmind.app) • Google Play Data Safety
                    </div>
                    <h1 className="text-4xl font-extrabold text-white tracking-tight">
                        TwinGenie Account Deletion
                    </h1>
                    <p className="text-gray-300 leading-relaxed">
                        You can permanently delete your <strong className="text-white">TwinGenie</strong> account (operated by TwinGenie / Ashwani Kumar) and associated personal data at any time using the self-service tool below, directly inside the TwinGenie app, or by emailing our privacy team.
                    </p>
                </div>

                {/* Self-Service Deletion Tool */}
                <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-red-500/15 text-red-400">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Self-Service Account Deletion</h2>
                            <p className="text-sm text-gray-400">
                                Sign in with your TwinGenie account to permanently erase your account immediately.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {deleted ? (
                        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 space-y-2">
                            <div className="flex items-center gap-2 font-semibold text-white">
                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                Account Permanently Deleted
                            </div>
                            <p className="text-sm text-emerald-100/90">
                                Your TwinGenie account, profile, chat conversations, saved memories, embeddings, personality profile, and stored voice files have been permanently removed. If you had an active Google Play subscription, remember to cancel recurring billing in Google Play Store &gt; Payments &amp; subscriptions.
                            </p>
                        </div>
                    ) : checkingSession ? (
                        <p className="text-sm text-gray-400">Checking current sign-in session...</p>
                    ) : sessionEmail ? (
                        <form onSubmit={handleDeleteAccount} className="space-y-4">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300">
                                Signed in as <strong className="text-white">{sessionEmail}</strong>
                            </div>
                            <div>
                                <label htmlFor="confirm-delete" className="block text-sm font-medium text-gray-300 mb-2">
                                    Type <span className="font-mono text-red-300">DELETE</span> to permanently delete your account
                                </label>
                                <input
                                    id="confirm-delete"
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Type DELETE"
                                    className="w-full max-w-sm px-4 py-2.5 rounded-xl bg-slate-950 border border-white/15 text-white focus:outline-none focus:border-red-400"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={deleting}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-semibold transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                {deleting ? 'Deleting Account...' : 'Permanently Delete My Account'}
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
                                {signingIn ? 'Signing In...' : 'Sign In to Delete Account'}
                            </button>
                        </form>
                    )}
                </section>

                {/* Steps & Alternative Methods */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">How to Request Account Deletion</h2>
                    <ol className="list-decimal pl-6 space-y-2 text-gray-300">
                        <li>
                            <strong className="text-white">Via Web (Immediate):</strong> Sign in above on this page (<span className="text-purple-300">https://www.twingenie.app/delete-account</span>), type <code className="text-red-300">DELETE</code>, and select <em>Permanently Delete My Account</em>.
                        </li>
                        <li>
                            <strong className="text-white">Via Mobile App or Web Settings:</strong> Open TwinGenie, go to <strong>Settings &gt; Privacy &amp; Data &gt; Delete Account</strong>.
                        </li>
                        <li>
                            <strong className="text-white">Via Email (If you cannot sign in):</strong> Send a deletion request from your registered email address to{' '}
                            <a href="mailto:support@twingenie.app?subject=Account%20Deletion%20Request%20-%20TwinGenie" className="text-purple-400 hover:underline">
                                support@twingenie.app
                            </a>{' '}
                            or{' '}
                            <a href="mailto:founder@twingenie.app?subject=Account%20Deletion%20Request%20-%20TwinGenie" className="text-purple-400 hover:underline">
                                founder@twingenie.app
                            </a>
                            . Requests by email are verified and completed within <strong>30 days</strong>.
                        </li>
                    </ol>
                </section>

                {/* What Gets Deleted vs Retained */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white">Data Deleted vs. Data Retained</h2>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                            <h3 className="font-semibold text-white">Permanently Deleted Immediately</h3>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                                <li>Account profile, display name, and email credentials</li>
                                <li>All AI Twin conversations and chat history</li>
                                <li>Personality assessment answers and Twin profile</li>
                                <li>Saved memories, life context, and vector embeddings</li>
                                <li>Private voice response audio recordings</li>
                                <li>Push notification tokens, reminders, and streak stats</li>
                            </ul>
                        </div>
                        <div className="p-5 rounded-xl bg-white/5 border border-white/10 space-y-2">
                            <h3 className="font-semibold text-white">Retention &amp; Exceptions</h3>
                            <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                                <li>
                                    <strong className="text-white">Subscription &amp; tax compliance:</strong> Google Play order/purchase audit records may be retained only as required by applicable tax, accounting, or fraud-prevention law.
                                </li>
                                <li>
                                    <strong className="text-white">Database backups:</strong> Automated encrypted backups rotate out within <strong>90 days</strong>.
                                </li>
                                <li>
                                    <strong className="text-white">Google Play billing:</strong> Deleting your TwinGenie account does not automatically cancel an active subscription inside Google Play; manage renewals in Google Play Store settings.
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="p-5 rounded-xl bg-white/5 border border-white/10 text-sm text-gray-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="font-semibold text-white flex items-center gap-2">
                            <Mail className="w-4 h-4 text-purple-400" />
                            Need partial data deletion or help?
                        </div>
                        <p>
                            Want to delete chat history, memories, or voice recordings while keeping your account? Use our{' '}
                            <Link href="/delete-data" className="text-purple-400 hover:underline">
                                Data Deletion page
                            </Link>{' '}
                            or review our{' '}
                            <Link href="/privacy" className="text-purple-400 hover:underline">
                                Privacy Policy
                            </Link>.
                        </p>
                    </div>
                </section>
            </main>
        </div>
    )
}
