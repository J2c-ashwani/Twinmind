'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import api from '@/lib/api'
import { Loader2, Trophy, Lock } from 'lucide-react'
import { motion } from 'framer-motion'

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

    // Fallback achievements for when API is unavailable
    const fallbackAchievements: Achievement[] = [
        { id: '1', achievement_name: 'First Steps', description: 'Start your TwinMind journey', icon: '🚀', points: 50, rarity: 'common', is_unlocked: true },
        { id: '2', achievement_name: 'Deep Thinker', description: 'Complete 10 meaningful conversations', icon: '🧠', points: 100, rarity: 'common', is_unlocked: false },
        { id: '3', achievement_name: 'Week Warrior', description: 'Maintain a 7-day streak', icon: '🔥', points: 200, rarity: 'rare', is_unlocked: false },
        { id: '4', achievement_name: 'Mindfulness Master', description: 'Complete a life coach program', icon: '🧘', points: 300, rarity: 'rare', is_unlocked: false },
        { id: '5', achievement_name: 'Emotion Explorer', description: 'Log 30 mood check-ins', icon: '💜', points: 500, rarity: 'epic', is_unlocked: false },
        { id: '6', achievement_name: 'Twin Legend', description: 'Achieve 100-day streak', icon: '👑', points: 1000, rarity: 'legendary', is_unlocked: false }
    ]

    const [achievements, setAchievements] = useState<Achievement[]>(fallbackAchievements)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        loadAchievements()
    }, [])

    async function loadAchievements() {
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const response = await api.getAchievements(session.access_token)
            if (response.achievements && response.achievements.length > 0) {
                setAchievements(response.achievements)
            }
        } catch (err: any) {
            console.error('Failed to load achievements, using fallback:', err)
            // Keep using fallback achievements
        } finally {
            setLoading(false)
        }
    }

    const unlockedCount = achievements.filter(a => a.is_unlocked).length
    const totalCount = achievements.length

    function getRarityColors(rarity: string): string[] {
        const colorMap = {
            legendary: ['#FBBF24', '#F59E0B'], // Golden
            epic: ['#8B5CF6', '#7C3AED'],       // Purple
            rare: ['#3B82F6', '#2563EB'],       // Blue
            common: ['#6B7280', '#4B5563']      // Gray
        }
        return colorMap[rarity as keyof typeof colorMap] || colorMap.common
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] via-[#1A0B2E] to-[#0F0F1E] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] via-[#1A0B2E] to-[#0F0F1E] text-white">
            {/* Header with Stats */}
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-b-[32px] p-8 mb-6">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-6">
                        <Trophy className="w-8 h-8" />
                        <h1 className="text-3xl font-bold">Achievements</h1>
                    </div>
                    <div className="text-center">
                        <div className="text-5xl font-bold mb-2">
                            {unlockedCount} / {totalCount}
                        </div>
                        <div className="text-lg opacity-90">
                            Achievements Unlocked
                        </div>
                    </div>
                </div>
            </div>

            {/* Achievement Grid */}
            <div className="max-w-6xl mx-auto px-4 pb-12">
                {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {achievements.map((achievement, index) => (
                        <AchievementCard
                            key={achievement.id}
                            achievement={achievement}
                            index={index}
                        />
                    ))}
                </div>

                {achievements.length === 0 && !loading && (
                    <div className="text-center py-12">
                        <Trophy className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <p className="text-gray-400 text-lg">No achievements yet</p>
                        <p className="text-gray-500 text-sm mt-2">
                            Keep using TwinMind to unlock achievements!
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
    const [colors0, colors1] = getRarityColors(achievement.rarity)
    const isUnlocked = achievement.is_unlocked

    function getRarityColors(rarity: string): [string, string] {
        const colorMap = {
            legendary: ['#FBBF24', '#F59E0B'] as [string, string],
            epic: ['#8B5CF6', '#7C3AED'] as [string, string],
            rare: ['#3B82F6', '#2563EB'] as [string, string],
            common: ['#6B7280', '#4B5563'] as [string, string]
        }
        return colorMap[rarity as keyof typeof colorMap] || colorMap.common
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border-2 ${isUnlocked ? 'border-white/20' : 'border-white/5'
                }`}
            style={{
                boxShadow: isUnlocked
                    ? `0 4px 12px ${colors0}50`
                    : '0 2px 8px rgba(0,0,0,0.2)'
            }}
        >
            {/* Rarity Badge */}
            <div
                className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white"
                style={{
                    background: `linear-gradient(135deg, ${colors0}, ${colors1})`
                }}
            >
                {achievement.rarity.toUpperCase()}
            </div>

            {/* Icon */}
            <div className="flex items-center justify-center mb-4 relative">
                <span
                    className="text-5xl"
                    style={{
                        opacity: isUnlocked ? 1 : 0.3,
                        filter: isUnlocked ? 'none' : 'grayscale(100%)'
                    }}
                >
                    {achievement.icon}
                </span>
                {!isUnlocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-gray-400" />
                    </div>
                )}
            </div>

            {/* Name */}
            <h3
                className={`text-center text-lg font-semibold mb-2 ${isUnlocked ? 'text-white' : 'text-gray-400'
                    }`}
            >
                {achievement.achievement_name}
            </h3>

            {/* Description */}
            <p
                className={`text-center text-sm mb-4 line-clamp-2 ${isUnlocked ? 'text-gray-300' : 'text-gray-500'
                    }`}
            >
                {achievement.description}
            </p>

            {/* XP Badge */}
            <div className="flex justify-center">
                <div
                    className="px-4 py-2 rounded-full text-white text-sm font-bold"
                    style={{
                        background: 'linear-gradient(135deg, #8B5CF6, #EC4899)'
                    }}
                >
                    {achievement.points} XP
                </div>
            </div>
        </motion.div>
    )
}
