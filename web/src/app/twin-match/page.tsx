'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, Search, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';

export default function TwinMatchPage() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [matchResult, setMatchResult] = useState<any>(null);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setLoading(true);
        setError('');
        setMatchResult(null);

        try {
            const result = await apiClient.findUserForMatch(searchQuery);
            // Assuming result contains user info, now compare
            const comparison = await apiClient.compareTwins(searchQuery);
            setMatchResult(comparison);
        } catch (err: any) {
            setError(err.message || 'User not found or comparison failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => router.back()}
                        className="glass-button p-2"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Twin Match
                    </h1>
                </div>

                {/* Search Section */}
                <div className="glass-card p-6 mb-8">
                    <h2 className="text-xl font-semibold mb-4">Find a Twin</h2>
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Enter email or username..."
                                className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={loading || !searchQuery.trim()}
                            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {loading ? 'Searching...' : 'Match'}
                            {!loading && <Sparkles className="w-4 h-4" />}
                        </button>
                    </div>
                    {error && (
                        <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                {/* Results Section */}
                {matchResult && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass-card p-6"
                    >
                        <div className="text-center mb-8">
                            <div className="inline-block p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-4">
                                <div className="text-4xl font-bold text-white">
                                    {matchResult.compatibility_score}%
                                </div>
                                <div className="text-sm text-purple-300">Compatibility</div>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">
                                It's a {matchResult.compatibility_score > 80 ? 'Great' : matchResult.compatibility_score > 50 ? 'Good' : 'Challenging'} Match!
                            </h3>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="font-semibold text-green-400 mb-3">Shared Strengths</h4>
                                <ul className="space-y-2">
                                    {matchResult.shared_traits?.map((trait: string, i: number) => (
                                        <li key={i} className="flex items-center gap-2 text-gray-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                            {trait}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <h4 className="font-semibold text-yellow-400 mb-3">Growth Areas</h4>
                                <ul className="space-y-2">
                                    {matchResult.differences?.map((diff: string, i: number) => (
                                        <li key={i} className="flex items-center gap-2 text-gray-300">
                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                            {diff}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
