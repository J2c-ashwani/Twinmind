'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api/client';
import { Brain, Calendar, MessageSquare, ChevronLeft, Sparkles } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Memory {
    id: string;
    content: string;
    created_at: string;
    metadata?: {
        emotion?: string;
        topics?: string[];
    };
}

export default function MemoriesPage() {
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                apiClient.setToken(session.access_token);
                loadMemories();
            } else {
                setLoading(false);
            }
        };
        init();
    }, []);

    const loadMemories = async () => {
        try {
            const data = await apiClient.getConversations() as { conversations: any[] };
            // Transform conversations into memories format
            const memoriesData = (data.conversations || []).map((conv: any) => ({
                id: conv.id,
                content: conv.title || 'Untitled Memory',
                created_at: conv.updated_at || conv.created_at,
                metadata: {
                    emotion: 'neutral',
                    topics: [],
                },
            }));
            setMemories(memoriesData);
        } catch (error) {
            console.error('Failed to load memories:', error);
        } finally {
            setLoading(false);
        }
    };

    const groupByDate = (memories: Memory[]) => {
        const groups: { [key: string]: Memory[] } = {};
        memories.forEach((memory) => {
            const date = new Date(memory.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
            if (!groups[date]) groups[date] = [];
            groups[date].push(memory);
        });
        return groups;
    };

    const groupedMemories = groupByDate(memories);

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] via-[#1A1A2E] to-[#0F0F1E]">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-black/40 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <a href="/chat" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <ChevronLeft className="w-6 h-6 text-white" />
                    </a>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Memory Timeline</h1>
                            <p className="text-sm text-gray-400">Your journey over time</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : memories.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Sparkles className="w-10 h-10 text-purple-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">No Memories Yet</h2>
                        <p className="text-gray-400 mb-6">Start chatting to create your first memories!</p>
                        <a
                            href="/chat"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold hover:scale-105 transition-transform"
                        >
                            <MessageSquare className="w-5 h-5" />
                            Start Chatting
                        </a>
                    </motion.div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(groupedMemories).map(([date, dayMemories], index) => (
                            <motion.div
                                key={date}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                {/* Date Header */}
                                <div className="flex items-center gap-3 mb-4">
                                    <Calendar className="w-5 h-5 text-purple-400" />
                                    <h2 className="text-lg font-semibold text-white">{date}</h2>
                                    <div className="flex-1 h-px bg-white/10" />
                                </div>

                                {/* Memories for this date */}
                                <div className="space-y-3 pl-8 border-l-2 border-purple-500/30">
                                    {dayMemories.map((memory) => (
                                        <motion.a
                                            key={memory.id}
                                            href={`/chat?id=${memory.id}`}
                                            whileHover={{ scale: 1.02 }}
                                            className="block p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className="w-2 h-2 mt-2 rounded-full bg-purple-500" />
                                                <div className="flex-1">
                                                    <h3 className="font-medium text-white mb-1">
                                                        {memory.content}
                                                    </h3>
                                                    <p className="text-sm text-gray-400">
                                                        {new Date(memory.created_at).toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit',
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.a>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
