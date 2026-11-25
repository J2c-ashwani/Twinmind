'use client';

import { useEffect } from 'react';
import { useGamificationStore } from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { Flame, TrendingUp } from 'lucide-react';

export default function StreakCounter() {
    const { streaks, setStreaks } = useGamificationStore();

    useEffect(() => {
        loadStreaks();
    }, []);

    const loadStreaks = async () => {
        try {
            const data = await apiClient.getStreaks() as any;
            setStreaks(data || []);
        } catch (error) {
            console.error('Failed to load streaks:', error);
        }
    };

    const dailyStreak = streaks.find((s) => s.streak_type === 'daily_checkin');

    if (!dailyStreak) return null;

    const getStreakColor = (streak: number) => {
        if (streak >= 30) return 'from-yellow-500 to-orange-500';
        if (streak >= 7) return 'from-orange-500 to-red-500';
        return 'from-red-500 to-pink-500';
    };

    const getStreakMessage = (streak: number) => {
        if (streak >= 90) return "Legendary! You're unstoppable! 👑";
        if (streak >= 30) return "Amazing! Keep it going! 🔥";
        if (streak >= 7) return "You're on fire! 🚀";
        if (streak >= 3) return "Great start! Keep going! 💪";
        return "Start your journey! ✨";
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* Main streak display */}
            <div className="text-center mb-6">
                <div className={`inline-flex items-center gap-3 px-6 py-4 rounded-full bg-gradient-to-r ${getStreakColor(dailyStreak.current_streak)} text-white shadow-lg`}>
                    <Flame className="w-8 h-8" />
                    <div>
                        <div className="text-4xl font-bold">{dailyStreak.current_streak}</div>
                        <div className="text-sm opacity-90">Day Streak</div>
                    </div>
                </div>
            </div>

            {/* Message */}
            <p className="text-center text-gray-700 font-medium mb-6">
                {getStreakMessage(dailyStreak.current_streak)}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        <span className="text-sm text-gray-600">Longest Streak</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">
                        {dailyStreak.longest_streak} days
                    </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Flame className="w-5 h-5 text-blue-600" />
                        <span className="text-sm text-gray-600">Current</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                        {dailyStreak.current_streak} days
                    </div>
                </div>
            </div>

            {/* Warning if streak might break */}
            {dailyStreak.current_streak > 0 && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                    <p className="text-sm text-yellow-800 text-center">
                        💡 Don't break your streak! Check in today to keep it going.
                    </p>
                </div>
            )}

            {/* Calendar heatmap (simplified) */}
            <div className="mt-6">
                <div className="text-sm text-gray-600 mb-3">Last 7 days</div>
                <div className="flex gap-2">
                    {[...Array(7)].map((_, i) => (
                        <div
                            key={i}
                            className={`flex-1 h-12 rounded-lg ${i < dailyStreak.current_streak
                                ? `bg-gradient-to-br ${getStreakColor(dailyStreak.current_streak)}`
                                : 'bg-gray-100'
                                }`}
                        ></div>
                    ))}
                </div>
            </div>
        </div>
    );
}
