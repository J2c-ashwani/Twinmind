'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { Copy, Users, Gift, Check, Share2 } from 'lucide-react'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'

export default function ReferralPage() {
    const [referralCode, setReferralCode] = useState('')
    const [referralUrl, setReferralUrl] = useState('')
    const [stats, setStats] = useState<any>(null)
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        loadReferralData()
    }, [])

    const loadReferralData = async () => {
        try {
            const [code, statsData] = await Promise.all([
                apiClient.getReferralCode(),
                apiClient.getReferralStats(),
            ])
            setReferralCode((code as any)?.code || '')
            setReferralUrl((code as any)?.url || '')
            setStats(statsData)
        } catch (error) {
            console.error('Failed to load referral data:', error)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(referralUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const shareToSocial = (platform: string) => {
        const text = 'Explore TwinGenie — an AI digital twin calibrated from 35 traits.'
        const urls: Record<string, string> = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralUrl)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + referralUrl)}`,
        }
        window.open(urls[platform], '_blank')
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
                <div className="border-b border-white/[0.08] pb-6">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                        Peer Invitations
                    </div>
                    <h1 className="mt-1 text-3xl font-semibold text-[#F4F2EC]">Invite Peers</h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        Share TwinGenie to unlock collective streaks and XP milestones.
                    </p>
                </div>

                <div className="enterprise-panel border-[#D9A760]/35 p-8 text-center">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-[#E7C891]">
                        Your Personal Invite Code
                    </div>
                    <div className="mx-auto mt-4 max-w-sm rounded-xl border border-white/[0.12] bg-[#07080B] px-6 py-4 font-mono text-2xl font-semibold tracking-widest text-white">
                        {referralCode || 'LOADING...'}
                    </div>
                    <button
                        type="button"
                        onClick={copyToClipboard}
                        className="btn-primary-ivory mt-5 px-6 py-3 text-xs"
                    >
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        <span>{copied ? 'Invite Link Copied' : 'Copy Referral Link'}</span>
                    </button>

                    <div className="mt-6 grid grid-cols-3 gap-3">
                        {['twitter', 'facebook', 'whatsapp'].map((platform) => (
                            <button
                                key={platform}
                                type="button"
                                onClick={() => shareToSocial(platform)}
                                className="btn-secondary-obsidian py-2.5 text-xs capitalize"
                            >
                                <Share2 className="h-3.5 w-3.5" />
                                <span>{platform === 'twitter' ? 'X / Twitter' : platform}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {stats && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="enterprise-panel p-6">
                            <Users className="mb-2 h-5 w-5 text-sky-400" />
                            <div className="text-3xl font-semibold text-white">{stats.invited}</div>
                            <div className="text-xs text-neutral-400">Peers Invited</div>
                        </div>
                        <div className="enterprise-panel p-6">
                            <Check className="mb-2 h-5 w-5 text-emerald-400" />
                            <div className="text-3xl font-semibold text-white">{stats.joined}</div>
                            <div className="text-xs text-neutral-400">Joined</div>
                        </div>
                        <div className="enterprise-panel p-6">
                            <Gift className="mb-2 h-5 w-5 text-[#E7C891]" />
                            <div className="text-3xl font-semibold text-white">{stats.rewards_earned}</div>
                            <div className="text-xs text-neutral-400">XP Earned</div>
                        </div>
                    </div>
                )}

                <div className="enterprise-panel space-y-3 p-6">
                    <h2 className="text-base font-semibold text-white">Referral Milestones</h2>
                    {[
                        { pts: '+50 XP', title: 'You earn 50 XP', desc: 'Credited when a referred peer joins' },
                        { pts: '+25 XP', title: 'Peer earns 25 XP', desc: 'Welcome boost on their onboarding' },
                        { pts: '500 XP', title: 'Streak Freeze Unlock', desc: 'Accumulate XP to protect active streaks' },
                    ].map((row) => (
                        <div
                            key={row.title}
                            className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-[#0B0D12] p-4"
                        >
                            <div className="rounded-lg border border-[#D9A760]/30 bg-[#D9A760]/10 px-3 py-1.5 font-mono text-xs font-semibold text-[#E7C891]">
                                {row.pts}
                            </div>
                            <div>
                                <div className="text-sm font-medium text-white">{row.title}</div>
                                <div className="text-xs text-neutral-400">{row.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
