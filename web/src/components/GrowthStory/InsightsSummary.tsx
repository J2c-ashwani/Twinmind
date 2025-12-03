import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Sparkles, Share2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface Insights {
    period: string;
    totalCheckIns: number;
    averageMood: number;
    happiestDay: string;
    mostActiveTime: string;
    trend: string;
    insights: string[];
}

export default function InsightsSummary() {
    const [insights, setInsights] = useState<Insights | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        try {
            const data = await apiClient.getGrowthInsights('year') as any;
            setInsights(data || {});
        } catch (error) {
            console.error('Failed to load insights:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const shareInsights = async () => {
        if (!insights) return;

        const text = `My ${insights.period} in review:\n\n${insights.insights.join('\n\n')}\n\nTrack your emotional journey with TwinMind`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'My Growth Story',
                    text
                });
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-500/20">
                <div className="animate-pulse space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-white/10 rounded"></div>
                    ))}
                </div>
            </div>
        );
    }

    if (!insights) {
        return (
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-500/20">
                <p className="text-white/60">Track more moods to unlock AI insights!</p>
            </div>
        );
    }

    const getTrendIcon = () => {
        if (insights.trend === 'improving') return '📈';
        if (insights.trend === 'declining') return '📉';
        return '➡️';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-500/20"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <div>
                        <h3 className="text-lg font-bold text-white">AI Insights</h3>
                        <p className="text-xs text-white/50">Your {insights.period} in review</p>
                    </div>
                </div>
                <button
                    onClick={shareInsights}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-colors"
                >
                    <Share2 className="w-4 h-4 text-white" />
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-white/50">Check-ins</p>
                    <p className="text-2xl font-bold text-white">{insights.totalCheckIns || 0}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-white/50">Avg Mood</p>
                    <p className="text-2xl font-bold text-white">{insights.averageMood ? insights.averageMood.toFixed(1) : '0.0'}/5</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-white/50">Best Day</p>
                    <p className="text-sm font-semibold text-white">{insights.happiestDay || 'N/A'}</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-white/50">Trend</p>
                    <p className="text-sm font-semibold text-white capitalize">
                        {getTrendIcon()} {insights.trend || 'stable'}
                    </p>
                </div>
            </div>

            {/* AI Insights */}
            <div className="space-y-3">
                {insights.insights.map((insight, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white/5 rounded-lg p-4 border-l-2 border-purple-400"
                    >
                        <p className="text-sm text-white leading-relaxed">{insight}</p>
                    </motion.div>
                ))}
            </div>

            {/* Most Active Time */}
            <div className="mt-4 text-xs text-white/40 text-center">
                You're most active at {insights.mostActiveTime}
            </div>
        </motion.div>
    );
}
