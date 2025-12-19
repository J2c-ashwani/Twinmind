import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Trash2, ChevronLeft, ChevronRight, Trophy, Sparkles, Brain, Edit2, TrendingUp, Bell, Users } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface Conversation {
    id: string;
    title: string;
    updated_at: string;
}

interface ChatSidebarProps {
    currentConversationId: string | null;
    onSelectConversation: (id: string) => void;
    onNewChat: () => void;
    isOpen: boolean;
    onToggle: () => void;
}

export default function ChatSidebar({
    currentConversationId,
    onSelectConversation,
    onNewChat,
    isOpen,
    onToggle
}: ChatSidebarProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    useEffect(() => {
        loadConversations();
    }, [currentConversationId]); // Reload when conversation changes to update order

    const loadConversations = async () => {
        try {
            const data = await apiClient.getConversations() as { conversations: Conversation[] };
            setConversations(data.conversations || []);
        } catch (error) {
            console.error('Failed to load conversations:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const startEditing = (e: React.MouseEvent, conv: Conversation) => {
        e.stopPropagation();
        setEditingId(conv.id);
        setEditTitle(conv.title);
    };

    const handleRename = async (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            try {
                await apiClient.updateConversationTitle(id, editTitle);
                setConversations(prev => prev.map(c =>
                    c.id === id ? { ...c, title: editTitle } : c
                ));
                setEditingId(null);
            } catch (error) {
                console.error('Failed to rename conversation:', error);
            }
        } else if (e.key === 'Escape') {
            setEditingId(null);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Delete this conversation?')) return;

        try {
            await apiClient.deleteConversation(id);
            setConversations(prev => prev.filter(c => c.id !== id));
            if (currentConversationId === id) {
                onNewChat();
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={onToggle}
                className={`fixed top-4 left-4 z-50 p-2 rounded-lg bg-black/20 backdrop-blur-md border border-white/10 text-white md:hidden ${isOpen ? 'hidden' : 'block'}`}
            >
                <ChevronRight className="w-6 h-6" />
            </button>

            {/* Sidebar */}
            <motion.div
                initial={false}
                animate={{
                    width: isOpen ? 280 : 0,
                    opacity: isOpen ? 1 : 0
                }}
                className={`fixed md:relative top-0 left-0 h-full bg-black/40 backdrop-blur-xl border-r border-white/10 z-40 overflow-hidden flex flex-col`}
            >
                <div className="p-4 flex flex-col h-full w-[280px]">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-purple-400" />
                            History
                        </h2>
                        <button
                            onClick={onToggle}
                            className="p-1 hover:bg-white/10 rounded-lg transition-colors md:hidden"
                        >
                            <ChevronLeft className="w-5 h-5 text-white/70" />
                        </button>
                    </div>

                    {/* Back to Dashboard */}
                    <a href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors px-2">
                        <ChevronLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">Back to Dashboard</span>
                    </a>

                    {/* New Chat Button */}
                    <button
                        onClick={onNewChat}
                        className="w-full mb-6 p-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all"
                    >
                        <Plus className="w-5 h-5" />
                        New Chat
                    </button>

                    {/* Explore Section */}
                    <div className="mb-6">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">
                            Explore
                        </h3>
                        <div className="space-y-1">
                            <a href="/achievements" className="flex items-center gap-3 p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                                <Trophy className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm">Achievements</span>
                            </a>
                            <a href="/challenges" className="flex items-center gap-3 p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                                <Sparkles className="w-4 h-4 text-pink-500" />
                                <span className="text-sm">Challenges</span>
                            </a>
                            <a href="/life-coach" className="flex items-center gap-3 p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                                <Brain className="w-4 h-4 text-purple-500" />
                                <span className="text-sm">Life Coach</span>
                            </a>
                            <a href="/insights" className="flex items-center gap-3 p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                                <TrendingUp className="w-4 h-4 text-green-500" />
                                <span className="text-sm">Insights</span>
                            </a>
                            <a href="/notifications" className="flex items-center gap-3 p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                                <Bell className="w-4 h-4 text-yellow-500" />
                                <span className="text-sm">Notifications</span>
                            </a>
                            <a href="/memories" className="flex items-center gap-3 p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                                <Brain className="w-4 h-4 text-purple-500" />
                                <span className="text-sm">Memories</span>
                            </a>
                            <a href="/growth-circles" className="flex items-center gap-3 p-2 rounded-lg text-gray-300 hover:bg-white/10 hover:text-white transition-colors">
                                <Users className="w-4 h-4 text-blue-500" />
                                <span className="text-sm">Growth Circles</span>
                            </a>
                        </div>
                    </div>

                    {/* Conversation List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {isLoading ? (
                            <div className="text-center text-white/30 py-4">Loading...</div>
                        ) : conversations.length === 0 ? (
                            <div className="text-center text-white/30 py-4">No history yet</div>
                        ) : (
                            conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => onSelectConversation(conv.id)}
                                    className={`group relative p-3 rounded-xl cursor-pointer transition-all border ${currentConversationId === conv.id
                                        ? 'bg-white/10 border-purple-500/50'
                                        : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                                        }`}
                                >
                                    <div className="pr-16">
                                        {editingId === conv.id ? (
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => handleRename(e, conv.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                onBlur={() => setEditingId(null)}
                                                autoFocus
                                                className="w-full bg-black/20 text-white text-sm rounded px-1 py-0.5 outline-none border border-purple-500/50"
                                            />
                                        ) : (
                                            <div className="text-sm font-medium text-white truncate">
                                                {conv.title || 'New Conversation'}
                                            </div>
                                        )}
                                        <div className="text-xs text-white/40 mt-1">
                                            {new Date(conv.updated_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => startEditing(e, conv)}
                                            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(e, conv.id)}
                                            className="p-1.5 rounded-lg text-white/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 md:hidden"
                    onClick={onToggle}
                />
            )}
        </>
    );
}
