import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Flame, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Streak {
    streak_type: string;
    effective_streak: number;
    longest_streak: number;
    status: 'completed_today' | 'at_risk' | 'active' | 'broken';
    days_since_activity: number;
    freeze_tokens?: number;
    freeze_used_at?: string;
}

export default function StreakWidget() {
    const [streak, setStreak] = useState<Streak | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showFreezeModal, setShowFreezeModal] = useState(false);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                apiClient.setToken(session.access_token);
                loadStreak();
            } else {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const loadStreak = async () => {
        try {
            const data = await apiClient.getGamificationStatus() as any;
            const dailyStreak = data?.streaks?.find((s: Streak) => s.streak_type === 'daily_checkin');
            setStreak(dailyStreak || null);
        } catch (error) {
            console.error('Failed to load streak:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-2xl p-6 border border-orange-500/20">
                <div className="animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-white/10 rounded w-16"></div>
                </div>
            </div>
        );
    }

    if (!streak) {
        return (
            <div className="bg-gradient-to-br from-gray-500/10 to-gray-600/10 rounded-2xl p-6 border border-gray-500/20">
                <div className="flex items-center gap-3 mb-2">
                    <Flame className="w-6 h-6 text-gray-400" />
                    <span className="text-sm text-white/50">Daily Streak</span>
                </div>
                <p className="text-2xl font-bold text-white">Start Today!</p>
                <p className="text-xs text-white/40 mt-2">Check in daily to build your streak</p>
            </div>
        );
    }

    const getStatusColor = () => {
        switch (streak.status) {
            case 'completed_today': return 'from-green-500/10 to-emerald-500/10 border-green-500/30';
            case 'at_risk': return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30';
            case 'broken': return 'from-gray-500/10 to-gray-600/10 border-gray-500/20';
            default: return 'from-orange-500/10 to-red-500/10 border-orange-500/30';
        }
    };

    const getStatusText = () => {
        switch (streak.status) {
            case 'completed_today': return '✅ Completed Today';
            case 'at_risk': return '⚠️ Check in to keep streak!';
            case 'broken': return '💔 Streak broken - start fresh!';
            default: return '🔥 Keep it going!';
        }
    };

    const getFlameColor = () => {
        if (streak.effective_streak === 0) return 'text-gray-400';
        if (streak.effective_streak >= 30) return 'text-purple-400';
        if (streak.effective_streak >= 7) return 'text-orange-400';
        return 'text-yellow-400';
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-gradient-to-br ${getStatusColor()} rounded-2xl p-6 border`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <motion.div
                        animate={streak.effective_streak > 0 ? {
                            scale: [1, 1.2, 1],
                            rotate: [0, 10, -10, 0]
                        } : {}}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Flame className={`w-8 h-8 ${getFlameColor()}`} />
                    </motion.div>
                    <div>
                        <p className="text-sm text-white/70">Daily Streak</p>
                        <p className="text-3xl font-bold text-white">
                            {streak.effective_streak} {streak.effective_streak === 1 ? 'day' : 'days'}
                        </p>
                    </div>
                </div>

                {streak.longest_streak > 0 && (
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-white/50 text-xs mb-1">
                            <TrendingUp className="w-3 h-3" />
                            <span>Best</span>
                        </div>
                        <p className="text-lg font-semibold text-white/80">{streak.longest_streak}</p>
                    </div>
                )}
            </div>

            <div className={`text-xs font-medium ${streak.status === 'completed_today' ? 'text-green-400' :
                streak.status === 'at_risk' ? 'text-yellow-400' :
                    streak.status === 'broken' ? 'text-gray-400' : 'text-orange-400'
                }`}>
                {getStatusText()}
            </div>

            {/* Freeze Token Indicator */}
            {streak.freeze_tokens !== undefined && streak.freeze_tokens >= 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🛡️</span>
                            <div>
                                <p className="text-xs text-white/50">Streak Freeze</p>
                                <p className="text-sm font-semibold text-white">
                                    {streak.freeze_tokens} {streak.freeze_tokens === 1 ? 'token' : 'tokens'}
                                </p>
                            </div>
                        </div>
                        {streak.freeze_tokens === 0 && (
                            <button
                                onClick={() => setShowFreezeModal(true)}
                                className="text-xs bg-purple-500/20 hover:bg-purple-500/30 px-3 py-1.5 rounded-lg transition-colors"
                            >
                                Get More
                            </button>
                        )}
                    </div>
                    {streak.freeze_tokens > 0 && (
                        <p className="text-xs text-white/30 mt-1">
                            Auto-saves your streak if you miss a day
                        </p>
                    )}
                </div>
            )}

            {/* Progress bar for next milestone */}
            {streak.effective_streak > 0 && streak.effective_streak < 30 && (
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                        <span>Next milestone</span>
                        <span>{streak.effective_streak < 7 ? '7 days' : '30 days'}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{
                                width: `${(streak.effective_streak / (streak.effective_streak < 7 ? 7 : 30)) * 100}%`
                            }}
                            className="h-full bg-gradient-to-r from-orange-400 to-red-400"
                        />
                    </div>
                </div>
            )}
        </motion.div>
    );
}
