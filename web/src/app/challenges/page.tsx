'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import api from '@/lib/api'
import { Loader2, CheckCircle2, Circle, Clock, Gift, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'

interface DailyChallenge {
    id: string
    task: string
    type: string
    reward: number
    time_window?: string
    completed: boolean
}

export default function DailyChallengesPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()

    const fallbackChallenges: DailyChallenge[] = [
        {
            id: '1',
            task: 'Start your day with a brief cognitive intention check-in',
            type: 'morning_reflection',
            reward: 25,
            time_window: '6AM - 10AM',
            completed: false,
        },
        {
            id: '2',
            task: 'Log 3 concrete things you appreciate today',
            type: 'gratitude_moment',
            reward: 30,
            time_window: 'Anytime',
            completed: false,
        },
        {
            id: '3',
            task: 'Review your key decision wins from today',
            type: 'evening_wins',
            reward: 25,
            time_window: '6PM - 11PM',
            completed: false,
        },
        {
            id: '4',
            task: 'Ask Honest Mode about one responsibility you have avoided',
            type: 'vulnerability_challenge',
            reward: 50,
            time_window: 'Anytime',
            completed: false,
        },
    ]

    const [challenges, setChallenges] = useState<DailyChallenge[]>(fallbackChallenges)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [completingId, setCompletingId] = useState<string | null>(null)

    useEffect(() => {
        loadChallenges()
    }, [])

    async function loadChallenges() {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const response = await api.getDailyChallenges(session.access_token)
            if (response.challenges && response.challenges.length > 0) {
                setChallenges(response.challenges)
            }
        } catch (err) {
            console.error('Failed to load challenges, using fallback:', err)
        } finally {
            setLoading(false)
        }
    }

    async function completeChallenge(challengeId: string) {
        try {
            setCompletingId(challengeId)
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) return

            await api.completeChallenge(challengeId, session.access_token)
            setChallenges((prev) =>
                prev.map((c) => (c.id === challengeId ? { ...c, completed: true } : c))
            )
        } catch (err: any) {
            setError(err.message)
        } finally {
            setCompletingId(null)
        }
    }

    const completedCount = challenges.filter((c) => c.completed).length
    const totalCount = challenges.length
    const allCompleted = totalCount > 0 && completedCount === totalCount
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            {loading ? (
                <div className="flex min-h-[70vh] items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-[#D9A760]" />
                </div>
            ) : (
                <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
                    <div className="enterprise-panel mb-8 p-6 sm:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                                <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Behavioral Discipline
                                </div>
                                <h1 className="mt-1 text-2xl font-semibold text-[#F4F2EC] sm:text-3xl">
                                    Daily Challenges
                                </h1>
                            </div>
                            <div className="rounded-xl border border-[#D9A760]/30 bg-[#D9A760]/10 px-4 py-2 font-mono text-lg font-semibold text-[#E7C891]">
                                {completedCount} / {totalCount}
                            </div>
                        </div>

                        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                            <motion.div
                                className="h-full bg-[#D9A760]"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.4 }}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300">
                            {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        {challenges.map((challenge, index) => (
                            <motion.div
                                key={challenge.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.04 }}
                                className={`enterprise-panel p-5 ${
                                    challenge.completed ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : ''
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#07080B] text-[#E7C891]">
                                        <Sparkles className="h-4 w-4" />
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-[#F4F2EC] sm:text-base">
                                            {challenge.task}
                                        </h3>
                                        <div className="mt-1.5 flex items-center gap-4 text-xs text-neutral-400">
                                            {challenge.time_window && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5" />
                                                    {challenge.time_window}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 font-mono text-[#E7C891]">
                                                <Gift className="h-3.5 w-3.5" />
                                                {challenge.reward} XP
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => completeChallenge(challenge.id)}
                                        disabled={challenge.completed || completingId === challenge.id}
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                                            challenge.completed
                                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                                                : 'border-white/15 bg-white/[0.03] text-neutral-400 hover:border-[#D9A760]/60 hover:text-[#E7C891]'
                                        }`}
                                    >
                                        {completingId === challenge.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : challenge.completed ? (
                                            <CheckCircle2 className="h-5 w-5" />
                                        ) : (
                                            <Circle className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <AnimatePresence>
                        {allCompleted && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="enterprise-panel mt-8 border-emerald-500/30 bg-emerald-500/[0.07] p-8 text-center"
                            >
                                <h2 className="text-xl font-semibold text-white">
                                    All Daily Challenges Completed
                                </h2>
                                <p className="mt-1 text-sm text-neutral-300">
                                    Consistent daily reflection compounds over months. Check back tomorrow.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            )}
        </div>
    )
}
