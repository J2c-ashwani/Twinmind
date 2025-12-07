'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import api from '@/lib/api'
import { Loader2, CheckCircle2, Circle, Clock, Gift, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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

    // Fallback challenges for when API is unavailable
    const fallbackChallenges: DailyChallenge[] = [
        { id: '1', task: 'Start your day with a morning reflection', type: 'morning_reflection', reward: 25, time_window: '6AM - 10AM', completed: false },
        { id: '2', task: 'Share 3 things you\'re grateful for today', type: 'gratitude_moment', reward: 30, time_window: 'Anytime', completed: false },
        { id: '3', task: 'Reflect on your wins from today', type: 'evening_wins', reward: 25, time_window: '6PM - 11PM', completed: false },
        { id: '4', task: 'Open up about something you\'ve been avoiding', type: 'vulnerability_challenge', reward: 50, time_window: 'Anytime', completed: false }
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
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const response = await api.getDailyChallenges(session.access_token)
            if (response.challenges && response.challenges.length > 0) {
                setChallenges(response.challenges)
            }
        } catch (err: any) {
            console.error('Failed to load challenges, using fallback:', err)
            // Keep using fallback challenges
        } finally {
            setLoading(false)
        }
    }

    async function completeChallenge(challengeId: string) {
        try {
            setCompletingId(challengeId)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            await api.completeChallenge(challengeId, session.access_token)

            // Update local state
            setChallenges(prev =>
                prev.map(c =>
                    c.id === challengeId ? { ...c, completed: true } : c
                )
            )
        } catch (err: any) {
            setError(err.message)
        } finally {
            setCompletingId(null)
        }
    }

    const completedCount = challenges.filter(c => c.completed).length
    const totalCount = challenges.length
    const allCompleted = totalCount > 0 && completedCount === totalCount
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

    function getChallengeIcon(type: string): string {
        const iconMap: Record<string, string> = {
            morning_reflection: '☀️',
            gratitude_moment: '🙏',
            evening_wins: '🌟',
            vulnerability_challenge: '💙'
        }
        return iconMap[type] || '✨'
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] via-[#1A0B2E] to-[#0F0F1E] flex items-center justify-center">
                <Loader2 className="w-8 h-8 anim ate-spin text-purple-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] via-[#1A0B2E] to-[#0F0F1E] text-white">
            {/* Header with Progress */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[32px] p-8 mb-6">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <Sparkles className="w-8 h-8" />
                        <h1 className="text-3xl font-bold">Daily Challenges</h1>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <div className="text-xl font-semibold">Today's Progress</div>
                        <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-lg font-bold">
                            {completedCount}/{totalCount}
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-white"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                </div>
            </div>

            {/* Challenge List */}
            <div className="max-w-4xl mx-auto px-4 pb-12">
                {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                <div className="space-y-4">
                    {challenges.map((challenge, index) => (
                        <motion.div
                            key={challenge.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 ${challenge.completed
                                ? 'border-green-500/50'
                                : 'border-white/10'
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                {/* Icon */}
                                <div className="text-4xl shrink-0">
                                    {getChallengeIcon(challenge.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold mb-2">
                                        {challenge.task}
                                    </h3>

                                    <div className="flex items-center gap-4 text-sm text-gray-400">
                                        {challenge.time_window && (
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-4 h-4" />
                                                <span>{challenge.time_window}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1 text-purple-400">
                                            <Gift className="w-4 h-4" />
                                            <span className="font-semibold">
                                                {challenge.reward} XP
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Complete Button */}
                                <button
                                    onClick={() => completeChallenge(challenge.id)}
                                    disabled={challenge.completed || completingId === challenge.id}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${challenge.completed
                                        ? 'bg-green-500 cursor-default'
                                        : 'bg-white/10 hover:bg-white/20 cursor-pointer'
                                        }`}
                                >
                                    {completingId === challenge.id ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : challenge.completed ? (
                                        <CheckCircle2 className="w-7 h-7 text-white" />
                                    ) : (
                                        <Circle className="w-7 h-7 text-gray-400" />
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* All Completed Message */}
                <AnimatePresence>
                    {allCompleted && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="mt-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 text-center"
                        >
                            <div className="text-5xl mb-4">🎉</div>
                            <h2 className="text-2xl font-bold mb-2">
                                All challenges completed!
                            </h2>
                            <p className="text-white/80">
                                Come back tomorrow for new challenges!
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {challenges.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400 text-lg">No challenges available</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Check back tomorrow!
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
