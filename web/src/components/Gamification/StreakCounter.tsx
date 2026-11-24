'use client'

import { useEffect } from 'react'
import { useGamificationStore } from '@/store/useStore'
import { apiClient } from '@/lib/api/client'
import { Flame, TrendingUp } from 'lucide-react'

export default function StreakCounter() {
    const { streaks, setStreaks } = useGamificationStore()

    useEffect(() => {
        loadStreaks()
    }, [])

    const loadStreaks = async () => {
        try {
            const data = (await apiClient.getStreaks()) as any
            setStreaks(data || [])
        } catch (error) {
            console.error('Failed to load streaks:', error)
        }
    }

    const dailyStreak = streaks.find((s) => s.streak_type === 'daily_checkin')
    if (!dailyStreak) return null

    const getStreakMessage = (streak: number) => {
        if (streak >= 90) return 'Sustained longitudinal discipline.'
        if (streak >= 30) return 'Strong 30-day behavioral habit.'
        if (streak >= 7) return 'Consistent weekly cadence.'
        if (streak >= 3) return 'Building steady momentum.'
        return 'Begin your reflection streak.'
    }

    return (
        <div className="enterprise-panel p-6">
            <div className="mb-5 text-center">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-[#D9A760]/40 bg-[#D9A760]/10 px-6 py-3.5 text-[#E7C891]">
                    <Flame className="h-6 w-6" />
                    <div className="text-left">
                        <div className="text-3xl font-semibold text-[#F4F2EC]">
                            {dailyStreak.current_streak}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-[#E7C891]">
                            Day Streak
                        </div>
                    </div>
                </div>
            </div>

            <p className="mb-6 text-center text-xs font-medium text-neutral-300">
                {getStreakMessage(dailyStreak.current_streak)}
            </p>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/[0.07] bg-[#0B0D12] p-4">
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase text-neutral-500">
                        <TrendingUp className="h-3.5 w-3.5 text-[#D9A760]" />
                        <span>Longest</span>
                    </div>
                    <div className="text-xl font-semibold text-white">{dailyStreak.longest_streak} days</div>
                </div>

                <div className="rounded-xl border border-white/[0.07] bg-[#0B0D12] p-4">
                    <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase text-neutral-500">
                        <Flame className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Current</span>
                    </div>
                    <div className="text-xl font-semibold text-white">{dailyStreak.current_streak} days</div>
                </div>
            </div>

            <div className="mt-5">
                <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                    Last 7 Days
                </div>
                <div className="flex gap-1.5">
                    {[...Array(7)].map((_, i) => (
                        <div
                            key={i}
                            className={`h-8 flex-1 rounded-md ${
                                i < dailyStreak.current_streak
                                    ? 'bg-[#D9A760]'
                                    : 'border border-white/[0.06] bg-white/[0.02]'
                            }`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
