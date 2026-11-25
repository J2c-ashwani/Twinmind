'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { apiClient } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, Trash2, Lightbulb, Trophy, User } from 'lucide-react';

function timeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadNotifications();
    }, []);

    const loadNotifications = async () => {
        try {
            const supabase = createClientComponentClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session) apiClient.setToken(session.access_token);

            const data = await apiClient.getNotifications();
            setNotifications(data as any[]);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await apiClient.markNotificationRead(id);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
        } catch (error) {
            console.error('Failed to mark read:', error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'smart_reminder': return <Lightbulb className="w-6 h-6 text-yellow-500" />;
            case 'achievement': return <Trophy className="w-6 h-6 text-orange-500" />;
            case 'coach': return <User className="w-6 h-6 text-purple-500" />;
            default: return <Bell className="w-6 h-6 text-blue-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {notifications.filter(n => !n.is_read).length} New
                </span>
            </div>

            <div className="space-y-4">
                <AnimatePresence>
                    {notifications.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <motion.div
                                key={notification.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, height: 0 }}
                                className={`relative p-6 rounded-xl border transition-all ${notification.is_read
                                    ? 'bg-white border-gray-100'
                                    : 'bg-blue-50 border-blue-100 shadow-sm'
                                    }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`p-3 rounded-full ${notification.is_read ? 'bg-gray-100' : 'bg-white shadow-sm'
                                        }`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h3 className={`font-semibold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'
                                                }`}>
                                                {notification.title}
                                            </h3>
                                            <span className="text-xs text-gray-500">
                                                {timeAgo(notification.created_at)}
                                            </span>
                                        </div>
                                        <p className={`mt-1 ${notification.is_read ? 'text-gray-500' : 'text-gray-700'
                                            }`}>
                                            {notification.body}
                                        </p>
                                    </div>
                                    {!notification.is_read && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                                            title="Mark as read"
                                        >
                                            <Check className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
