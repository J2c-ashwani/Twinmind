'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { apiClient } from '@/lib/api/client'
import { motion } from 'framer-motion'
import { TrendingUp, MessageCircle, Heart, Target, Sparkles } from 'lucide-react'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from 'recharts'

export default function WeeklyInsights() {
    const [insights, setInsights] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadInsights()
    }, [])

    const loadInsights = async () => {
        try {
            const supabase = createClientComponentClient()
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session) apiClient.setToken(session.access_token)

            const data = await apiClient.getWeeklyInsights()
            setInsights(data)
        } catch (error) {
            console.error('Failed to load insights:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            {loading ? (
                <div className="flex min-h-[70vh] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D9A760] border-t-transparent" />
                </div>
            ) : !insights ? (
                <div className="mx-auto max-w-4xl px-4 py-16 text-center">
                    <div className="enterprise-panel p-10">
                        <h1 className="text-xl font-semibold text-white">No Weekly Insights Available Yet</h1>
                        <p className="mt-2 text-sm text-neutral-400">
                            Continue reflecting with your Twin to unlock your weekly cognitive telemetry report.
                        </p>
                    </div>
                </div>
            ) : (
                <main className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
                    <div className="border-b border-white/[0.08] pb-6">
                        <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                            Longitudinal Telemetry
                        </div>
                        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F4F2EC]">
                            Weekly Cognitive Insights
                        </h1>
                        <p className="mt-1 font-mono text-xs text-neutral-400">
                            {new Date(insights.week_start).toLocaleDateString()} —{' '}
                            {new Date(insights.week_end).toLocaleDateString()}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: 'Messages', val: insights.total_messages, icon: MessageCircle, color: 'text-sky-400' },
                            {
                                label: 'Mood Shift',
                                val: `+${insights.mood_improvement}%`,
                                icon: TrendingUp,
                                color: 'text-emerald-400',
                            },
                            { label: 'Trust Index', val: insights.trust_score, icon: Heart, color: 'text-[#E7C891]' },
                            { label: 'Day Streak', val: insights.streak_days, icon: Target, color: 'text-rose-400' },
                        ].map((stat, idx) => {
                            const Icon = stat.icon
                            return (
                                <motion.div
                                    key={stat.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="enterprise-panel p-6"
                                >
                                    <Icon className={`h-5 w-5 ${stat.color}`} />
                                    <div className="mt-4 text-3xl font-semibold text-[#F4F2EC]">{stat.val}</div>
                                    <div className="mt-1 font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                                        {stat.label}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <div className="enterprise-panel p-6">
                            <h2 className="mb-5 text-lg font-semibold text-[#F4F2EC]">Emotional Trends</h2>
                            <ResponsiveContainer width="100%" height={280}>
                                <LineChart data={insights.emotional_timeline}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                    <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#0D1016',
                                            borderColor: 'rgba(255,255,255,0.12)',
                                            color: '#F4F2EC',
                                        }}
                                    />
                                    <Line type="monotone" dataKey="trust" stroke="#D9A760" strokeWidth={2} name="Trust" />
                                    <Line
                                        type="monotone"
                                        dataKey="dependency"
                                        stroke="#F7768E"
                                        strokeWidth={2}
                                        name="Dependency"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="valence"
                                        stroke="#56B886"
                                        strokeWidth={2}
                                        name="Mood"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="enterprise-panel p-6">
                            <h2 className="mb-5 text-lg font-semibold text-[#F4F2EC]">Personality Radar</h2>
                            <ResponsiveContainer width="100%" height={280}>
                                <RadarChart data={insights.personality_data}>
                                    <PolarGrid stroke="rgba(255,255,255,0.12)" />
                                    <PolarAngleAxis dataKey="trait" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#6b7280', fontSize: 10 }} />
                                    <Radar
                                        name="Your Profile"
                                        dataKey="score"
                                        stroke="#D9A760"
                                        fill="#D9A760"
                                        fillOpacity={0.35}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="enterprise-panel p-6">
                        <h2 className="mb-4 text-lg font-semibold text-[#F4F2EC]">Recurring Themes</h2>
                        <div className="flex flex-wrap gap-2.5">
                            {(insights.top_topics || []).map((topic: any) => (
                                <span
                                    key={topic.name}
                                    className="rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-medium text-neutral-200"
                                >
                                    {topic.name} <span className="font-mono text-[#E7C891]">({topic.count})</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="enterprise-panel border-[#D9A760]/30 bg-[#11131A] p-6">
                        <div className="mb-4 flex items-center gap-2.5">
                            <Sparkles className="h-5 w-5 text-[#D9A760]" />
                            <h2 className="text-lg font-semibold text-[#F4F2EC]">AI Synthesis Observations</h2>
                        </div>
                        <div className="space-y-3">
                            {(insights.ai_observations || []).map((observation: string, index: number) => (
                                <p
                                    key={index}
                                    className="border-l-2 border-[#D9A760]/50 pl-4 text-sm leading-relaxed text-neutral-300"
                                >
                                    {observation}
                                </p>
                            ))}
                        </div>
                    </div>
                </main>
            )}
        </div>
    )
}
