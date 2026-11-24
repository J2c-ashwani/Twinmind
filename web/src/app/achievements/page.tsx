'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import api from '@/lib/api'
import { Loader2, Trophy, Lock, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'

interface Achievement {
    id: string
    achievement_name: string
    description: string
    icon: string
    points: number
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
    is_unlocked: boolean
}

export default function AchievementsPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()

    const fallbackAchievements: Achievement[] = [
        {
            id: '1',
            achievement_name: 'First Steps',
            description: 'Initialize your TwinGenie journey',
            icon: '01',
            points: 50,
            rarity: 'common',
            is_unlocked: true,
        },
        {
            id: '2',
            achievement_name: 'Deep Thinker',
            description: 'Complete 10 meaningful conversations',
            icon: '02',
            points: 100,
            rarity: 'common',
            is_unlocked: false,
        },
        {
            id: '3',
            achievement_name: 'Week Warrior',
            description: 'Maintain a 7-day reflection streak',
            icon: '03',
            points: 200,
            rarity: 'rare',
            is_unlocked: false,
        },
        {
            id: '4',
            achievement_name: 'Mindfulness Master',
            description: 'Complete a guided life coach track',
            icon: '04',
            points: 300,
            rarity: 'rare',
            is_unlocked: false,
        },
        {
            id: '5',
            achievement_name: 'Emotion Explorer',
            description: 'Log 30 emotional mood check-ins',
            icon: '05',
            points: 500,
            rarity: 'epic',
            is_unlocked: false,
        },
        {
            id: '6',
            achievement_name: 'Twin Legend',
            description: 'Achieve a 100-day continuous streak',
            icon: '06',
            points: 1000,
            rarity: 'legendary',
            is_unlocked: false,
        },
    ]

    const [achievements, setAchievements] = useState<Achievement[]>(fallbackAchievements)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadAchievements()
    }, [])

    async function loadAchievements() {
        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const response = await api.getAchievements(session.access_token)
            if (response.achievements && response.achievements.length > 0) {
                setAchievements(response.achievements)
            }
        } catch (err) {
            console.error('Failed to load achievements, using fallback:', err)
        } finally {
            setLoading(false)
        }
    }

    const unlockedCount = achievements.filter((a) => a.is_unlocked).length
    const totalCount = achievements.length

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            {loading ? (
                <div className="flex min-h-[70vh] items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-[#D9A760]" />
                </div>
            ) : (
                <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                    <div className="mb-8 flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end">
                        <div>
                            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                                <Trophy className="h-3.5 w-3.5" />
                                Cognitive Milestones
                            </div>
                            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F4F2EC]">
                                Achievements
                            </h1>
                        </div>
                        <div className="enterprise-panel px-5 py-3 text-right">
                            <div className="font-mono text-2xl font-semibold text-[#E7C891]">
                                {unlockedCount} / {totalCount}
                            </div>
                            <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                Unlocked Milestones
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {achievements.map((achievement, index) => (
                            <AchievementCard key={achievement.id} achievement={achievement} index={index} />
                        ))}
                    </div>
                </main>
            )}
        </div>
    )
}

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
    const isUnlocked = achievement.is_unlocked

    const rarityStyle =
        achievement.rarity === 'legendary'
            ? 'border-[#D9A760]/40 bg-[#D9A760]/15 text-[#E7C891]'
            : achievement.rarity === 'epic'
            ? 'border-rose-500/35 bg-rose-500/10 text-rose-300'
            : achievement.rarity === 'rare'
            ? 'border-sky-500/35 bg-sky-500/10 text-sky-300'
            : 'border-white/15 bg-white/[0.04] text-neutral-400'

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`enterprise-panel flex flex-col justify-between p-6 ${
                isUnlocked ? 'border-[#D9A760]/35' : 'opacity-75'
            }`}
        >
            <div>
                <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-[#07080B]">
                        {isUnlocked ? (
                            <Award className="h-5 w-5 text-[#E7C891]" />
                        ) : (
                            <Lock className="h-4 w-4 text-neutral-500" />
                        )}
                    </div>
                    <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${rarityStyle}`}
                    >
                        {achievement.rarity}
                    </span>
                </div>

                <h3 className={`text-base font-semibold ${isUnlocked ? 'text-[#F4F2EC]' : 'text-neutral-300'}`}>
                    {achievement.achievement_name}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-neutral-400">
                    {achievement.description}
                </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/[0.06] pt-4 font-mono text-xs">
                <span className="text-neutral-500">{isUnlocked ? 'UNLOCKED' : 'LOCKED'}</span>
                <span className="font-semibold text-[#E7C891]">{achievement.points} XP</span>
            </div>
        </motion.div>
    )
}
