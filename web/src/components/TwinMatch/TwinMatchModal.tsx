import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Share2, X } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface TwinMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface Comparison {
    compatibility: number;
    user1: { twin_name: string };
    user2: { twin_name: string };
    dimensions: Record<string, { user1: number; user2: number; similarity: number }>;
    insights: string[];
}

export default function TwinMatchModal({ isOpen, onClose }: TwinMatchModalProps) {
    const [identifier, setIdentifier] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [comparison, setComparison] = useState<Comparison | null>(null);

    const handleCompare = async () => {
        if (!identifier.trim()) return;

        setIsLoading(true);
        try {
            const result = await apiClient.compareTwins(identifier) as any;
            setComparison(result || {});
        } catch (error: any) {
            alert(error.message || 'Failed to compare. Make sure your friend has completed their personality profile!');
        } finally {
            setIsLoading(false);
        }
    };

    const shareComparison = async () => {
        if (!comparison) return;

        const text = `My Twin is ${comparison.compatibility}% compatible with ${comparison.user2.twin_name}'s Twin!\n\n${comparison.insights[0]}\n\nCompare your AI Twin with friends on TwinGenie`;

        try {
            if (navigator.share) {
                await navigator.share({ title: 'Twin Match', text });
            }
        } catch (error) {
            console.error('Share failed:', error);
        }
    };

    const reset = () => {
        setComparison(null);
        setIdentifier('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10"
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-purple-400" />
                        <h2 className="text-2xl font-bold text-white">Twin Match</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-white/70" />
                    </button>
                </div>

                {!comparison ? (
                    <>
                        {/* Input */}
                        <p className="text-white/70 mb-4">
                            Compare your twin's personality with a friend! Enter their email or referral code.
                        </p>

                        <div className="space-y-4">
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="friend@email.com or referral code"
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                                onKeyPress={(e) => e.key === 'Enter' && handleCompare()}
                            />

                            <button
                                onClick={handleCompare}
                                disabled={isLoading || !identifier.trim()}
                                className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isLoading ? 'Comparing...' : 'Compare Twins'}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Compatibility Score */}
                        <div className="text-center mb-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', duration: 0.6 }}
                                className="inline-block"
                            >
                                <div className="relative w-32 h-32 mx-auto">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="none"
                                            className="text-white/10"
                                        />
                                        <circle
                                            cx="64"
                                            cy="64"
                                            r="56"
                                            stroke="url(#gradient)"
                                            strokeWidth="8"
                                            fill="none"
                                            strokeDasharray={`${2 * Math.PI * 56}`}
                                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - comparison.compatibility / 100)}`}
                                            className="transition-all duration-1000"
                                        />
                                        <defs>
                                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="#9333EA" />
                                                <stop offset="100%" stopColor="#3B82F6" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-4xl font-bold text-white">{comparison.compatibility}%</span>
                                    </div>
                                </div>
                            </motion.div>
                            <p className="text-white/70 mt-2">Compatibility Score</p>
                        </div>

                        {/* Names */}
                        <div className="flex items-center justify-center gap-4 mb-6">
                            <span className="text-white font-medium">{comparison.user1.twin_name}</span>
                            <span className="text-white/40">⚡</span>
                            <span className="text-white font-medium">{comparison.user2.twin_name}</span>
                        </div>

                        {/* Traits Comparison */}
                        <div className="space-y-3 mb-6">
                            {Object.entries(comparison.dimensions).map(([trait, data]: [string, any]) => (
                                <div key={trait} className="bg-white/5 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-white capitalize">{trait}</span>
                                        <span className="text-xs text-white/50">{data.similarity}% match</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                                                style={{ width: `${(data.user1 / 10) * 100}%` }}
                                            />
                                        </div>
                                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                                style={{ width: `${(data.user2 / 10) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Insights */}
                        <div className="space-y-3 mb-6">
                            {comparison.insights.map((insight, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="bg-white/5 rounded-lg p-4 border-l-2 border-purple-400"
                                >
                                    <p className="text-sm text-white">{insight}</p>
                                </motion.div>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={shareComparison}
                                className="flex-1 bg-white/10 hover:bg-white/20 border border-white/20 text-white py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <Share2 className="w-4 h-4" />
                                Share Results
                            </button>
                            <button
                                onClick={reset}
                                className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-white py-3 rounded-lg font-medium transition-all"
                            >
                                Compare Another
                            </button>
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}
