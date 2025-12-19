'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, LogIn, ArrowRight } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import GrowthCircleWidget from '@/components/Circles/GrowthCircleWidget';
import CircleInviteModal from '@/components/Circles/CircleInviteModal';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function GrowthCirclesPage() {
    const [hasCircle, setHasCircle] = useState<boolean | null>(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [activeCircle, setActiveCircle] = useState<{ id: string; name: string } | null>(null);
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [joinError, setJoinError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const supabase = createClientComponentClient();

    useEffect(() => {
        checkCircleStatus();
    }, []);

    const checkCircleStatus = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                apiClient.setToken(session.access_token);
                // The widget handles its own loading, but we need to know if we even have a circle 
                // to toggle the "Join" UI vs "Dashboard" UI
                const data = await apiClient.getMyCircle() as any;
                setHasCircle(!!data?.circle);
                if (data?.circle) {
                    setActiveCircle({ id: data.circle.id, name: data.circle.name });
                }
            }
        } catch (error) {
            console.error('Failed to check status:', error);
            setHasCircle(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinCircle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!joinCode.trim()) return;

        setIsJoining(true);
        setJoinError('');

        try {
            await apiClient.joinCircle(joinCode);
            // Success! Reload to show the dashboard
            window.location.reload();
        } catch (error: any) {
            setJoinError(error.message || 'Failed to join circle. Check code and try again.');
        } finally {
            setIsJoining(false);
        }
    };

    const handleInviteClick = (circleId: string, circleName: string) => {
        setActiveCircle({ id: circleId, name: circleName });
        setShowInviteModal(true);
    };

    if (isLoading) {
        return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Spotlight Header */}
            <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 text-white pt-20 pb-32 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3"></div>

                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                            <Users className="w-4 h-4 text-purple-300" />
                            <span className="text-purple-100">Beta Feature</span>
                        </div>
                        <h1 className="text-5xl font-bold mb-6 tracking-tight">
                            Growth Circles
                        </h1>
                        <p className="text-xl text-purple-100 max-w-2xl mx-auto leading-relaxed">
                            Join forces with up to 5 friends. Build streaks, unlock milestones, and keep each other accountable.
                        </p>
                    </motion.div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 -mt-24 relative z-20">
                {/* Main Content Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8"
                >
                    <GrowthCircleWidget onInviteClick={handleInviteClick} />

                    {/* Show Join Form ONLY if user has no circle (Widget shows 'Create' state by default if null, but we want 'Join' option too) */}
                    {!hasCircle && (
                        <div className="mt-12 pt-12 border-t border-gray-100">
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Have an invite code?</h3>
                                <p className="text-gray-500">Enter the code shared by your friend to join their circle</p>
                            </div>

                            <form onSubmit={handleJoinCircle} className="max-w-md mx-auto">
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <LogIn className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                            placeholder="ENTER-CODE"
                                            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-center tracking-widest uppercase"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isJoining || !joinCode}
                                        className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isJoining ? 'Joining...' : 'Join'}
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                {joinError && (
                                    <p className="mt-3 text-red-500 text-sm text-center bg-red-50 py-2 rounded-lg">
                                        {joinError}
                                    </p>
                                )}
                            </form>
                        </div>
                    )}
                </motion.div>

                {/* Features Grid */}
                {!hasCircle && (
                    <div className="grid md:grid-cols-3 gap-6 mt-12">
                        {[
                            {
                                icon: "🔥",
                                title: "Collective Streaks",
                                desc: "Combine your daily streaks to unlock higher tiers."
                            },
                            {
                                icon: "🏆",
                                title: "Group Milestones",
                                desc: "Hit goals together to earn exclusive badges."
                            },
                            {
                                icon: "🧠",
                                title: "AI Insights",
                                desc: "Get group-level insights on your collective growth."
                            }
                        ].map((feature, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + (i * 0.1) }}
                                className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center"
                            >
                                <div className="text-4xl mb-4">{feature.icon}</div>
                                <h3 className="font-bold text-gray-900 mb-2">{feature.title}</h3>
                                <p className="text-sm text-gray-500">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Invite Modal */}
            {activeCircle && (
                <CircleInviteModal
                    isOpen={showInviteModal}
                    onClose={() => setShowInviteModal(false)}
                    circleId={activeCircle.id}
                    circleName={activeCircle.name}
                />
            )}
        </div>
    );
}
