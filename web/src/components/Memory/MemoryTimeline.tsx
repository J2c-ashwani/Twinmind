'use client';

import { useEffect, useState } from 'react';
import { useMemoryStore } from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Calendar, Tag, TrendingUp } from 'lucide-react';

interface Memory {
    id: string;
    title: string;
    description: string;
    memory_type: string;
    emotional_significance: number;
    tags: string[];
    is_favorite: boolean;
    created_at: string;
    referenced_count: number;
}

export default function MemoryTimeline() {
    const { memories, setMemories, toggleFavorite, setSelectedMemory } = useMemoryStore();
    const [filter, setFilter] = useState<string>('all');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMemories();
    }, [filter]);

    const loadMemories = async () => {
        try {
            setLoading(true);
            const data = await apiClient.getMemoryTimeline(50);
            setMemories(data);
        } catch (error) {
            console.error('Failed to load memories:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMemories = memories.filter((m) =>
        filter === 'all' ? true : m.memory_type === filter
    );

    const getMemoryIcon = (type: string) => {
        const icons: Record<string, string> = {
            milestone: '🎯',
            conversation: '💬',
            achievement: '🏆',
            emotion: '💙',
            funny_moment: '😄',
            breakthrough: '💡',
        };
        return icons[type] || '✨';
    };

    const getSignificanceColor = (significance: number) => {
        if (significance >= 9) return 'from-purple-500 to-pink-500';
        if (significance >= 7) return 'from-blue-500 to-cyan-500';
        if (significance >= 5) return 'from-green-500 to-emerald-500';
        return 'from-gray-500 to-slate-500';
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Memory Timeline</h1>
                <p className="text-gray-600">Our shared journey together ✨</p>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {['all', 'milestone', 'conversation', 'achievement', 'emotion', 'funny_moment', 'breakthrough'].map((type) => (
                    <button
                        key={type}
                        onClick={() => setFilter(type)}
                        className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${filter === type
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        {type === 'all' ? 'All' : type.replace('_', ' ')}
                    </button>
                ))}
            </div>

            {/* Timeline */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-pink-500 to-blue-500"></div>

                    <AnimatePresence>
                        {filteredMemories.map((memory, index) => (
                            <motion.div
                                key={memory.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.05 }}
                                className="relative pl-20 pr-4 pb-8"
                            >
                                {/* Timeline dot */}
                                <div className="absolute left-6 top-2 w-5 h-5 rounded-full bg-white border-4 border-purple-500 shadow-lg"></div>

                                {/* Memory card */}
                                <div
                                    onClick={() => setSelectedMemory(memory)}
                                    className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer overflow-hidden group"
                                >
                                    {/* Gradient header */}
                                    <div className={`h-2 bg-gradient-to-r ${getSignificanceColor(memory.emotional_significance)}`}></div>

                                    <div className="p-6">
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{getMemoryIcon(memory.memory_type)}</span>
                                                <div>
                                                    <h3 className="text-lg font-semibold group-hover:text-purple-600 transition-colors">
                                                        {memory.title}
                                                    </h3>
                                                    <p className="text-sm text-gray-500 flex items-center gap-2">
                                                        <Calendar className="w-4 h-4" />
                                                        {new Date(memory.created_at).toLocaleDateString('en-US', {
                                                            month: 'long',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(memory.id);
                                                }}
                                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                            >
                                                <Heart
                                                    className={`w-5 h-5 ${memory.is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                                                        }`}
                                                />
                                            </button>
                                        </div>

                                        {/* Description */}
                                        <p className="text-gray-700 mb-4 line-clamp-2">{memory.description}</p>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between">
                                            {/* Tags */}
                                            <div className="flex gap-2 flex-wrap">
                                                {memory.tags.slice(0, 3).map((tag) => (
                                                    <span
                                                        key={tag}
                                                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1"
                                                    >
                                                        <Tag className="w-3 h-3" />
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Referenced count */}
                                            {memory.referenced_count > 0 && (
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <TrendingUp className="w-4 h-4" />
                                                    <span>Referenced {memory.referenced_count}x</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Significance indicator */}
                                        <div className="mt-4 flex items-center gap-2">
                                            <span className="text-xs text-gray-500">Emotional significance:</span>
                                            <div className="flex gap-1">
                                                {[...Array(10)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`w-2 h-2 rounded-full ${i < memory.emotional_significance
                                                                ? `bg-gradient-to-r ${getSignificanceColor(memory.emotional_significance)}`
                                                                : 'bg-gray-200'
                                                            }`}
                                                    ></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredMemories.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No memories yet. Keep chatting to create special moments! ✨</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
