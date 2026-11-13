'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Search, Sparkles, Check, X, UserPlus, Heart, Share2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';

interface MatchInvitation {
    id: string;
    direction: 'incoming' | 'outgoing';
    partner_twin_name: string;
    status: 'pending' | 'accepted' | 'declined' | 'revoked';
}

export default function TwinMatchPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [matchResult, setMatchResult] = useState<any>(null);
    const [error, setError] = useState('');
    const [statusMessage, setStatusMessage] = useState('');
    const [invitations, setInvitations] = useState<MatchInvitation[]>([]);

    useEffect(() => {
        loadInvitations();
    }, []);

    const loadInvitations = async () => {
        try {
            const res = (await apiClient.getTwinMatchInvitations()) as any;
            setInvitations(res?.invitations || []);
        } catch {
            // Non-blocking on initial load
        }
    };

    const handleSearchOrInvite = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError('');
        setStatusMessage('');
        setMatchResult(null);

        try {
            // First attempt direct compare (succeeds if mutual consent exists)
            const comparison = await apiClient.compareTwins(searchQuery);
            setMatchResult(comparison);
        } catch (err: any) {
            // If mutual consent does not exist yet, send a consent invitation
            try {
                const inviteRes = (await apiClient.inviteTwinMatch(searchQuery)) as any;
                setStatusMessage(
                    inviteRes?.message ||
                    'Match invitation sent! You can view full compatibility once your friend accepts.'
                );
                await loadInvitations();
            } catch (inviteErr: any) {
                setError(inviteErr?.message || err?.message || 'User not found or comparison failed');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRespondInvite = async (invitationId: string, accept: boolean) => {
        setActionLoading(true);
        setError('');
        setStatusMessage('');
        try {
            const res = accept
                ? ((await apiClient.acceptTwinMatchInvitation(invitationId)) as any)
                : ((await apiClient.declineTwinMatchInvitation(invitationId)) as any);

            if (accept && res?.comparison) {
                setMatchResult(res.comparison);
                setStatusMessage('Invitation accepted! Compatibility profile generated.');
            } else if (accept) {
                setStatusMessage('Invitation accepted.');
            } else {
                setStatusMessage('Invitation declined.');
            }
            await loadInvitations();
        } catch (err: any) {
            setError(err.message || 'Failed to update invitation');
        } finally {
            setActionLoading(false);
        }
    };

    const pendingIncoming = invitations.filter((i) => i.direction === 'incoming' && i.status === 'pending');
    const pendingOutgoing = invitations.filter((i) => i.direction === 'outgoing' && i.status === 'pending');

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="glass-button p-2 hover:bg-white/10 rounded-xl transition-colors"
                        aria-label="Back"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Twin Match
                        </h1>
                        <p className="text-sm text-gray-400">
                            Discover personality harmony with mutual consent
                        </p>
                    </div>
                </div>

                {/* Search & Invite Section */}
                <div className="glass-card p-6 mb-8">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        Find or Invite a Twin
                    </h2>
                    <p className="text-sm text-gray-400 mb-4">
                        Enter a friend's email or referral code to compare AI twins or send a match invitation.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="friend@email.com or TWIN-CODE"
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchOrInvite()}
                            />
                        </div>
                        <button
                            onClick={handleSearchOrInvite}
                            disabled={loading || !searchQuery.trim()}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-semibold disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? 'Checking...' : 'Match / Invite'}
                            {!loading && <Sparkles className="w-4 h-4" />}
                        </button>
                    </div>

                    {statusMessage && (
                        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
                            {statusMessage}
                        </div>
                    )}

                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Pending Invitations Section */}
                {(pendingIncoming.length > 0 || pendingOutgoing.length > 0) && (
                    <div className="glass-card p-6 mb-8">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <UserPlus className="w-5 h-5 text-pink-400" />
                            Match Invitations
                        </h3>

                        {pendingIncoming.length > 0 && (
                            <div className="mb-4">
                                <div className="text-xs font-semibold uppercase tracking-wider text-purple-300 mb-2">
                                    Incoming Requests ({pendingIncoming.length})
                                </div>
                                <div className="space-y-2">
                                    {pendingIncoming.map((inv) => (
                                        <div
                                            key={inv.id}
                                            className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3"
                                        >
                                            <span className="text-sm font-medium text-white">
                                                {inv.partner_twin_name || 'A user'} wants to match with your Twin
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRespondInvite(inv.id, true)}
                                                    disabled={actionLoading}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                                                >
                                                    <Check className="w-3.5 h-3.5" /> Accept
                                                </button>
                                                <button
                                                    onClick={() => handleRespondInvite(inv.id, false)}
                                                    disabled={actionLoading}
                                                    className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-xs transition-colors"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {pendingOutgoing.length > 0 && (
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                                    Sent Requests ({pendingOutgoing.length})
                                </div>
                                <div className="space-y-2">
                                    {pendingOutgoing.map((inv) => (
                                        <div
                                            key={inv.id}
                                            className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-3 text-sm text-gray-300"
                                        >
                                            <span>
                                                Invitation sent to {inv.partner_twin_name || 'friend'}
                                            </span>
                                            <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">
                                                Awaiting acceptance
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Match Results Section */}
                {matchResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6"
                    >
                        <div className="text-center mb-8">
                            <div className="inline-block p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-4">
                                <div className="text-4xl font-bold text-white">
                                    {matchResult.compatibility_score || matchResult.compatibility}%
                                </div>
                                <div className="text-sm text-purple-300">Compatibility Score</div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                {(matchResult.compatibility_score || matchResult.compatibility) > 80
                                    ? 'Great Harmony!'
                                    : (matchResult.compatibility_score || matchResult.compatibility) > 50
                                    ? 'Good Dynamic!'
                                    : 'Complementary Perspectives'}
                            </h3>
                            {matchResult.user2?.twin_name && (
                                <p className="text-sm text-gray-400">
                                    Matched with {matchResult.user2.twin_name}'s Twin
                                </p>
                            )}
                        </div>

                        {matchResult.insights && matchResult.insights.length > 0 && (
                            <div className="mb-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                <h4 className="font-semibold text-purple-300 mb-2">Compatibility Insights</h4>
                                <ul className="space-y-1.5 text-sm text-gray-300">
                                    {matchResult.insights.map((insight: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="text-purple-400 mt-0.5">•</span>
                                            <span>{insight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="font-semibold text-green-400 mb-3">Shared Strengths</h4>
                                <ul className="space-y-2">
                                    {(matchResult.shared_traits || []).length > 0 ? (
                                        matchResult.shared_traits.map((trait: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2 text-gray-300">
                                                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                                {trait}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-sm text-gray-400">Mutual core values and curiosity</li>
                                    )}
                                </ul>
                            </div>

                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="font-semibold text-yellow-400 mb-3">Growth Areas</h4>
                                <ul className="space-y-2">
                                    {(matchResult.differences || []).length > 0 ? (
                                        matchResult.differences.map((diff: string, i: number) => (
                                            <li key={i} className="flex items-center gap-2 text-gray-300">
                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                                {diff}
                                            </li>
                                        ))
                                    ) : (
                                        <li className="text-sm text-gray-400">Balancing reflection with spontaneous action</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
