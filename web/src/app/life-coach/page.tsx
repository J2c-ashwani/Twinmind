'use client';

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { Sparkles, Lock, ArrowRight, Heart, Brain, Zap } from 'lucide-react';
import Link from 'next/link';

export default function LifeCoachPage() {
    const [programs, setPrograms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fallback programs in case API fails
    const fallbackPrograms = [
        {
            id: '1',
            title: 'Anxiety Relief Journey',
            description: 'A 7-day guided program to understand and manage anxiety using proven techniques.',
            category: 'anxiety',
            duration_days: 7,
            is_premium: false
        },
        {
            id: '2',
            title: 'Confidence Builder',
            description: 'Build unshakeable self-confidence with daily exercises and mindset shifts.',
            category: 'growth',
            duration_days: 14,
            is_premium: false
        },
        {
            id: '3',
            title: 'Emotional Intelligence Mastery',
            description: 'Master your emotions and develop deeper connections with others.',
            category: 'mindfulness',
            duration_days: 21,
            is_premium: true
        },
        {
            id: '4',
            title: 'Career Growth Accelerator',
            description: 'Unlock your professional potential with goal-setting and productivity coaching.',
            category: 'growth',
            duration_days: 30,
            is_premium: true
        },
        {
            id: '5',
            title: 'Daily Mindfulness Practice',
            description: 'Start each day with calm and clarity through guided meditation sessions.',
            category: 'mindfulness',
            duration_days: 7,
            is_premium: false
        },
        {
            id: '6',
            title: 'Relationship Healing',
            description: 'Repair and strengthen your most important relationships with guided exercises.',
            category: 'anxiety',
            duration_days: 14,
            is_premium: true
        }
    ];

    useEffect(() => {
        loadPrograms();
    }, []);

    const loadPrograms = async () => {
        try {
            const supabase = createClientComponentClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session) apiClient.setToken(session.access_token);

            const data = await apiClient.getLifeCoachPrograms();
            // Use fallback if API returns empty or invalid data
            setPrograms(Array.isArray(data) && data.length > 0 ? data : fallbackPrograms);
        } catch (error) {
            console.error('Failed to load programs:', error);
            // Use fallback programs on error
            setPrograms(fallbackPrograms);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case 'anxiety': return <Heart className="w-6 h-6 text-pink-500" />;
            case 'growth': return <Zap className="w-6 h-6 text-yellow-500" />;
            default: return <Brain className="w-6 h-6 text-purple-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                    Life Coach Programs
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                    Structured, AI-guided journeys to help you grow, heal, and thrive.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map((program, index) => (
                    <motion.div
                        key={program.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow border border-gray-100"
                    >
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gray-50 rounded-xl">
                                    {getIcon(program.category)}
                                </div>
                                {program.is_premium && (
                                    <div className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                                        <Lock className="w-3 h-3" /> Premium
                                    </div>
                                )}
                            </div>

                            <h3 className="text-xl font-bold mb-2 text-gray-900">
                                {program.title}
                            </h3>
                            <p className="text-gray-600 mb-4 line-clamp-2">
                                {program.description}
                            </p>

                            <div className="flex items-center justify-between text-sm text-gray-500 mb-6">
                                <span>{program.duration_days} Days</span>
                                <span className="capitalize">{program.category}</span>
                            </div>

                            <Link
                                href={`/life-coach/${program.id}`}
                                className="block w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                Start Journey <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
