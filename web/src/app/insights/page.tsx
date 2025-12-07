'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { TrendingUp, MessageCircle, Heart, Target, Sparkles } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
} from 'recharts';

export default function WeeklyInsights() {
    const [insights, setInsights] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        try {
            const supabase = createClientComponentClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session) apiClient.setToken(session.access_token);

            const data = await apiClient.getWeeklyInsights();
            setInsights(data);
        } catch (error) {
            console.error('Failed to load insights:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!insights) return null;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2">Your Weekly Insights</h1>
                <p className="text-gray-600">
                    {new Date(insights.week_start).toLocaleDateString()} -{' '}
                    {new Date(insights.week_end).toLocaleDateString()}
                </p>
            </div>

            {/* Key Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-6 text-white shadow-lg"
                >
                    <MessageCircle className="w-8 h-8 mb-3" />
                    <div className="text-3xl font-bold">{insights.total_messages}</div>
                    <div className="text-sm opacity-90">Messages</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg"
                >
                    <TrendingUp className="w-8 h-8 mb-3" />
                    <div className="text-3xl font-bold">+{insights.mood_improvement}%</div>
                    <div className="text-sm opacity-90">Mood Improvement</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-lg"
                >
                    <Heart className="w-8 h-8 mb-3" />
                    <div className="text-3xl font-bold">{insights.trust_score}</div>
                    <div className="text-sm opacity-90">Trust Level</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg"
                >
                    <Target className="w-8 h-8 mb-3" />
                    <div className="text-3xl font-bold">{insights.streak_days}</div>
                    <div className="text-sm opacity-90">Day Streak</div>
                </motion.div>
            </div>

            {/* Emotional Trend Chart */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Emotional Trends</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={insights.emotional_timeline}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line
                            type="monotone"
                            dataKey="trust"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            name="Trust"
                        />
                        <Line
                            type="monotone"
                            dataKey="dependency"
                            stroke="#ec4899"
                            strokeWidth={2}
                            name="Dependency"
                        />
                        <Line
                            type="monotone"
                            dataKey="valence"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Mood"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Personality Radar */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Personality Profile</h2>
                <ResponsiveContainer width="100%" height={400}>
                    <RadarChart data={insights.personality_data}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="trait" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                            name="Your Profile"
                            dataKey="score"
                            stroke="#8b5cf6"
                            fill="#8b5cf6"
                            fillOpacity={0.6}
                        />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Top Topics */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6">What We Talked About</h2>
                <div className="flex flex-wrap gap-3">
                    {insights.top_topics.map((topic: any, index: number) => (
                        <motion.div
                            key={topic.name}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 font-medium"
                            style={{ fontSize: `${14 + topic.count / 2}px` }}
                        >
                            {topic.name} ({topic.count})
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* AI Observations */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    <h2 className="text-2xl font-bold text-purple-900">AI Observations</h2>
                </div>
                <div className="space-y-3">
                    {insights.ai_observations.map((observation: string, index: number) => (
                        <motion.p
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="text-gray-700 pl-4 border-l-4 border-purple-400"
                        >
                            {observation}
                        </motion.p>
                    ))}
                </div>
            </div>

            {/* Share Button */}
            <div className="text-center">
                <button className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-xl transition-all">
                    Share Your Progress 📊
                </button>
            </div>
        </div>
    );
}
