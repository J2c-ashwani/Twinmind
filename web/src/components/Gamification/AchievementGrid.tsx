'use client';

import { useEffect } from 'react';
import { useGamificationStore } from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { Trophy, Lock, Sparkles } from 'lucide-react';

export default function AchievementGrid() {
    const { achievements, setAchievements } = useGamificationStore();

    useEffect(() => {
        loadAchievements();
    }, []);

    const loadAchievements = async () => {
        try {
            const data = await apiClient.getAchievements();
            setAchievements(data);
        } catch (error) {
            console.error('Failed to load achievements:', error);
        }
    };

    const getRarityColor = (rarity: string) => {
        const colors: Record<string, string> = {
            common: 'from-gray-400 to-gray-600',
            rare: 'from-blue-400 to-blue-600',
            epic: 'from-purple-400 to-purple-600',
            legendary: 'from-yellow-400 to-yellow-600',
        };
        return colors[rarity] || colors.common;
    };

    const getRarityGlow = (rarity: string) => {
        const glows: Record<string, string> = {
            common: 'shadow-gray-500/50',
            rare: 'shadow-blue-500/50',
            epic: 'shadow-purple-500/50',
            legendary: 'shadow-yellow-500/50',
        };
        return glows[rarity] || glows.common;
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    Achievements
                </h1>
                <p className="text-gray-600">
                    {achievements.length} achievements unlocked
                </p>
            </div>

            {/* Achievement grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map((achievement, index) => (
                    <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="relative group"
                    >
                        <div
                            className={`bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all cursor-pointer overflow-hidden ${achievement.unlocked_at ? getRarityGlow(achievement.rarity) : ''
                                }`}
                        >
                            {/* Rarity badge */}
                            <div className="absolute top-4 right-4">
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getRarityColor(
                                        achievement.rarity
                                    )}`}
                                >
                                    {achievement.rarity.toUpperCase()}
                                </span>
                            </div>

                            {/* Icon */}
                            <div className="mb-4">
                                {achievement.unlocked_at ? (
                                    <div className="relative">
                                        <div className="text-6xl mb-2">{achievement.icon}</div>
                                        {achievement.rarity === 'legendary' && (
                                            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500 animate-pulse" />
                                        )}
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <div className="text-6xl mb-2 grayscale opacity-30">{achievement.icon}</div>
                                        <Lock className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <h3
                                className={`text-lg font-bold mb-2 ${achievement.unlocked_at ? 'text-gray-900' : 'text-gray-400'
                                    }`}
                            >
                                {achievement.achievement_name}
                            </h3>
                            <p
                                className={`text-sm mb-4 ${achievement.unlocked_at ? 'text-gray-600' : 'text-gray-400'
                                    }`}
                            >
                                {achievement.description}
                            </p>

                            {/* Footer */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
                                        {achievement.points}
                                    </div>
                                    <span className="text-sm text-gray-500">XP</span>
                                </div>

                                {achievement.unlocked_at && (
                                    <span className="text-xs text-gray-500">
                                        {new Date(achievement.unlocked_at).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            {/* Unlock animation overlay */}
                            {achievement.unlocked_at && achievement.rarity === 'legendary' && (
                                <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 pointer-events-none"></div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {achievements.length === 0 && (
                <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Start chatting to unlock achievements!</p>
                </div>
            )}
        </div>
    );
}
