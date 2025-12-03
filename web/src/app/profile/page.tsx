'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import { User, LogOut, Settings, Crown, Zap } from 'lucide-react';

import StreakWidget from '@/components/Gamification/StreakWidget';
import GrowthCircleWidget from '@/components/Circles/GrowthCircleWidget';
import MoodHistory from '@/components/Daily/MoodHistory';
import WeeklyMotivationCard from '@/components/MotivationCard/WeeklyMotivationCard';
import { Users, TrendingUp } from 'lucide-react';

export default function ProfilePage() {
    const router = useRouter();
    const { user, logout } = useUserStore();

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
    }, []);

    useEffect(() => {
        if (isHydrated && !user) {
            router.push('/login');
        }
    }, [isHydrated, user, router]);

    if (!isHydrated || !user) {
        return null; // Or a loading spinner
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8"
                >
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                            <User className="w-12 h-12 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold mb-2">{user.name || user.email}</h1>
                            <p className="text-gray-400">{user.email}</p>
                            {user.is_pro && (
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30">
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                    <span className="text-yellow-500 font-medium">Pro Member</span>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Quick Actions */}
                <div className="grid md:grid-cols-2 gap-4">
                    <motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => router.push('/chat')}
                        className="glass-card p-6 hover:bg-white/20 transition-all text-left group"
                    >
                        <Zap className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                        <h3 className="text-xl font-semibold mb-2">Continue Chat</h3>
                        <p className="text-gray-400 text-sm">Talk with your AI twin</p>
                    </motion.button>

                    <motion.button
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => router.push('/settings')}
                        className="glass-card p-6 hover:bg-white/20 transition-all text-left group"
                    >
                        <Settings className="w-8 h-8 text-blue-400 mb-3 group-hover:rotate-90 transition-transform" />
                        <h3 className="text-xl font-semibold mb-2">Settings</h3>
                        <p className="text-gray-400 text-sm">Manage your preferences</p>
                    </motion.button>
                </div>

                {/* Widgets Grid */}
                <div className="space-y-6">
                    <StreakWidget />
                    <GrowthCircleWidget />
                    <MoodHistory />
                    <WeeklyMotivationCard />
                </div>

                {/* Feature Navigation */}
                <div className="grid md:grid-cols-2 gap-4">
                    <button
                        onClick={() => router.push('/growth-story')}
                        className="p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                    >
                        <TrendingUp className="w-5 h-5" />
                        Growth Story
                    </button>
                    <button
                        onClick={() => router.push('/twin-match')}
                        className="p-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                    >
                        <Users className="w-5 h-5" />
                        Twin Match
                    </button>
                </div>

                {/* Account Actions */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-card p-6"
                >
                    <h2 className="text-xl font-semibold mb-4">Account</h2>
                    <div className="space-y-3">
                        {!user.is_pro && (
                            <button
                                onClick={() => router.push('/subscription')}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Crown className="w-5 h-5" />
                                Upgrade to Pro
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            <LogOut className="w-5 h-5" />
                            Sign Out
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
