'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { TrendingUp, Smile, Calendar, Heart, Sparkles, ArrowLeft, Share2, Check } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface DailyInsightItem {
    date: string;
    summary?: string;
    mood_score?: number;
    dominant_emotion?: string;
    key_topics?: string[];
    actionable_tip?: string;
}

interface WeeklyInsightsData {
    summary: string;
    mood_trend: string;
    average_mood: number;
    top_emotions: string[];
    topics: string[];
    daily_data: DailyInsightItem[];
}

export default function WeeklyInsights() {
    const router = useRouter();
    const [insights, setInsights] = useState<WeeklyInsightsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [copiedShare, setCopiedShare] = useState(false);

    useEffect(() => {
        loadInsights();
    }, []);

    const loadInsights = async () => {
        try {
            const supabase = createClientComponentClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                router.push('/login');
                return;
            }
            apiClient.setToken(session.access_token);

            const data = await apiClient.getWeeklyInsights() as WeeklyInsightsData;
            setInsights(data);
        } catch (err: any) {
            console.error('Failed to load insights:', err);
            setError(err?.message || 'Unable to load weekly insights right now.');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!insights) return;
        const shareText = `My TwinGenie Weekly Insights — Average mood: ${Number(insights.average_mood ?? 0).toFixed(1)}/10 (${insights.mood_trend || 'stable'}). ${insights.summary || ''}`;
        try {
            if (navigator.share) {
                await navigator.share({ title: 'My TwinGenie Weekly Insights', text: shareText });
            } else if (navigator.clipboard) {
                await navigator.clipboard.writeText(shareText);
                setCopiedShare(true);
                setTimeout(() => setCopiedShare(false), 2500);
            }
        } catch {
            // User cancelled share dialog
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F0F1E] flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (error || !insights) {
        return (
            <div className="min-h-screen bg-[#0F0F1E] text-white flex flex-col items-center justify-center p-6 text-center">
                <p className="text-gray-300 mb-4">{error || 'No insights available yet. Chat with your twin to generate weekly reflections.'}</p>
                <button
                    onClick={() => router.push('/chat')}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-medium"
                >
                    Back to Chat
                </button>
            </div>
        );
    }

    const dailyData = Array.isArray(insights.daily_data) ? insights.daily_data : [];
    const topEmotions = Array.isArray(insights.top_emotions) ? insights.top_emotions : [];
    const topics = Array.isArray(insights.topics) ? insights.topics : [];
    const avgMoodDisplay = typeof insights.average_mood === 'number'
        ? insights.average_mood.toFixed(1)
        : '—';
    const topEmotionDisplay = topEmotions[0] || 'Thoughtful';

    return (
        <div className="min-h-screen bg-[#0F0F1E] text-white p-6">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Navigation & Header */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </button>
                </div>

                <div className="text-center mb-4">
                    <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Your Weekly Insights
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        {insights.summary || 'Reflections and patterns from your recent conversations.'}
                    </p>
                </div>

                {/* Key Stats (Mobile InsightsScreen Parity) */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-purple-600/80 to-pink-600/80 border border-white/15 rounded-2xl p-6 text-white shadow-lg"
                    >
                        <Smile className="w-8 h-8 mb-3" />
                        <div className="text-3xl font-bold">{avgMoodDisplay}</div>
                        <div className="text-sm text-white/80">Average Mood</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-blue-600/80 to-cyan-600/80 border border-white/15 rounded-2xl p-6 text-white shadow-lg"
                    >
                        <TrendingUp className="w-8 h-8 mb-3" />
                        <div className="text-3xl font-bold capitalize">{insights.mood_trend || 'Stable'}</div>
                        <div className="text-sm text-white/80">Mood Trend</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-emerald-600/80 to-teal-600/80 border border-white/15 rounded-2xl p-6 text-white shadow-lg"
                    >
                        <Calendar className="w-8 h-8 mb-3" />
                        <div className="text-3xl font-bold">{dailyData.length}</div>
                        <div className="text-sm text-white/80">Entries Analyzed</div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-amber-500/80 to-orange-600/80 border border-white/15 rounded-2xl p-6 text-white shadow-lg"
                    >
                        <Heart className="w-8 h-8 mb-3" />
                        <div className="text-2xl font-bold truncate">{topEmotionDisplay}</div>
                        <div className="text-sm text-white/80">Top Emotion</div>
                    </motion.div>
                </div>

                {/* Daily Mood Chart */}
                {dailyData.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-2xl font-bold mb-6">Mood Score Over Time</h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={dailyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="date" stroke="#9CA3AF" />
                                <YAxis domain={[0, 10]} stroke="#9CA3AF" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#161224', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px', color: '#fff' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="mood_score"
                                    stroke="#a855f7"
                                    strokeWidth={3}
                                    name="Mood Score"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Top Emotions & Topics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-4">Dominant Emotions</h2>
                        {topEmotions.length === 0 ? (
                            <p className="text-gray-400 text-sm">Keep chatting to reveal emotional patterns.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {topEmotions.map((emotion: string, index: number) => (
                                    <span
                                        key={`${emotion}-${index}`}
                                        className="px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-200 text-sm font-medium capitalize"
                                    >
                                        {emotion}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <h2 className="text-xl font-bold mb-4">Key Topics</h2>
                        {topics.length === 0 ? (
                            <p className="text-gray-400 text-sm">No topics analyzed yet.</p>
                        ) : (
                            <div className="flex flex-wrap gap-3">
                                {topics.map((topic: string, index: number) => (
                                    <span
                                        key={`${topic}-${index}`}
                                        className="px-4 py-2 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-200 text-sm font-medium"
                                    >
                                        {topic}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Daily Reflections & Tips */}
                {dailyData.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <Sparkles className="w-6 h-6 text-purple-400" />
                            <h2 className="text-2xl font-bold">Daily Reflections & Guidance</h2>
                        </div>
                        <div className="space-y-4">
                            {dailyData.map((day, index) => (
                                <div
                                    key={`${day.date}-${index}`}
                                    className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1.5"
                                >
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>{day.date}</span>
                                        {day.dominant_emotion && (
                                            <span className="capitalize text-purple-300">{day.dominant_emotion}</span>
                                        )}
                                    </div>
                                    {day.summary && <p className="text-gray-200 text-sm">{day.summary}</p>}
                                    {day.actionable_tip && (
                                        <p className="text-xs text-emerald-300">Tip: {day.actionable_tip}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Share Button */}
                <div className="text-center pb-4">
                    <button
                        onClick={handleShare}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:shadow-xl transition-all"
                    >
                        {copiedShare ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
                        {copiedShare ? 'Summary Copied!' : 'Share Your Progress'}
                    </button>
                </div>
            </div>
        </div>
    );
}
