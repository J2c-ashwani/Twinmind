'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
    MessageCircle,
    TrendingUp,
    Users,
    Trophy,
    Sparkles,
    Brain,
    SmilePlus,
} from 'lucide-react'
import MoodCheckIn from '../../components/Daily/MoodCheckIn'
import MoodHistory from '../../components/Daily/MoodHistory'
import DailyChallenges from '../../components/Daily/DailyChallenges'
import StreakWidget from '@/components/Gamification/StreakWidget'
import GrowthCircleWidget from '@/components/Circles/GrowthCircleWidget'
import CircleInviteModal from '@/components/Circles/CircleInviteModal'
import WeeklyMotivationCard from '@/components/MotivationCard/WeeklyMotivationCard'
import TwinMatchModal from '@/components/TwinMatch/TwinMatchModal'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { apiClient } from '@/lib/api/client'

export default function DashboardPage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const [loading, setLoading] = useState(true)
    const [circleModalOpen, setCircleModalOpen] = useState(false)
    const [currentCircleId, setCurrentCircleId] = useState('')
    const [currentCircleName, setCurrentCircleName] = useState('')
    const [twinMatchOpen, setTwinMatchOpen] = useState(false)
    const [moodCheckInOpen, setMoodCheckInOpen] = useState(false)

    useEffect(() => {
        checkAuth()
    }, [])

    async function checkAuth() {
        const {
            data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
            router.push('/login')
        } else {
            if (session.access_token) {
                apiClient.setToken(session.access_token)
            }
            setLoading(false)
        }
    }

    if (loading) return null

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <header className="mb-8 flex flex-col justify-between gap-4 border-b border-white/[0.08] pb-6 md:flex-row md:items-end">
                    <div>
                        <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                            Cognitive Workspace
                        </div>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F4F2EC]">
                            Personal Growth Overview
                        </h1>
                        <p className="mt-1 text-sm text-neutral-400">
                            Track emotional cadence, memory continuity, and daily reflection momentum.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setMoodCheckInOpen(true)}
                            className="btn-secondary-obsidian px-3.5 py-2 text-xs"
                        >
                            <SmilePlus className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Log Mood</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/achievements')}
                            className="btn-secondary-obsidian px-3.5 py-2 text-xs"
                        >
                            <Trophy className="h-3.5 w-3.5 text-[#D9A760]" />
                            <span>Achievements</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/challenges')}
                            className="btn-secondary-obsidian px-3.5 py-2 text-xs"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                            <span>Challenges</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/memories')}
                            className="btn-secondary-obsidian px-3.5 py-2 text-xs"
                        >
                            <Brain className="h-3.5 w-3.5 text-[#E7C891]" />
                            <span>Memories</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setTwinMatchOpen(true)}
                            className="btn-secondary-obsidian px-3.5 py-2 text-xs"
                        >
                            <Users className="h-3.5 w-3.5 text-neutral-300" />
                            <span>Twin Match</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/growth-story')}
                            className="btn-secondary-obsidian px-3.5 py-2 text-xs"
                        >
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Growth Story</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/chat')}
                            className="btn-primary-ivory px-4 py-2 text-xs"
                        >
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>Open Twin Chat</span>
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 }}
                    >
                        <StreakWidget />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <GrowthCircleWidget
                            onInviteClick={(circleId, circleName) => {
                                setCurrentCircleId(circleId)
                                setCurrentCircleName(circleName)
                                setCircleModalOpen(true)
                            }}
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 }}
                    >
                        <MoodHistory />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        <DailyChallenges />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                    >
                        <WeeklyMotivationCard />
                    </motion.div>
                </div>
            </main>

            <MoodCheckIn isOpen={moodCheckInOpen} onClose={() => setMoodCheckInOpen(false)} />

            {circleModalOpen && (
                <CircleInviteModal
                    isOpen={circleModalOpen}
                    onClose={() => setCircleModalOpen(false)}
                    circleId={currentCircleId}
                    circleName={currentCircleName}
                />
            )}

            <TwinMatchModal isOpen={twinMatchOpen} onClose={() => setTwinMatchOpen(false)} />
        </div>
    )
}
