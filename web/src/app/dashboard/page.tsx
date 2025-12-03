'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { MessageCircle, ArrowLeft, TrendingUp, Users, Trophy, Sparkles, Brain } from 'lucide-react'
import MoodCheckIn from '../../components/Daily/MoodCheckIn'
import MoodHistory from '../../components/Daily/MoodHistory'
import DailyChallenges from '../../components/Daily/DailyChallenges'
import StreakWidget from '@/components/Gamification/StreakWidget';
import GrowthCircleWidget from '@/components/Circles/GrowthCircleWidget';
import CircleInviteModal from '@/components/Circles/CircleInviteModal';
import WeeklyMotivationCard from '@/components/MotivationCard/WeeklyMotivationCard';
import TwinMatchModal from '@/components/TwinMatch/TwinMatchModal';
import { supabase } from '@/lib/supabase'
import { apiClient } from '@/lib/api/client'

export default function DashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [circleModalOpen, setCircleModalOpen] = useState(false)
    const [currentCircleId, setCurrentCircleId] = useState<string>('')
    const [currentCircleName, setCurrentCircleName] = useState<string>('')
    const [twinMatchOpen, setTwinMatchOpen] = useState(false)

    useEffect(() => {
        checkAuth()
    }, [])

    async function checkAuth() {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            router.push('/login')
        } else {
            // Set token globally for all widgets using apiClient
            if (session.access_token) {
                apiClient.setToken(session.access_token)
            }
            setLoading(false)
        }
    }

    const handleCircleInvite = (circleId: string, circleName: string) => {
        setCurrentCircleId(circleId)
        setCurrentCircleName(circleName)
        setCircleModalOpen(true)
    }

    if (loading) return null

    return (
        <div className="min-h-screen p-6">
            {/* Header */}
            <header className="max-w-6xl mx-auto mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Your Dashboard
                    </h1>
                    <p className="text-gray-400">Track your progress and emotional journey</p>
                </div>
                <div className="flex gap-3 flex-wrap justify-end">
                    <button
                        onClick={() => router.push('/achievements')}
                        className="glass-button flex items-center gap-2 px-4 py-2"
                    >
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <span className="hidden md:inline">Achievements</span>
                    </button>
                    <button
                        onClick={() => router.push('/challenges')}
                        className="glass-button flex items-center gap-2 px-4 py-2"
                    >
                        <Sparkles className="w-5 h-5 text-pink-500" />
                        <span className="hidden md:inline">Challenges</span>
                    </button>
                    <button
                        onClick={() => router.push('/memories')}
                        className="glass-button flex items-center gap-2 px-4 py-2"
                    >
                        <Brain className="w-5 h-5 text-purple-500" />
                        <span className="hidden md:inline">Memories</span>
                    </button>
                    <button
                        onClick={() => setTwinMatchOpen(true)}
                        className="glass-button flex items-center gap-2 px-4 py-2"
                    >
                        <Users className="w-5 h-5" />
                        <span className="hidden md:inline">Twin Match</span>
                    </button>
                    <button
                        onClick={() => router.push('/growth-story')}
                        className="glass-button flex items-center gap-2 px-4 py-2"
                    >
                        <TrendingUp className="w-5 h-5" />
                        <span className="hidden md:inline">Growth</span>
                    </button>
                    <button
                        onClick={() => router.push('/chat')}
                        className="glass-button flex items-center gap-2 px-4 py-2"
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span className="hidden md:inline">Chat</span>
                    </button>
                </div>
            </header>

            {/* Content Grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Widgets */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <StreakWidget />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                >
                    <GrowthCircleWidget
                        onInviteClick={(circleId, circleName) => {
                            console.log('Invite clicked:', circleId, circleName);
                            setCurrentCircleId(circleId);
                            setCurrentCircleName(circleName);
                            setCircleModalOpen(true);
                        }}
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <MoodCheckIn isOpen={false} onClose={() => { }} />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 }}
                >
                    <DailyChallenges />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <MoodHistory />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                >
                    <WeeklyMotivationCard />
                </motion.div>
            </div>

            {/* Circle Invite Modal */}
            {circleModalOpen && (
                <CircleInviteModal
                    isOpen={circleModalOpen}
                    onClose={() => setCircleModalOpen(false)}
                    circleId={currentCircleId}
                    circleName={currentCircleName}
                />
            )}

            {/* Twin Match Modal */}
            <TwinMatchModal
                isOpen={twinMatchOpen}
                onClose={() => setTwinMatchOpen(false)}
            />
        </div>
    )
}
