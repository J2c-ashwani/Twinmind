'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Trash2, Shield, Mail, CheckCircle2, AlertTriangle, LogIn } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { useUserStore } from '@/store/useStore'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'

export default function AccountDeletionView() {
    const supabase = createClientComponentClient()
    const { logout } = useUserStore()

    const [checkingSession, setCheckingSession] = useState(true)
    const [sessionEmail, setSessionEmail] = useState<string | null>(null)

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
            apiClient.clearToken()
            logout()
            setSessionEmail(null)
            setDeleted(true)
        } catch (err: any) {
            setError(
                err?.message || 'Could not complete account deletion. Please try again or email support@twingenie.app.'
            )
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-neutral-200 flex flex-col">
            <SiteHeader minimal />

            <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-14 sm:px-6 space-y-10">
                <div className="space-y-4 border-b border-white/[0.08] pb-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/25 bg-rose-500/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-rose-300">
                        <Shield className="h-3.5 w-3.5" />
                        Google Play Data Safety • com.asmind.app
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-4xl">
                        TwinGenie Account Deletion
                    </h1>
                    <p className="text-sm leading-relaxed text-neutral-300 sm:text-base">
                        Permanently delete your <strong className="text-white">TwinGenie</strong> account and associated
                        personal records immediately below, inside app settings, or by emailing our privacy team.{' '}
                        <Link href="/delete-data" className="text-[#E7C891] hover:underline">
                            Delete specific data categories instead →
                        </Link>
                    </p>
                </div>

                <section className="enterprise-panel space-y-6 p-6 md:p-8">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-2.5 text-rose-400">
                            <Trash2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Self-Service Account Erasure</h2>
                            <p className="text-xs text-neutral-400">
                                Sign in to permanently erase your identity, traits, chats, and memories immediately.
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {deleted ? (
                        <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-100">
                            <div className="flex items-center gap-2 font-semibold text-white">
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                                Account Permanently Deleted
                            </div>
                            <p className="text-sm text-emerald-100/90">
                                Your TwinGenie account, profile, chat conversations, saved memories, embeddings, and
                                voice files have been permanently erased. If you hold an active Google Play
                                subscription, cancel recurring billing inside Google Play Store &gt; Payments &amp;
                                subscriptions.
                            </p>
                        </div>
                    ) : checkingSession ? (
                        <p className="text-sm text-neutral-400">Checking current session...</p>
                    ) : sessionEmail ? (
                        <form onSubmit={handleDeleteAccount} className="space-y-4">
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-neutral-300">
                                Signed in as <strong className="text-white">{sessionEmail}</strong>
                            </div>
                            <div>
                                <label
                                    htmlFor="confirm-delete"
                                    className="mb-2 block text-xs font-medium text-neutral-300"
                                >
                                    Type <span className="font-mono text-rose-300">DELETE</span> to permanently erase your
                                    account
                                </label>
                                <input
                                    id="confirm-delete"
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="Type DELETE"
                                    className="w-full max-w-sm rounded-xl border border-white/15 bg-[#07080B] px-4 py-2.5 text-sm text-white focus:border-rose-400 focus:outline-none"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={deleting}
                                className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                {deleting ? 'Deleting Account...' : 'Permanently Delete My Account'}
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
                                <span>{signingIn ? 'Signing In...' : 'Sign In to Delete Account'}</span>
                            </button>
                        </form>
                    )}
                </section>

                <section className="space-y-4">
                    <h2 className="text-lg font-semibold text-[#F4F2EC]">Data Deleted vs. Retention Exceptions</h2>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="enterprise-panel space-y-2 p-5">
                            <h3 className="text-sm font-semibold text-white">Permanently Deleted Immediately</h3>
                            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                                <li>Account profile, display name, and email credentials</li>
                                <li>All AI Twin conversations and summaries</li>
                                <li>35-trait psychometric answers and calibrated profile</li>
                                <li>Saved memories, notes, and vector embeddings</li>
                                <li>Voice audio recordings, notification tokens, and streaks</li>
                            </ul>
                        </div>
                        <div className="enterprise-panel space-y-2 p-5">
                            <h3 className="text-sm font-semibold text-white">Retention &amp; Billing Compliance</h3>
                            <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-neutral-300 sm:text-sm">
                                <li>
                                    Google Play purchase audit logs retained strictly where legally mandated for tax or
                                    fraud defense.
                                </li>
                                <li>
                                    Encrypted disaster-recovery database backups rotate out automatically within{' '}
                                    <strong>90 days</strong>.
                                </li>
                                <li>
                                    Deleting your account does not cancel active Play Store subscriptions automatically.
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                <section className="enterprise-panel flex flex-col justify-between gap-4 p-5 text-sm text-neutral-300 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold text-white">
                            <Mail className="h-4 w-4 text-[#D9A760]" />
                            Email Requests Completed Within 30 Days
                        </div>
                        <p className="text-xs text-neutral-400">
                            Cannot sign in? Email{' '}
                            <a href="mailto:support@twingenie.app" className="text-[#E7C891] hover:underline">
                                support@twingenie.app
                            </a>{' '}
                            from your registered email address or review our{' '}
                            <Link href="/privacy" className="text-[#E7C891] hover:underline">
                                Privacy Policy
                            </Link>
                            .
                        </p>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    )
}
