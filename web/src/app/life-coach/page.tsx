'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { apiClient } from '@/lib/api/client'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, Heart, Brain, Zap } from 'lucide-react'
import Link from 'next/link'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'

export default function LifeCoachPage() {
    const router = useRouter()
    const [programs, setPrograms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        loadPrograms()
    }, [])

    const loadPrograms = async () => {
        try {
            const supabase = createClientComponentClient()
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (!session?.access_token) {
                router.push('/login')
                return
            }
            apiClient.setToken(session.access_token)

            const data = await apiClient.getLifeCoachPrograms()
            setPrograms(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Failed to load programs:', err)
            setPrograms([])
            setError('Life Coach programs are unavailable right now. Please try again later.')
        } finally {
            setLoading(false)
        }
    }

    const getIcon = (category: string) => {
        switch (category) {
            case 'anxiety':
                return <Heart className="h-5 w-5 text-emerald-400" />
            case 'growth':
                return <Zap className="h-5 w-5 text-[#E7C891]" />
            default:
                return <Brain className="h-5 w-5 text-sky-400" />
        }
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mb-10 border-b border-white/[0.08] pb-6">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                        Structured Coaching Sprints
                    </div>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F4F2EC]">
                        AI Life Coach Programs
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                        Multi-day guided clarity exercises grounded in your calibrated psychometric baseline.
                    </p>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="enterprise-panel h-64 animate-pulse p-6" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {error && (
                            <div className="col-span-full rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                                {error}
                            </div>
                        )}

                        {!error && programs.length === 0 && (
                            <div className="enterprise-panel col-span-full p-10 text-center text-sm text-neutral-400">
                                No Life Coach programs are available yet.
                            </div>
                        )}

                        {programs.map((program, index) => (
                            <motion.div
                                key={program.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.06 }}
                                className="enterprise-panel-hover flex flex-col justify-between p-6"
                            >
                                <div>
                                    <div className="mb-5 flex items-start justify-between">
                                        <div className="rounded-xl border border-white/10 bg-[#07080B] p-3">
                                            {getIcon(program.category)}
                                        </div>
                                        {program.is_premium && (
                                            <span className="inline-flex items-center gap-1 rounded-full border border-[#D9A760]/30 bg-[#D9A760]/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase text-[#E7C891]">
                                                <Lock className="h-3 w-3" /> Pro
                                            </span>
                                        )}
                                    </div>

                                    <h2 className="text-lg font-semibold text-[#F4F2EC]">{program.title}</h2>
                                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                                        {program.description}
                                    </p>

                                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 font-mono text-[11px] text-neutral-400">
                                        <span>{program.duration_days} Days</span>
                                        <span className="uppercase">{program.category}</span>
                                    </div>
                                </div>

                                <Link
                                    href={`/life-coach/${program.id}`}
                                    className="btn-primary-ivory mt-6 w-full py-2.5 text-xs"
                                >
                                    <span>Start Session</span>
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
