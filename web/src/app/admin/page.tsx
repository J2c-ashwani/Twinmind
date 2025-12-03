'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Users, DollarSign, TrendingUp, Activity,
    Shield, Zap, MessageSquare, Award,
    ArrowUp, ArrowDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/api/client';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    const checkAdminAccess = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/');
                return;
            }

            // Load analytics (will fail if not admin)
            const data = await apiClient.request('/api/admin/analytics');
            setAnalytics(data);
            setIsAdmin(true);
        } catch (error) {
            console.error('Admin access denied:', error);
            router.push('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const refreshData = async () => {
        setLoading(true);
        try {
            const data = await apiClient.request('/api/admin/analytics');
            setAnalytics(data);
        } catch (error) {
            console.error('Failed to refresh:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] to-[#1a1a2e] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
            </div>
        );
    }

    if (!isAdmin || !analytics) {
        return null;
    }

    const { users, revenue, features, system } = analytics;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] to-[#1a1a2e] p-6">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
                        <p className="text-white/60">Monitor your app's performance and metrics</p>
                    </div>
                    <button
                        onClick={refreshData}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        Refresh Data
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto space-y-6">
                {/* User Metrics */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">User Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            icon={<Users className="w-6 h-6" />}
                            title="Total Users"
                            value={users.totalUsers}
                            subtitle={`${users.newUsers} new this week`}
                            trend="up"
                            color="blue"
                        />
                        <StatCard
                            icon={<Activity className="w-6 h-6" />}
                            title="Active Users"
                            value={users.activeUsers}
                            subtitle="Last 7 days"
                            color="green"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-6 h-6" />}
                            title="Conversion Rate"
                            value={`${users.conversionRate}%`}
                            subtitle={`${users.premiumUsers} premium users`}
                            trend={users.conversionRate > 15 ? 'up' : 'down'}
                            color="purple"
                        />
                    </div>
                </div>

                {/* Revenue Metrics */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Revenue</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatCard
                            icon={<DollarSign className="w-6 h-6" />}
                            title="Monthly Recurring Revenue"
                            value={`$${revenue.mrr.toFixed(2)}`}
                            subtitle={revenue.currency}
                            color="green"
                        />
                        <StatCard
                            icon={<Award className="w-6 h-6" />}
                            title="Active Subscriptions"
                            value={revenue.activeSubscriptions}
                            subtitle={`${revenue.newSubscriptionsThisMonth} new this month`}
                            trend="up"
                            color="yellow"
                        />
                        <StatCard
                            icon={<TrendingUp className="w-6 h-6" />}
                            title="Free / Premium"
                            value={`${users.freeUsers} / ${users.premiumUsers}`}
                            subtitle="User split"
                            color="blue"
                        />
                    </div>
                </div>

                {/* Feature Usage */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">Feature Engagement</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <FeatureCard
                            title="Avg Streak"
                            value={`${features.streaks.average} days`}
                            subtitle={`${features.streaks.totalFreezeTokens} freeze tokens`}
                            icon={<Zap className="w-5 h-5" />}
                        />
                        <FeatureCard
                            title="Growth Circles"
                            value={features.circles.active}
                            subtitle={`${features.circles.avgMembers} avg members`}
                            icon={<Users className="w-5 h-5" />}
                        />
                        <FeatureCard
                            title="Twin Matches"
                            value={features.twinMatches.total}
                            subtitle={`${features.twinMatches.shareRate}% share rate`}
                            icon={<Shield className="w-5 h-5" />}
                        />
                        <FeatureCard
                            title="Motivation Cards"
                            value={features.motivationCards.total}
                            subtitle={`${features.motivationCards.shareRate}% shared`}
                            icon={<MessageSquare className="w-5 h-5" />}
                        />
                    </div>
                </div>

                {/* System Health */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">System Health</h2>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${system.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                <span className="text-white font-medium capitalize">{system.status}</span>
                            </div>
                            <div className="text-white/60 text-sm">
                                {system.recentMessages} messages (24h)
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Stat Card Component
function StatCard({ icon, title, value, subtitle, trend, color }: any) {
    const colorClasses = {
        blue: 'from-blue-500 to-cyan-500',
        green: 'from-green-500 to-emerald-500',
        purple: 'from-purple-500 to-pink-500',
        yellow: 'from-yellow-500 to-orange-500'
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md hover:bg-white/10 transition-all"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center text-white`}>
                    {icon}
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-sm ${trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                        {trend === 'up' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    </div>
                )}
            </div>
            <h3 className="text-white/60 text-sm mb-1">{title}</h3>
            <p className="text-3xl font-bold text-white mb-1">{value}</p>
            <p className="text-white/40 text-xs">{subtitle}</p>
        </motion.div>
    );
}

// Feature Card Component
function FeatureCard({ title, value, subtitle, icon }: any) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-purple-400">
                {icon}
                <span className="text-sm font-medium">{title}</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            <p className="text-white/40 text-xs">{subtitle}</p>
        </div>
    );
}
