'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useStore';
import { motion } from 'framer-motion';
import { User, LogOut, Settings, Crown, Zap, ArrowLeft, Users, TrendingUp, Loader2 } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

import StreakWidget from '@/components/Gamification/StreakWidget';
import GrowthCircleWidget from '@/components/Circles/GrowthCircleWidget';
import MoodHistory from '@/components/Daily/MoodHistory';
import WeeklyMotivationCard from '@/components/MotivationCard/WeeklyMotivationCard';
import { apiClient } from '@/lib/api/client';

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const { user, setUser, logout } = useUserStore();
    const [loading, setLoading] = useState(true);
    const [personality, setPersonality] = useState<{ twin_name?: string; archetype?: string; summary?: string } | null>(null);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        apiClient.clearToken();
        logout();
        router.refresh();
        router.push('/login');
    };

    useEffect(() => {
        let active = true;

        async function loadProfile() {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session?.user) {
                    router.push('/login');
                    return;
                }

                apiClient.setToken(session.access_token);
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

                let resolvedName = session.user.user_metadata?.full_name || user?.name || '';
                let isPro = user?.is_pro || false;

                try {
                    const [profileRes, subRes, personalityRes] = await Promise.allSettled([
                        fetch(`${apiUrl}/api/auth/profile/${session.user.id}`, {
                            headers: { Authorization: `Bearer ${session.access_token}` },
                        }),
                        fetch(`${apiUrl}/api/subscription/status`, {
                            headers: { Authorization: `Bearer ${session.access_token}` },
                        }),
                        fetch(`${apiUrl}/api/personality/profile`, {
                            headers: { Authorization: `Bearer ${session.access_token}` },
                        }),
                    ]);

                    if (profileRes.status === 'fulfilled' && profileRes.value.ok) {
                        const data = await profileRes.value.json();
                        if (data?.user?.full_name) resolvedName = data.user.full_name;
                    }

                    if (subRes.status === 'fulfilled' && subRes.value.ok) {
                        const subData = await subRes.value.json();
                        isPro = Boolean(subData?.isPro ?? subData?.subscription?.is_pro);
                    }

                    if (personalityRes.status === 'fulfilled' && personalityRes.value.ok) {
                        const pData = await personalityRes.value.json();
                        if (active && pData?.personality) {
                            setPersonality(pData.personality);
                        }
                    }
                } catch {
                    // Non-fatal fallback to Supabase auth metadata
                }

                if (active) {
                    setUser({
                        id: session.user.id,
                        email: session.user.email || '',
                        name: resolvedName || session.user.email?.split('@')[0] || 'User',
                        is_pro: isPro,
                    });
                }
            } catch (err) {
                console.error('Failed to load profile:', err);
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProfile();
        return () => { active = false; };
    }, []);

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-[#0F0F1E] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0F0F1E] text-white p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.push('/chat')}
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Chat
                    </button>
                </div>

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-8"
                >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shrink-0">
                            <User className="w-12 h-12 text-white" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold mb-1">{user.name || user.email}</h1>
                            <p className="text-gray-400">{user.email}</p>
                            {personality?.twin_name && (
                                <p className="text-sm text-purple-300 mt-1">
                                    Twin: <span className="font-semibold">{personality.twin_name}</span>
                                    {personality.archetype ? ` • ${personality.archetype}` : ''}
                                </p>
                            )}
                            {user.is_pro ? (
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-full border border-yellow-500/30">
                                    <Crown className="w-4 h-4 text-yellow-500" />
                                    <span className="text-yellow-500 font-medium">Pro Member</span>
                                </div>
                            ) : (
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 text-xs text-gray-300">
                                    Free Plan
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
