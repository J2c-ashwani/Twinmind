'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api/client'
import { Brain, Calendar, MessageSquare } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'

interface Memory {
    id: string
    title: string
    description?: string
    created_at: string
    memory_type?: string
    metadata?: {
        emotion?: string
        topics?: string[]
    }
}

export default function MemoriesPage() {
    const [memories, setMemories] = useState<Memory[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClientComponentClient()

    useEffect(() => {
        const init = async () => {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session) {
                apiClient.setToken(session.access_token)
                loadMemories()
            } else {
                setLoading(false)
            }
        }
        init()
    }, [])

    const loadMemories = async () => {
        try {
            const data = (await apiClient.getMemoryTimeline(50)) as any
            setMemories(Array.isArray(data) ? data : data?.memories || [])
        } catch (error) {
            console.error('Failed to load memories:', error)
        } finally {
            setLoading(false)
        }
    }

    const groupByDate = (items: Memory[]) => {
        const groups: Record<string, Memory[]> = {}
        items.forEach((memory) => {
            const date = new Date(memory.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            if (!groups[date]) groups[date] = []
            groups[date].push(memory)
        })
        return groups
    }

    const groupedMemories = groupByDate(memories)

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
                <div className="mb-8 border-b border-white/[0.08] pb-6">
                    <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                        1536-Dim Semantic Context
                    </div>
                    <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#F4F2EC]">
                        Memory Timeline
                    </h1>
                    <p className="mt-1 text-sm text-neutral-400">
                        Key reflections and life context indexed by your digital twin.
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D9A760] border-t-transparent" />
                    </div>
                ) : memories.length === 0 ? (
                    <div className="enterprise-panel py-16 text-center">
                        <Brain className="mx-auto mb-4 h-10 w-10 text-[#D9A760]" />
                        <h2 className="text-xl font-semibold text-white">No Memories Indexed Yet</h2>
                        <p className="mt-2 text-sm text-neutral-400">
                            Start conversing with your Twin to accumulate persistent context.
                        </p>
                        <Link href="/chat" className="btn-primary-ivory mt-6 px-6 py-2.5 text-xs">
                            <MessageSquare className="h-4 w-4" />
                            <span>Open Twin Chat</span>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedMemories).map(([date, dayMemories], index) => (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <div className="mb-4 flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-[#D9A760]" />
                                    <h2 className="text-sm font-semibold text-[#F4F2EC]">{date}</h2>
                                    <div className="h-px flex-1 bg-white/[0.08]" />
                                </div>

                                <div className="space-y-3 border-l border-[#D9A760]/30 pl-6">
                                    {dayMemories.map((memory) => (
                                        <Link
                                            key={memory.id}
                                            href="/chat"
                                            className="enterprise-panel-hover block p-4"
                                        >
                                            <div className="flex items-start gap-3">
                                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D9A760]" />
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-medium text-[#F4F2EC]">
                                                        {memory.title}
                                                    </h3>
                                                    {memory.description && (
                                                        <p className="mt-1 line-clamp-2 text-xs text-neutral-400">
                                                            {memory.description}
                                                        </p>
                                                    )}
                                                    <p className="mt-2 font-mono text-[10px] text-neutral-500">
                                                        {new Date(memory.created_at).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
