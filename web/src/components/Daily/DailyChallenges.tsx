'use client';

import { useEffect } from 'react';
import { useDailyStore } from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { CheckCircle, Circle, Clock, Gift } from 'lucide-react';

export default function DailyChallenges() {
    const { challenges, setChallenges, completeChallenge } = useDailyStore();

    useEffect(() => {
        loadChallenges();
    }, []);

    const loadChallenges = async () => {
        try {
            const data = await apiClient.getDailyChallenges();
            setChallenges(data);
        } catch (error) {
            console.error('Failed to load challenges:', error);
        }
    };

    const handleComplete = async (challengeId: string) => {
        try {
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
            evening_wins: '🌟',
            vulnerability_challenge: '💙',
        };
        return icons[type] || '✨';
    };

    const completedCount = challenges.filter((c) => c.completed).length;
    const totalCount = challenges.length;

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Daily Challenges</h2>
                    <p className="text-sm text-gray-600">
                        {completedCount}/{totalCount} completed today
                    </p>
                </div>
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                    {completedCount}/{totalCount}
                </div>
            </div>

            {/* Progress bar */}
            <div className="mb-6">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedCount / totalCount) * 100}%` }}
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
                        className={`p-4 rounded-xl border-2 transition-all ${challenge.completed
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 bg-white hover:border-purple-300'
                            }`}
                    >
                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="text-3xl">{getChallengeIcon(challenge.type)}</div>

                            {/* Content */}
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    {challenge.task}
                                </h3>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    {challenge.time_window && (
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{challenge.time_window}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1">
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
                                        ? 'text-green-500 cursor-default'
                                        : 'text-gray-400 hover:text-purple-500 hover:bg-purple-50'
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
