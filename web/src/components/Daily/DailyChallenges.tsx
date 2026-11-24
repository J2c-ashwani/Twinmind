'use client'

import { useEffect } from 'react'
import { useDailyStore } from '@/store/useStore'
import { apiClient } from '@/lib/api/client'
import { motion } from 'framer-motion'
import { CheckCircle, Circle, Clock, Gift, Sparkles } from 'lucide-react'

export default function DailyChallenges() {
    const { challenges, setChallenges, completeChallenge } = useDailyStore()

    useEffect(() => {
        loadChallenges()
    }, [])

    const loadChallenges = async () => {
        try {
            const data = (await apiClient.getDailyChallenges()) as any
            setChallenges(data || [])
        } catch (error) {
            console.error('Failed to load challenges:', error)
        }
    }

    const handleComplete = async (challengeId: string) => {
        try {
            await apiClient.completeChallenge(challengeId)
            completeChallenge(challengeId)
        } catch (error) {
            console.error('Failed to complete challenge:', error)
        }
    }

    const completedCount = challenges.filter((c) => c.completed).length
    const totalCount = challenges.length
    const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    return (
        <div className="enterprise-panel p-6">
            <div className="mb-5 flex items-center justify-between">
                <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                        Daily Protocol
                    </div>
                    <h2 className="mt-1 text-lg font-semibold text-[#F4F2EC]">Daily Challenges</h2>
                    <p className="text-xs text-neutral-400">
                        {completedCount}/{totalCount} completed today
                    </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#D9A760]/35 bg-[#D9A760]/10 font-mono text-sm font-semibold text-[#E7C891]">
                    {completedCount}/{totalCount}
                </div>
            </div>

            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    className="h-full bg-[#D9A760]"
                />
            </div>

            <div className="space-y-2.5">
                {challenges.map((challenge, index) => (
                    <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`rounded-xl border p-4 transition-all ${
                            challenge.completed
                                ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
                                : 'border-white/[0.08] bg-white/[0.02] hover:border-white/15'
                        }`}
                    >
                        <div className="flex items-center gap-3.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#07080B] text-[#E7C891]">
                                <Sparkles className="h-4 w-4" />
                            </div>

                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-[#F4F2EC]">{challenge.task}</h3>
                                <div className="mt-1 flex items-center gap-4 text-[11px] text-neutral-400">
                                    {challenge.time_window && (
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {challenge.time_window}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-1 text-[#E7C891]">
                                        <Gift className="h-3 w-3" />
                                        {challenge.reward} XP
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => !challenge.completed && handleComplete(challenge.id)}
                                disabled={challenge.completed}
                                className={`rounded-lg p-1.5 transition-colors ${
                                    challenge.completed
                                        ? 'cursor-default text-emerald-400'
                                        : 'text-neutral-500 hover:bg-white/[0.06] hover:text-[#E7C891]'
                                }`}
                            >
                                {challenge.completed ? (
                                    <CheckCircle className="h-6 w-6" />
                                ) : (
                                    <Circle className="h-6 w-6" />
                                )}
                            </button>
                        </div>
                    </motion.div>
                ))}
                {challenges.length === 0 && (
                    <p className="py-4 text-center text-xs text-neutral-500">
                        No challenges active right now.
                    </p>
                )}
            </div>
        </div>
    )
}
