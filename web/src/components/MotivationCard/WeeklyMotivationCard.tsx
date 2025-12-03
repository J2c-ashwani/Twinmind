import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Share2, Download, RefreshCw } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface MotivationCard {
    id: string;
    quote: string;
    twin_name: string;
    week_start: string;
    week_end: string;
    is_shared: boolean;
}

export default function WeeklyMotivationCard() {
    const [card, setCard] = useState<MotivationCard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        loadCard();
    }, []);

    const loadCard = async () => {
        try {
            const data = await apiClient.getWeeklyMotivationCard();
            setCard(data.card);
        } catch (error) {
            console.error('Failed to load card:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateCard = async () => {
        setIsGenerating(true);
        try {
            const data = await apiClient.generateMotivationCard();
            setCard(data.card);
        } catch (error) {
            console.error('Failed to generate card:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const shareCard = async () => {
        if (!card) return;

        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'My Weekly Motivation',
                    text: `"${card.quote}" - ${card.twin_name}`,
                    url: window.location.origin
                });

                await apiClient.markCardShared(card.id, 'native');
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20">
                <div className="animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-32 mb-4"></div>
                    <div className="h-16 bg-white/10 rounded"></div>
                </div>
            </div>
        );
    }

    if (!card) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-500/20"
            >
                <div className="flex items-center gap-3 mb-4">
                    <Sparkles className="w-6 h-6 text-purple-400" />
                    <span className="text-sm text-white/70">Weekly Motivation</span>
                </div>
                <p className="text-white/60 mb-4">
                    Chat more this week to unlock your personalized motivation card!
                </p>
                <button
                    onClick={generateCard}
                    disabled={isGenerating}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 text-white py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isGenerating ? 'Generating...' : 'Try to Generate Now'}
                </button>
            </motion.div>
        );
    }

    const weekStart = new Date(card.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const weekEnd = new Date(card.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-8 border border-purple-500/30 overflow-hidden"
        >
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl"></div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <motion.div
                        animate={{
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1]
                        }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        <Sparkles className="w-8 h-8 text-purple-400" />
                    </motion.div>
                    <div>
                        <p className="text-xs text-white/50">Weekly Motivation</p>
                        <p className="text-sm text-white/70">{weekStart} - {weekEnd}</p>
                    </div>
                </div>
            </div>

            {/* Quote */}
            <div className="relative z-10 mb-6">
                <blockquote className="text-2xl font-semibold text-white leading-relaxed italic">
                    "{card.quote}"
                </blockquote>
                <p className="text-right text-white/60 mt-4">— {card.twin_name}</p>
            </div>

            {/* Actions */}
            <div className="relative z-10 flex gap-3">
                <button
                    onClick={shareCard}
                    className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                >
                    <Share2 className="w-4 h-4" />
                    Share
                </button>
                <button
                    onClick={generateCard}
                    disabled={isGenerating}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white p-2.5 rounded-lg transition-all disabled:opacity-50"
                    title="Refresh quote"
                >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </motion.div>
    );
}
