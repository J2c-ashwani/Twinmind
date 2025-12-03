'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import { Loader2, Star, Brain, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface Memory {
    id: string
    title?: string
    description?: string
    memory_snippet?: string
    type?: string
    memory_type?: string
    is_favorite?: boolean
    isFavorite?: boolean
    date?: string
    created_at?: string
    emotional_context?: string
    significance?: number
}

type FilterType = 'all' | 'milestone' | 'conversation' | 'achievement' | 'emotion' | 'funny_moment' | 'breakthrough'

export default function MemoriesPage() {
    const router = useRouter()
    const [memories, setMemories] = useState<Memory[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedFilter, setSelectedFilter] = useState<FilterType>('all')
    const [togglingFavorite, setTogglingFavorite] = useState<string | null>(null)

    useEffect(() => {
        loadMemories()
    }, [])

    async function loadMemories() {
        try {
            setLoading(true)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const response = await api.getMemories(session.access_token)
            const normalizedMemories = (response.memories || []).map((m: any) => ({
                id: m.id,
                memory_snippet: m.memory_snippet || m.description || m.title || 'No description',
                memory_type: m.memory_type || m.type || 'milestone',
                is_favorite: m.is_favorite || m.isFavorite || false,
                created_at: m.created_at || m.date || new Date().toISOString(),
                emotional_context: m.emotional_context
            }))
            setMemories(normalizedMemories)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    async function toggleFavorite(memoryId: string) {
        try {
            setTogglingFavorite(memoryId)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) return

            await api.toggleMemoryFavorite(memoryId, session.access_token)

            // Update local state
            setMemories(prev =>
                prev.map(m =>
                    m.id === memoryId ? { ...m, is_favorite: !m.is_favorite } : m
                )
            )
        } catch (err: any) {
            setError(err.message)
        } finally {
            setTogglingFavorite(null)
        }
    }

    const filters: { value: FilterType; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'milestone', label: 'Milestone' },
        { value: 'conversation', label: 'Conversation' },
        { value: 'achievement', label: 'Achievement' },
        { value: 'emotion', label: 'Emotion' },
        { value: 'funny_moment', label: 'Funny' },
        { value: 'breakthrough', label: 'Breakthrough' }
    ]

    const filteredMemories = selectedFilter === 'all'
        ? memories
        : memories.filter(m => m.memory_type === selectedFilter)

    function getTypeColor(type: string): string {
        const colorMap: Record<string, string> = {
            milestone: 'bg-yellow-500',
            conversation: 'bg-blue-500',
            achievement: 'bg-green-500',
            emotion: 'bg-pink-500',
            funny_moment: 'bg-orange-500',
            breakthrough: 'bg-purple-500'
        }
        return colorMap[type] || 'bg-gray-500'
    }

    function formatDate(dateString: string): string {
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays} days ago`
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[32px] p-8 mb-6">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Brain className="w-8 h-8" />
                        <h1 className="text-3xl font-bold">Memory Timeline</h1>
                    </div>
                    <button
                        onClick={loadMemories}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 pb-12">
                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2 mb-8">
                    {filters.map(filter => (
                        <button
                            key={filter.value}
                            onClick={() => setSelectedFilter(filter.value)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedFilter === filter.value
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                        <p className="text-red-300">{error}</p>
                    </div>
                )}

                {/* Memory List */}
                <div className="space-y-4">
                    {filteredMemories.map((memory, index) => (
                        <motion.div
                            key={memory.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-all"
                        >
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    {/* Type Badge */}
                                    <div className="flex items-center gap-2 mb-3">
                                        <span
                                            className={`${getTypeColor(
                                                memory.memory_type
                                            )} px-3 py-1 rounded-full text-xs font-semibold text-white`}
                                        >
                                            {memory.memory_type.replace('_', ' ')}
                                        </span>
                                        <span className="text-sm text-gray-400">
                                            {formatDate(memory.created_at)}
                                        </span>
                                    </div>

                                    {/* Memory Content */}
                                    <p className="text-white mb-2">{memory.memory_snippet}</p>

                                    {/* Emotional Context */}
                                    {memory.emotional_context && (
                                        <p className="text-sm text-gray-400 italic">
                                            {memory.emotional_context}
                                        </p>
                                    )}
                                </div>

                                {/* Favorite Button */}
                                <button
                                    onClick={() => toggleFavorite(memory.id)}
                                    disabled={togglingFavorite === memory.id}
                                    className="shrink-0 p-2 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    {togglingFavorite === memory.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                                    ) : (
                                        <Star
                                            className={`w-5 h-5 ${memory.is_favorite
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-400'
                                                }`}
                                        />
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Empty State */}
                {filteredMemories.length === 0 && !loading && (
                    <div className="text-center py-16">
                        <Brain className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                        <h3 className="text-xl font-semibold text-gray-400 mb-2">
                            No memories yet
                        </h3>
                        <p className="text-gray-500">
                            Keep chatting to create special moments!
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
