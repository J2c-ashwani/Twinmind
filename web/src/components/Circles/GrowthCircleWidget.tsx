import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Flame, UserPlus, Crown, Award } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Circle {
    id: string
    name: string
    collective_streak: number
    member_count: number
    user_role: string
}

interface CircleWidgetProps {
    onInviteClick?: (circleId: string, circleName: string) => void
}

export default function GrowthCircleWidget({ onInviteClick }: CircleWidgetProps) {
    const [circle, setCircle] = useState<Circle | null>(null)
    const [progress, setProgress] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        const init = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session) {
                apiClient.setToken(session.access_token)
                loadCircle()
            } else {
                setIsLoading(false)
            }
        }
        init()
    }, [])

    const loadCircle = async () => {
        try {
            const data = (await apiClient.getMyCircle()) as any
            if (data?.circle) {
                setCircle(data.circle)
                const progressData = await apiClient.getCircleProgress(data.circle.id)
                setProgress(progressData)
            }
        } catch (error) {
            console.error('Failed to load circle:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const getNextMilestone = () => {
        if (!progress) return null
        const streak = progress.collective_streak || 0
        if (streak < 10) return { days: 10, name: 'Circle Insights' }
        if (streak < 30) return { days: 30, name: 'Wisdom Twin' }
        if (streak < 90) return { days: 90, name: 'Circle Challenges' }
        return null
    }

    const getMilestoneProgress = () => {
        const next = getNextMilestone()
        if (!next || !progress) return 0
        return (progress.collective_streak / next.days) * 100
    }

    const handleCreateCircle = async () => {
        try {
            const data = (await apiClient.createCircle('My Growth Circle')) as any
            if (data?.circle) {
                setCircle(data.circle)
                const progressData = (await apiClient.getCircleProgress(data.circle.id)) as any
                setProgress(progressData)
            }
        } catch (error: any) {
            console.error('Failed to create circle:', error)
            alert(error.message || 'Failed to create circle. Please try again.')
        }
    }

    if (isLoading) {
        return <div className="enterprise-panel h-48 animate-pulse p-6" />
    }

    if (!circle) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="enterprise-panel p-6"
            >
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                    <Users className="h-3.5 w-3.5" />
                    <span>Growth Circle</span>
                </div>
                <p className="text-lg font-semibold text-[#F4F2EC]">Create Your Circle</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-400">
                    Connect with up to 5 trusted peers to share streak momentum privately.
                </p>
                <button
                    type="button"
                    onClick={handleCreateCircle}
                    className="btn-secondary-obsidian mt-4 w-full py-2 text-xs"
                >
                    Create Private Circle
                </button>
            </motion.div>
        )
    }

    const nextMilestone = getNextMilestone()

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="enterprise-panel p-6"
        >
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#07080B]">
                        <Users className="h-4 w-4 text-[#D9A760]" />
                        {circle.user_role === 'creator' && (
                            <Crown className="absolute -right-1 -top-1 h-3 w-3 text-[#E7C891]" />
                        )}
                    </div>
                    <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                            Growth Circle
                        </p>
                        <p className="text-sm font-semibold text-[#F4F2EC]">{circle.name}</p>
                    </div>
                </div>
                <span className="font-mono text-xs text-neutral-400">{circle.member_count}/5</span>
            </div>

            <div className="mb-4 rounded-xl border border-white/[0.06] bg-[#0B0D12] p-3.5">
                <div className="flex items-center gap-3">
                    <Flame className="h-5 w-5 text-[#D9A760]" />
                    <div className="flex-1">
                        <p className="font-mono text-[10px] uppercase text-neutral-500">Collective Streak</p>
                        <p className="text-xl font-semibold text-white">
                            {progress?.collective_streak || 0} days
                        </p>
                    </div>
                    {progress?.milestones?.length > 0 && <Award className="h-4 w-4 text-emerald-400" />}
                </div>
            </div>

            {nextMilestone && (
                <div className="mb-4">
                    <div className="mb-1.5 flex justify-between font-mono text-[10px] text-neutral-500">
                        <span>Next: {nextMilestone.name}</span>
                        <span>{nextMilestone.days} days</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${getMilestoneProgress()}%` }}
                            className="h-full bg-[#D9A760]"
                        />
                    </div>
                </div>
            )}

            {circle.member_count < 5 ? (
                <button
                    type="button"
                    onClick={() => onInviteClick?.(circle.id, circle.name)}
                    className="btn-secondary-obsidian w-full py-2 text-xs"
                >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Invite Peers ({5 - circle.member_count} open)</span>
                </button>
            ) : (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-center font-mono text-[11px] text-emerald-300">
                    Circle Full (5/5)
                </div>
            )}
        </motion.div>
    )
}
