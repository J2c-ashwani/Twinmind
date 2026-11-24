'use client'

import { useEffect } from 'react'
import { useGamificationStore } from '@/store/useStore'
import { apiClient } from '@/lib/api/client'
import { motion } from 'framer-motion'
import { Trophy, Lock, Award } from 'lucide-react'

export default function AchievementGrid() {
    const { achievements, setAchievements } = useGamificationStore()

    useEffect(() => {
        loadAchievements()
    }, [])

    const loadAchievements = async () => {
        try {
            const data = (await apiClient.getAchievements()) as any
            setAchievements(data || [])
        } catch (error) {
            console.error('Failed to load achievements:', error)
        }
    }

    const rarityPill = (rarity: string) => {
        switch (rarity) {
            case 'legendary':
                return 'border-[#D9A760]/40 bg-[#D9A760]/15 text-[#E7C891]'
            case 'epic':
                return 'border-rose-500/35 bg-rose-500/10 text-rose-300'
            case 'rare':
                return 'border-sky-500/35 bg-sky-500/10 text-sky-300'
            default:
                return 'border-white/15 bg-white/[0.04] text-neutral-400'
        }
    }

    return (
        <div className="mx-auto max-w-6xl p-6 text-[#F4F2EC]">
            <div className="mb-8">
                <h1 className="flex items-center gap-3 text-2xl font-semibold">
                    <Trophy className="h-6 w-6 text-[#D9A760]" />
                    <span>Achievements</span>
                </h1>
                <p className="mt-1 font-mono text-xs text-neutral-400">
                    {achievements.length} achievements tracked
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement, index) => (
                    <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`enterprise-panel relative flex flex-col justify-between p-6 ${
                            achievement.unlocked_at ? 'border-[#D9A760]/35' : 'opacity-75'
                        }`}
                    >
                        <div>
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#07080B]">
                                    {achievement.unlocked_at ? (
                                        <Award className="h-5 w-5 text-[#E7C891]" />
                                    ) : (
                                        <Lock className="h-4 w-4 text-neutral-500" />
                                    )}
                                </div>
                                <span
                                    className={`rounded-md border px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${rarityPill(
                                        achievement.rarity
                                    )}`}
                                >
                                    {achievement.rarity}
                                </span>
                            </div>

                            <h3 className="text-base font-semibold text-white">
                                {achievement.achievement_name}
                            </h3>
                            <p className="mt-1.5 text-xs text-neutral-400">{achievement.description}</p>
                        </div>

                        <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-3.5 font-mono text-xs">
                            <span className="text-[#E7C891]">{achievement.points} XP</span>
                            {achievement.unlocked_at && (
                                <span className="text-neutral-500">
                                    {new Date(achievement.unlocked_at).toLocaleDateString()}
                                </span>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    )
}
