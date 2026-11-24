import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Flame, TrendingUp, Shield } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Streak {
    streak_type: string
    effective_streak: number
    longest_streak: number
    status: 'completed_today' | 'at_risk' | 'active' | 'broken'
    days_since_activity: number
    freeze_tokens?: number
    freeze_used_at?: string
}

export default function StreakWidget() {
    const [streak, setStreak] = useState<Streak | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        const init = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session) {
                apiClient.setToken(session.access_token)
                loadStreak()
            } else {
                setIsLoading(false)
            }
        }
        init()
    }, [])

    const loadStreak = async () => {
        try {
            const data = (await apiClient.getGamificationStatus()) as any
            const dailyStreak = data?.streaks?.find((s: Streak) => s.streak_type === 'daily_checkin')
            setStreak(dailyStreak || null)
        } catch (error) {
            console.error('Failed to load streak:', error)
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading) {
        return <div className="enterprise-panel h-48 animate-pulse p-6" />
    }

    if (!streak) {
        return (
            <div className="enterprise-panel p-6">
                <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    <Flame className="h-3.5 w-3.5 text-[#D9A760]" />
                    <span>Daily Streak</span>
                </div>
                <p className="text-2xl font-semibold text-[#F4F2EC]">Start Today</p>
                <p className="mt-1.5 text-xs text-neutral-400">
                    Log a daily reflection or mood check-in to begin your cadence.
                </p>
            </div>
        )
    }

    const statusBadge =
        streak.status === 'completed_today'
            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
            : streak.status === 'at_risk'
            ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
            : streak.status === 'broken'
            ? 'text-neutral-400 border-white/10 bg-white/[0.03]'
            : 'text-[#E7C891] border-[#D9A760]/30 bg-[#D9A760]/10'

    const statusLabel =
        streak.status === 'completed_today'
            ? 'Completed Today'
            : streak.status === 'at_risk'
            ? 'Check in to preserve streak'
            : streak.status === 'broken'
            ? 'Reset — ready to rebuild'
            : 'Active Momentum'

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="enterprise-panel p-6"
        >
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                        Consistency Index
                    </div>
                    <p className="mt-1 text-3xl font-semibold text-[#F4F2EC]">
                        {streak.effective_streak} {streak.effective_streak === 1 ? 'day' : 'days'}
                    </p>
                </div>

                {streak.longest_streak > 0 && (
                    <div className="text-right">
                        <div className="inline-flex items-center gap-1 font-mono text-[10px] text-neutral-500">
                            <TrendingUp className="h-3 w-3" />
                            <span>BEST</span>
                        </div>
                        <p className="font-mono text-lg font-semibold text-neutral-300">
                            {streak.longest_streak}
                        </p>
                    </div>
                )}
            </div>

            <div className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[10px] ${statusBadge}`}>
                {statusLabel}
            </div>

            {streak.freeze_tokens !== undefined && streak.freeze_tokens >= 0 && (
                <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3.5 text-xs">
                    <div className="flex items-center gap-2 text-neutral-300">
                        <Shield className="h-4 w-4 text-sky-400" />
                        <span>
                            Streak Freezes:{' '}
                            <strong className="font-mono text-white">{streak.freeze_tokens}</strong>
                        </span>
                    </div>
                    <span className="font-mono text-[10px] text-neutral-500">Auto-shield</span>
                </div>
            )}

            {streak.effective_streak > 0 && streak.effective_streak < 30 && (
                <div className="mt-4">
                    <div className="mb-1 flex justify-between font-mono text-[10px] text-neutral-500">
                        <span>Next Milestone</span>
                        <span>{streak.effective_streak < 7 ? '7 days' : '30 days'}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${(streak.effective_streak / (streak.effective_streak < 7 ? 7 : 30)) * 100}%`,
                            }}
                            className="h-full bg-[#D9A760]"
                        />
                    </div>
                </div>
            )}
        </motion.div>
    )
}
