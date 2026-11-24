import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    MessageSquare,
    Plus,
    Trash2,
    ChevronLeft,
    ChevronRight,
    Trophy,
    Sparkles,
    Brain,
    Edit2,
    TrendingUp,
    Bell,
    Users,
} from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import BrandMark from '@/components/Layout/BrandMark'

interface Conversation {
    id: string
    title: string
    updated_at: string
}

interface ChatSidebarProps {
    currentConversationId: string | null
    onSelectConversation: (id: string) => void
    onNewChat: () => void
    isOpen: boolean
    onToggle: () => void
}

export default function ChatSidebar({
    currentConversationId,
    onSelectConversation,
    onNewChat,
    isOpen,
    onToggle,
}: ChatSidebarProps) {
    const [conversations, setConversations] = useState<Conversation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editTitle, setEditTitle] = useState('')

    useEffect(() => {
        loadConversations()
    }, [currentConversationId])

    const loadConversations = async () => {
        try {
            const data = (await apiClient.getConversations()) as { conversations: Conversation[] }
            setConversations(data.conversations || [])
        } catch (error) {
            console.error('Failed to load conversations:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const startEditing = (e: React.MouseEvent, conv: Conversation) => {
        e.stopPropagation()
        setEditingId(conv.id)
        setEditTitle(conv.title)
    }

    const handleRename = async (e: React.KeyboardEvent, id: string) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            e.stopPropagation()
            try {
                await apiClient.updateConversationTitle(id, editTitle)
                setConversations((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, title: editTitle } : c))
                )
                setEditingId(null)
            } catch (error) {
                console.error('Failed to rename conversation:', error)
            }
        } else if (e.key === 'Escape') {
            setEditingId(null)
        }
    }

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm('Delete this conversation?')) return

        try {
            await apiClient.deleteConversation(id)
            setConversations((prev) => prev.filter((c) => c.id !== id))
            if (currentConversationId === id) {
                onNewChat()
            }
        } catch (error) {
            console.error('Failed to delete conversation:', error)
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                className={`fixed left-4 top-4 z-50 rounded-lg border border-white/10 bg-[#0D1016]/90 p-2 text-white backdrop-blur-md md:hidden ${
                    isOpen ? 'hidden' : 'block'
                }`}
            >
                <ChevronRight className="h-5 w-5" />
            </button>

            <motion.div
                initial={false}
                animate={{
                    width: isOpen ? 280 : 0,
                    opacity: isOpen ? 1 : 0,
                }}
                className="fixed left-0 top-0 z-40 flex h-full flex-col overflow-hidden border-r border-white/[0.08] bg-[#090B10] md:relative"
            >
                <div className="flex h-full w-[280px] flex-col p-4">
                    <div className="mb-5 flex items-center justify-between">
                        <BrandMark size="sm" href="/dashboard" />
                        <button
                            type="button"
                            onClick={onToggle}
                            className="rounded-lg p-1 text-neutral-400 transition-colors hover:bg-white/[0.08] md:hidden"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    </div>

                    <Link
                        href="/dashboard"
                        className="mb-3 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Overview Dashboard</span>
                    </Link>

                    <button
                        type="button"
                        onClick={onNewChat}
                        className="btn-primary-ivory mb-5 w-full py-2.5 text-xs font-semibold"
                    >
                        <Plus className="h-4 w-4" />
                        <span>New Reflection Thread</span>
                    </button>

                    <div className="mb-5 border-b border-white/[0.07] pb-4">
                        <div className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                            Workspace Modules
                        </div>
                        <div className="space-y-0.5 text-xs">
                            {[
                                { href: '/life-coach', label: 'Life Coach', icon: Brain, color: 'text-[#D9A760]' },
                                { href: '/insights', label: 'Weekly Insights', icon: TrendingUp, color: 'text-emerald-400' },
                                { href: '/memories', label: 'Memory Timeline', icon: MessageSquare, color: 'text-sky-400' },
                                { href: '/challenges', label: 'Daily Challenges', icon: Sparkles, color: 'text-[#E7C891]' },
                                { href: '/achievements', label: 'Achievements', icon: Trophy, color: 'text-amber-400' },
                                { href: '/growth-circles', label: 'Growth Circles', icon: Users, color: 'text-neutral-300' },
                                { href: '/notifications', label: 'Notifications', icon: Bell, color: 'text-neutral-400' },
                            ].map((item) => {
                                const Icon = item.icon
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-neutral-400 transition-colors hover:bg-white/[0.05] hover:text-white"
                                    >
                                        <Icon className={`h-3.5 w-3.5 ${item.color}`} />
                                        <span>{item.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>

                    <div className="mb-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        History
                    </div>
                    <div className="custom-scrollbar flex-1 space-y-1.5 overflow-y-auto pr-1">
                        {isLoading ? (
                            <div className="py-4 text-center text-xs text-neutral-500">Loading threads...</div>
                        ) : conversations.length === 0 ? (
                            <div className="py-4 text-center text-xs text-neutral-500">No conversations yet</div>
                        ) : (
                            conversations.map((conv) => (
                                <div
                                    key={conv.id}
                                    onClick={() => onSelectConversation(conv.id)}
                                    className={`group relative cursor-pointer rounded-xl border p-2.5 transition-all ${
                                        currentConversationId === conv.id
                                            ? 'border-[#D9A760]/45 bg-[#D9A760]/[0.08]'
                                            : 'border-transparent bg-white/[0.02] hover:border-white/[0.08] hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <div className="pr-14">
                                        {editingId === conv.id ? (
                                            <input
                                                type="text"
                                                value={editTitle}
                                                onChange={(e) => setEditTitle(e.target.value)}
                                                onKeyDown={(e) => handleRename(e, conv.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                onBlur={() => setEditingId(null)}
                                                autoFocus
                                                className="w-full rounded border border-[#D9A760]/50 bg-[#07080B] px-1.5 py-0.5 text-xs text-white outline-none"
                                            />
                                        ) : (
                                            <div className="truncate text-xs font-medium text-[#F4F2EC]">
                                                {conv.title || 'New Conversation'}
                                            </div>
                                        )}
                                        <div className="mt-0.5 font-mono text-[10px] text-neutral-500">
                                            {new Date(conv.updated_at).toLocaleDateString()}
                                        </div>
                                    </div>

                                    <div className="absolute right-2 top-1/2 flex -translate-y-1/2 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={(e) => startEditing(e, conv)}
                                            className="rounded p-1 text-neutral-400 hover:bg-white/10 hover:text-white"
                                        >
                                            <Edit2 className="h-3 w-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => handleDelete(e, conv.id)}
                                            className="rounded p-1 text-neutral-400 hover:bg-rose-500/10 hover:text-rose-400"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>

            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/70 md:hidden"
                    onClick={onToggle}
                />
            )}
        </>
    )
}
