'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { apiClient } from '@/lib/api/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Check, Lightbulb, Trophy, User } from 'lucide-react'
import WorkspaceHeader from '@/components/Layout/WorkspaceHeader'

function timeAgo(dateString: string) {
    const date = new Date(dateString)
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadNotifications()
    }, [])

    const loadNotifications = async () => {
        try {
            const supabase = createClientComponentClient()
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session) apiClient.setToken(session.access_token)

            const data = await apiClient.getNotifications()
            setNotifications(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('Failed to load notifications:', error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (id: string) => {
        try {
            await apiClient.markNotificationRead(id)
            setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)))
        } catch (error) {
            console.error('Failed to mark read:', error)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'smart_reminder':
                return <Lightbulb className="h-5 w-5 text-[#E7C891]" />
            case 'achievement':
                return <Trophy className="h-5 w-5 text-emerald-400" />
            case 'coach':
                return <User className="h-5 w-5 text-sky-400" />
            default:
                return <Bell className="h-5 w-5 text-neutral-300" />
        }
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <WorkspaceHeader />

            <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
                <div className="mb-8 flex items-center justify-between border-b border-white/[0.08] pb-6">
                    <div>
                        <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                            Activity Feed
                        </div>
                        <h1 className="mt-1 text-3xl font-semibold text-[#F4F2EC]">Notifications</h1>
                    </div>
                    <span className="rounded-lg border border-[#D9A760]/30 bg-[#D9A760]/10 px-3 py-1 font-mono text-xs font-medium text-[#E7C891]">
                        {notifications.filter((n) => !n.is_read).length} Unread
                    </span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D9A760] border-t-transparent" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        <AnimatePresence>
                            {notifications.length === 0 ? (
                                <div className="enterprise-panel py-16 text-center text-sm text-neutral-400">
                                    <Bell className="mx-auto mb-3 h-8 w-8 text-neutral-600" />
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <motion.div
                                        key={notification.id}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={`enterprise-panel p-5 ${
                                            !notification.is_read ? 'border-[#D9A760]/35 bg-[#10131C]' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="rounded-xl border border-white/10 bg-[#07080B] p-2.5">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-sm font-semibold text-[#F4F2EC]">
                                                        {notification.title}
                                                    </h3>
                                                    <span className="font-mono text-[11px] text-neutral-500">
                                                        {timeAgo(notification.created_at)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs leading-relaxed text-neutral-400 sm:text-sm">
                                                    {notification.body}
                                                </p>
                                            </div>
                                            {!notification.is_read && (
                                                <button
                                                    type="button"
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="rounded-lg border border-white/10 p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10"
                                                    title="Mark as read"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </main>
        </div>
    )
}
