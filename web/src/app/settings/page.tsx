'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import { User, Bell, Lock, Palette, LogOut, ChevronLeft, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

export default function SettingsPage() {
    const router = useRouter();
    const { user, logout } = useUserStore();
    const [notifications, setNotifications] = useState(true);
    const [aiMode, setAiMode] = useState('normal');

    const aiModes = [
        { value: 'normal', label: 'Normal Twin', description: 'Balanced and empathetic' },
        { value: 'future', label: 'Future Twin', description: 'Wise and visionary' },
        { value: 'dark', label: 'Dark Twin', description: 'Brutally honest' },
        { value: 'therapist', label: 'Therapist Twin', description: 'Professional support' },
    ];

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="glass-button p-2"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-3xl font-bold text-white">Settings</h1>
                </div>

                {/* Profile Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <User className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">Profile</h2>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Name
                            </label>
                            <input
                                type="text"
                                value={user?.name || ''}
                                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl 
                                         focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 
                                         outline-none transition-all text-white"
                                placeholder="Your name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={user?.email || ''}
                                disabled
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* AI Personality */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Palette className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">AI Personality</h2>
                    </div>

                    <div className="space-y-3">
                        {aiModes.map((mode) => (
                            <button
                                key={mode.value}
                                onClick={() => setAiMode(mode.value)}
                                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${aiMode === mode.value
                                    ? 'border-purple-500 bg-purple-500/20'
                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                    }`}
                            >
                                <div className="font-semibold text-white">{mode.label}</div>
                                <div className="text-sm text-gray-400">{mode.description}</div>
                            </button>
                        ))}
                    </div>
                </motion.div>

                {/* Notifications */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Bell className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">Notifications</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="font-medium text-white">Push Notifications</div>
                                <div className="text-sm text-gray-400">
                                    Receive proactive check-ins and reminders
                                </div>
                            </div>
                            <button
                                onClick={() => setNotifications(!notifications)}
                                className={`relative w-14 h-8 rounded-full transition-colors ${notifications ? 'bg-purple-500' : 'bg-gray-600'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${notifications ? 'translate-x-6' : ''
                                        }`}
                                />
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Privacy */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card p-6 mb-6"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <Lock className="w-6 h-6 text-purple-400" />
                        <h2 className="text-xl font-semibold text-white">Privacy & Security</h2>
                    </div>

                    <div className="space-y-3">
                        <button className="w-full p-4 rounded-xl border border-white/10 bg-white/5 
                                         hover:border-white/20 transition-all text-left">
                            <div className="font-medium text-white">Change Password</div>
                        </button>
                        <button className="w-full p-4 rounded-xl border border-white/10 bg-white/5 
                                         hover:border-white/20 transition-all text-left">
                            <div className="font-medium text-white">Export Data</div>
                        </button>

                        <button
                            onClick={async () => {
                                if (confirm('Are you sure you want to clear your chat history? This cannot be undone.')) {
                                    try {
                                        await apiClient.clearChatHistory();
                                        alert('Chat history cleared successfully');
                                    } catch (error) {
                                        alert('Failed to clear history');
                                    }
                                }
                            }}
                            className="w-full p-4 rounded-xl border border-red-500/30 bg-red-500/10 
                                         hover:border-red-500/50 transition-all text-left flex items-center gap-3"
                        >
                            <Trash2 className="w-5 h-5 text-red-400" />
                            <div className="font-medium text-red-400">Clear Chat History</div>
                        </button>

                        <button className="w-full p-4 rounded-xl border border-red-500/30 bg-red-500/10 
                                         hover:border-red-500/50 transition-all text-left">
                            <div className="font-medium text-red-400">Delete Account</div>
                        </button>
                    </div>
                </motion.div>

                {/* Logout */}
                <button
                    onClick={logout}
                    className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white 
                             rounded-xl font-semibold hover:shadow-lg hover:scale-105 
                             transition-all flex items-center justify-center gap-2"
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </button>
            </div>
        </div>
    );
}
