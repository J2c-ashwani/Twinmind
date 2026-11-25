'use client';

import { useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useDailyStore } from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Clock, Gift } from 'lucide-react';

export default function DailyChallenges() {
    const supabase = createClientComponentClient();
    const { challenges, setChallenges, completeChallenge } = useDailyStore();

    useEffect(() => {
        loadChallenges();
    }, []);

    const loadChallenges = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                apiClient.setToken(session.access_token);
            }
            const data = await apiClient.getDailyChallenges() as any;
            const list = Array.isArray(data) ? data : (data?.challenges || []);
            setChallenges(list);
        } catch (error) {
            console.error('Failed to load challenges:', error);
        }
    };

    const handleComplete = async (challengeId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                apiClient.setToken(session.access_token);
            }
            await apiClient.completeChallenge(challengeId);
            completeChallenge(challengeId);
        } catch (error) {
            console.error('Failed to complete challenge:', error);
        }
    };

    const getChallengeIcon = (type: string) => {
        const icons: Record<string, string> = {
            morning_reflection: '☀️',
            gratitude_moment: '🙏',
            mindful_breathing: '🧘',
            evening_wins: '🌟',
            vulnerability_challenge: '💙',
        };
        return icons[type] || '✨';
    };

    const completedCount = challenges.filter((c) => c.completed).length;
    const totalCount = challenges.length;
    const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <div className="glass-card rounded-2xl p-6 text-white">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Daily Challenges</h2>
                    <p className="text-sm text-gray-400">
                        {completedCount}/{totalCount} completed today
                    </p>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                    {completedCount}/{totalCount}
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                </div>
            </div>

            {/* Challenges */}
            <div className="space-y-4">
                {challenges.map((challenge, index) => (
                    <motion.div
                        key={challenge.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-xl border transition-all ${challenge.completed
                            ? 'border-green-500/40 bg-green-500/10'
                            : 'border-white/10 bg-white/5 hover:border-purple-500/40'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="text-3xl">{getChallengeIcon(challenge.type)}</div>

                            {/* Content */}
                            <div className="flex-1">
                                <h3 className="font-semibold text-white mb-1">
                                    {challenge.task}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-400">
                                    {challenge.time_window && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{challenge.time_window}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1 text-purple-300">
                                        <Gift className="w-4 h-4" />
                                        <span>{challenge.reward} XP</span>
                                    </div>
                                </div>
                            </div>

                            {/* Complete button */}
                            <button
                                onClick={() => !challenge.completed && handleComplete(challenge.id)}
                                disabled={challenge.completed}
                                className={`p-2 rounded-full transition-all ${challenge.completed
                                    ? 'text-green-400 cursor-default'
                                    : 'text-gray-400 hover:text-purple-400 hover:bg-white/10'
                                    }`}
                            >
                                {challenge.completed ? (
                                    <CheckCircle className="w-8 h-8" />
                                ) : (
                                    <Circle className="w-8 h-8" />
                                )}
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Completion message */}
            {completedCount === totalCount && totalCount > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-6 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white text-center"
                >
                    <p className="font-bold text-lg">🎉 All challenges completed!</p>
                    <p className="text-sm opacity-90">Come back tomorrow for new challenges!</p>
                </motion.div>
            )}
        </div>
    );
}
