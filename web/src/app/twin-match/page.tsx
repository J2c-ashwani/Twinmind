'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Users, Search, Sparkles, Check, UserPlus } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { motion } from 'framer-motion'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'

interface MatchInvitation {
    id: string
    direction: 'incoming' | 'outgoing'
    partner_twin_name: string
    status: 'pending' | 'accepted' | 'declined' | 'revoked'
}

export default function TwinMatchPage() {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [matchResult, setMatchResult] = useState<any>(null)
    const [error, setError] = useState('')
    const [statusMessage, setStatusMessage] = useState('')
    const [invitations, setInvitations] = useState<MatchInvitation[]>([])

    useEffect(() => {
        loadInvitations()
    }, [])

    const loadInvitations = async () => {
        try {
            const res = (await apiClient.getTwinMatchInvitations()) as any
            setInvitations(res?.invitations || [])
        } catch {}
    }

    const handleSearchOrInvite = async () => {
        if (!searchQuery.trim()) return
        setLoading(true)
        setError('')
        setStatusMessage('')
        setMatchResult(null)

        try {
            const comparison = await apiClient.compareTwins(searchQuery)
            setMatchResult(comparison)
        } catch (err: any) {
            try {
                const inviteRes = (await apiClient.inviteTwinMatch(searchQuery)) as any
                setStatusMessage(
                    inviteRes?.message ||
                        'Match invitation sent! Full compatibility activates once accepted.'
                )
                await loadInvitations()
            } catch (inviteErr: any) {
                setError(inviteErr?.message || err?.message || 'User not found or comparison failed')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleRespondInvite = async (invitationId: string, accept: boolean) => {
        setActionLoading(true)
        setError('')
        setStatusMessage('')
        try {
            const res = accept
                ? ((await apiClient.acceptTwinMatchInvitation(invitationId)) as any)
                : ((await apiClient.declineTwinMatchInvitation(invitationId)) as any)

            if (accept && res?.comparison) {
                setMatchResult(res.comparison)
                setStatusMessage('Invitation accepted! Compatibility profile generated.')
            } else if (accept) {
                setStatusMessage('Invitation accepted.')
            } else {
                setStatusMessage('Invitation declined.')
            }
            await loadInvitations()
        } catch (err: any) {
            setError(err.message || 'Failed to update invitation')
        } finally {
            setActionLoading(false)
        }
    }

    const pendingIncoming = invitations.filter((i) => i.direction === 'incoming' && i.status === 'pending')
    const pendingOutgoing = invitations.filter((i) => i.direction === 'outgoing' && i.status === 'pending')

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
                <div className="mb-8 flex items-center gap-4 border-b border-white/[0.08] pb-6">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="rounded-xl border border-white/10 p-2 text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                        aria-label="Back"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                        <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                            Mutual-Consent Compatibility
                        </div>
                        <h1 className="text-2xl font-semibold text-[#F4F2EC] sm:text-3xl">Twin Match</h1>
                    </div>
                </div>

                <div className="enterprise-panel mb-6 p-6">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                        <Users className="h-4 w-4 text-[#D9A760]" />
                        <span>Find or Invite a Twin</span>
                    </h2>
                    <p className="mt-1 text-xs text-neutral-400">
                        Enter a friend&apos;s email or referral code to request a psychometric compatibility check.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="friend@domain.com or TWIN-CODE"
                                className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchOrInvite()}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleSearchOrInvite}
                            disabled={loading || !searchQuery.trim()}
                            className="btn-primary-ivory px-5 py-3 text-xs disabled:opacity-40"
                        >
                            <span>{loading ? 'Checking...' : 'Match / Invite'}</span>
                            {!loading && <Sparkles className="h-3.5 w-3.5" />}
                        </button>
                    </div>

                    {statusMessage && (
                        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                            {statusMessage}
                        </div>
                    )}
                    {error && (
                        <div className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                            {error}
                        </div>
                    )}
                </div>

                {(pendingIncoming.length > 0 || pendingOutgoing.length > 0) && (
                    <div className="enterprise-panel mb-6 p-6">
                        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
                            <UserPlus className="h-4 w-4 text-[#D9A760]" />
                            <span>Match Invitations</span>
                        </h3>

                        {pendingIncoming.length > 0 && (
                            <div className="mb-4 space-y-2">
                                <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                    Incoming ({pendingIncoming.length})
                                </div>
                                {pendingIncoming.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
                                    >
                                        <span className="text-xs font-medium text-white">
                                            {inv.partner_twin_name || 'A user'} invited you to compare Twins
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleRespondInvite(inv.id, true)}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-[#07080B] hover:bg-emerald-400"
                                            >
                                                <Check className="h-3 w-3" /> Accept
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRespondInvite(inv.id, false)}
                                                disabled={actionLoading}
                                                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/[0.06]"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {pendingOutgoing.length > 0 && (
                            <div className="space-y-2">
                                <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                    Sent ({pendingOutgoing.length})
                                </div>
                                {pendingOutgoing.map((inv) => (
                                    <div
                                        key={inv.id}
                                        className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-neutral-300"
                                    >
                                        <span>Sent to {inv.partner_twin_name || 'friend'}</span>
                                        <span className="rounded bg-[#D9A760]/15 px-2 py-0.5 font-mono text-[10px] text-[#E7C891]">
                                            Pending
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {matchResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="enterprise-panel p-6 sm:p-8"
                    >
                        <div className="mb-8 text-center">
                            <div className="mx-auto inline-flex flex-col items-center rounded-2xl border border-[#D9A760]/35 bg-[#D9A760]/10 px-8 py-5">
                                <div className="text-4xl font-semibold text-[#F4F2EC]">
                                    {matchResult.compatibility_score || matchResult.compatibility}%
                                </div>
                                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#E7C891]">
                                    Compatibility Index
                                </div>
                            </div>
                            <h3 className="mt-4 text-xl font-semibold text-white">
                                {(matchResult.compatibility_score || matchResult.compatibility) > 80
                                    ? 'High Alignment'
                                    : (matchResult.compatibility_score || matchResult.compatibility) > 50
                                    ? 'Constructive Dynamic'
                                    : 'Complementary Perspectives'}
                            </h3>
                            {matchResult.user2?.twin_name && (
                                <p className="mt-1 text-xs text-neutral-400">
                                    Compared with {matchResult.user2.twin_name}&apos;s Twin
                                </p>
                            )}
                        </div>

                        {matchResult.insights?.length > 0 && (
                            <div className="mb-6 rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4">
                                <h4 className="mb-2 font-mono text-xs uppercase tracking-wider text-[#D9A760]">
                                    Key Insights
                                </h4>
                                <ul className="space-y-1.5 text-xs text-neutral-300 sm:text-sm">
                                    {matchResult.insights.map((insight: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="mt-1 text-[#D9A760]">•</span>
                                            <span>{insight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                                    Shared Strengths
                                </h4>
                                <ul className="space-y-2 text-xs text-neutral-300">
                                    {(matchResult.shared_traits || []).length > 0 ? (
                                        matchResult.shared_traits.map((trait: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                {trait}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-neutral-400">Mutual core values and reflection drive</li>
                                    )}
                                </ul>
                            </div>

                            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                                <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#E7C891]">
                                    Growth Contrast
                                </h4>
                                <ul className="space-y-2 text-xs text-neutral-300">
                                    {(matchResult.differences || []).length > 0 ? (
                                        matchResult.differences.map((diff: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[#D9A760]" />
                                                {diff}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-neutral-400">
                                            Balancing deliberation with direct action
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}
            </main>
        </div>
    )
}
