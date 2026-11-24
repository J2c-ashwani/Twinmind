'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserStore } from '@/store/useStore'
import { motion } from 'framer-motion'
import { User, LogOut, Settings, Crown, Zap, Users, TrendingUp } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import StreakWidget from '@/components/Gamification/StreakWidget'
import GrowthCircleWidget from '@/components/Circles/GrowthCircleWidget'
import MoodHistory from '@/components/Daily/MoodHistory'
import WeeklyMotivationCard from '@/components/MotivationCard/WeeklyMotivationCard'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'
import { apiClient } from '@/lib/api/client'

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const { user, logout } = useUserStore()
    const [isHydrated, setIsHydrated] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        apiClient.clearToken()
        logout()
        router.refresh()
        router.push('/login')
    }

    useEffect(() => {
        setIsHydrated(true)
    }, [])

    useEffect(() => {
        if (isHydrated && !user) {
            router.push('/login')
        }
    }, [isHydrated, user, router])

    if (!isHydrated || !user) {
        return null
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="enterprise-panel p-8"
                >
                    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-[#D9A760]/40 bg-[#141822]">
                            <User className="h-9 w-9 text-[#E7C891]" />
                        </div>
                        <div className="flex-1">
                            <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                                Identity Profile
                            </div>
                            <h1 className="mt-1 text-2xl font-semibold text-white">
                                {user.name || user.email}
                            </h1>
                            <p className="text-sm text-neutral-400">{user.email}</p>
                            {user.is_pro && (
                                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[#D9A760]/35 bg-[#D9A760]/10 px-3 py-1 font-mono text-[11px] font-medium text-[#E7C891]">
                                    <Crown className="h-3.5 w-3.5" />
                                    <span>Pro Member</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                <div className="grid gap-4 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => router.push('/chat')}
                        className="enterprise-panel-hover p-6 text-left"
                    >
                        <Zap className="mb-3 h-5 w-5 text-[#D9A760]" />
                        <h3 className="text-base font-semibold text-white">Continue Twin Session</h3>
                        <p className="mt-1 text-xs text-neutral-400">Open your calibrated conversation workspace</p>
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/settings')}
                        className="enterprise-panel-hover p-6 text-left"
                    >
                        <Settings className="mb-3 h-5 w-5 text-sky-400" />
                        <h3 className="text-base font-semibold text-white">Preferences &amp; Privacy</h3>
                        <p className="mt-1 text-xs text-neutral-400">Manage AI mode defaults, history, and deletion</p>
                    </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <StreakWidget />
                    <GrowthCircleWidget />
                    <MoodHistory />
                    <WeeklyMotivationCard />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <button
                        type="button"
                        onClick={() => router.push('/growth-story')}
                        className="btn-secondary-obsidian py-3.5 text-sm"
                    >
                        <TrendingUp className="h-4 w-4 text-emerald-400" />
                        <span>View Growth Story</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push('/twin-match')}
                        className="btn-secondary-obsidian py-3.5 text-sm"
                    >
                        <Users className="h-4 w-4 text-[#D9A760]" />
                        <span>Twin Match Compatibility</span>
                    </button>
                </div>

                <div className="enterprise-panel space-y-3 p-6">
                    <h2 className="text-base font-semibold text-white">Account Governance</h2>
                    {!user.is_pro && (
                        <button
                            type="button"
                            onClick={() => router.push('/subscription')}
                            className="btn-primary-ivory w-full py-3 text-sm"
                        >
                            <Crown className="h-4 w-4" />
                            <span>Explore Pro Membership</span>
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 py-3 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/15"
                    >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </main>
        </div>
    )
}
