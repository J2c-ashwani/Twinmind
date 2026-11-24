'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, LogIn, ArrowRight, Flame, Trophy, Brain } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import GrowthCircleWidget from '@/components/Circles/GrowthCircleWidget'
import CircleInviteModal from '@/components/Circles/CircleInviteModal'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function GrowthCirclesPage() {
    const [hasCircle, setHasCircle] = useState<boolean | null>(null)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [activeCircle, setActiveCircle] = useState<{ id: string; name: string } | null>(null)
    const [joinCode, setJoinCode] = useState('')
    const [isJoining, setIsJoining] = useState(false)
    const [joinError, setJoinError] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const supabase = createClientComponentClient()

    useEffect(() => {
        const invite = new URLSearchParams(window.location.search).get('invite')
        if (invite) setJoinCode(invite.toUpperCase())
        checkCircleStatus()
    }, [])

    const checkCircleStatus = async () => {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session) {
                apiClient.setToken(session.access_token)
                const data = (await apiClient.getMyCircle()) as any
                setHasCircle(!!data?.circle)
                if (data?.circle) {
                    setActiveCircle({ id: data.circle.id, name: data.circle.name })
                }
            }
        } catch (error) {
            console.error('Failed to check status:', error)
            setHasCircle(false)
        } finally {
            setIsLoading(false)
        }
    }

    const handleJoinCircle = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!joinCode.trim()) return

        setIsJoining(true)
        setJoinError('')

        try {
            await apiClient.joinCircle(joinCode)
            window.location.reload()
        } catch (error: any) {
            setJoinError(error.message || 'Failed to join circle. Check code and try again.')
        } finally {
            setIsJoining(false)
        }
    }

    const handleInviteClick = (circleId: string, circleName: string) => {
        setActiveCircle({ id: circleId, name: circleName })
        setShowInviteModal(true)
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            {isLoading ? (
                <div className="flex min-h-[70vh] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D9A760] border-t-transparent" />
                </div>
            ) : (
                <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
                    <div className="mb-10 border-b border-white/[0.08] pb-6">
                        <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                            <Users className="h-3.5 w-3.5" />
                            Private Accountability Pods
                        </div>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F4F2EC]">
                            Growth Circles
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                            Join up to 5 trusted peers to track collective consistency streaks without public social
                            feeds.
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="enterprise-panel p-6 sm:p-8"
                    >
                        <GrowthCircleWidget onInviteClick={handleInviteClick} />

                        {!hasCircle && (
                            <div className="mt-10 border-t border-white/[0.08] pt-8">
                                <div className="mb-6 text-center">
                                    <h2 className="text-lg font-semibold text-[#F4F2EC]">Have an invite code?</h2>
                                    <p className="mt-1 text-xs text-neutral-400">
                                        Enter the code shared by your circle host to connect.
                                    </p>
                                </div>

                                <form onSubmit={handleJoinCircle} className="mx-auto max-w-md">
                                    <div className="flex gap-2.5">
                                        <div className="relative flex-1">
                                            <LogIn className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                            <input
                                                type="text"
                                                value={joinCode}
                                                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                                placeholder="ENTER-CODE"
                                                className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] py-3 pl-10 pr-3 text-center font-mono text-xs tracking-widest uppercase text-white focus:border-[#D9A760]/60 focus:outline-none"
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isJoining || !joinCode}
                                            className="btn-primary-ivory px-5 py-3 text-xs disabled:opacity-40"
                                        >
                                            <span>{isJoining ? 'Joining...' : 'Join'}</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    {joinError && (
                                        <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 py-2 text-center text-xs text-rose-300">
                                            {joinError}
                                        </p>
                                    )}
                                </form>
                            </div>
                        )}
                    </motion.div>

                    {!hasCircle && (
                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            {[
                                {
                                    icon: Flame,
                                    title: 'Collective Streaks',
                                    desc: 'Combine daily reflection momentum across members.',
                                },
                                {
                                    icon: Trophy,
                                    title: 'Shared Milestones',
                                    desc: 'Reach weekly accountability benchmarks together.',
                                },
                                {
                                    icon: Brain,
                                    title: 'Privacy First',
                                    desc: 'Reflections stay private—only streaks and wins sync.',
                                },
                            ].map((item) => {
                                const Icon = item.icon
                                return (
                                    <div key={item.title} className="enterprise-panel p-6">
                                        <Icon className="mb-3 h-5 w-5 text-[#D9A760]" />
                                        <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                                        <p className="mt-1 text-xs text-neutral-400">{item.desc}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </main>
            )}

            {activeCircle && (
                <CircleInviteModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    circleId={activeCircle.id}
                    circleName={activeCircle.name}
                />
            )}
        </div>
    )
}
