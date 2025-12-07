import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Flame, TrendingUp, UserPlus, Crown, Award } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Circle {
    id: string;
    name: string;
    collective_streak: number;
    member_count: number;
    user_role: string;
}

interface CircleWidgetProps {
    onInviteClick?: (circleId: string, circleName: string) => void;
}

export default function GrowthCircleWidget({ onInviteClick }: CircleWidgetProps) {
    const [circle, setCircle] = useState<Circle | null>(null);
    const [progress, setProgress] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClientComponentClient();

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                apiClient.setToken(session.access_token);
                loadCircle();
            } else {
                setIsLoading(false);
            }
        };
        init();
    }, []);

    const loadCircle = async () => {
        try {
            const data = await apiClient.getMyCircle() as any;
            if (data?.circle) {
                setCircle(data.circle);
                const progressData = await apiClient.getCircleProgress(data.circle.id);
                setProgress(progressData);
            }
        } catch (error) {
            console.error('Failed to load circle:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getNextMilestone = () => {
        if (!progress) return null;
        const streak = progress.collective_streak || 0;
        if (streak < 10) return { days: 10, name: 'Circle Insights' };
        if (streak < 30) return { days: 30, name: 'Wisdom Twin' };
        if (streak < 90) return { days: 90, name: 'Circle Challenges' };
        return null;
    };

    const getMilestoneProgress = () => {
        const next = getNextMilestone();
        if (!next || !progress) return 0;
        return (progress.collective_streak / next.days) * 100;
    };

    const handleCreateCircle = async () => {
        console.log('=== CREATE CIRCLE BUTTON CLICKED ===');
        try {
            console.log('Calling apiClient.createCircle()...');
            const data = await apiClient.createCircle('My Growth Circle') as any;
            console.log('Circle create response:', data);

            if (data?.circle) {
                setCircle(data.circle);
                console.log('Circle set, fetching progress...');
                // Reload to get progress
                const progressData = await apiClient.getCircleProgress(data.circle.id) as any;
                console.log('Progress data:', progressData);
                setProgress(progressData);
                console.log('✅ Circle created successfully!');
            }
        } catch (error: any) {
            console.error('❌ Failed to create circle:', error);
            const errorMessage = error.message || 'Failed to create circle. Please try again.';
            console.log('Showing alert with message:', errorMessage);
            alert(errorMessage);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-500/20">
                <div className="animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-white/10 rounded w-32"></div>
                </div>
            </div>
        );
    }

    if (!circle) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-500/20"
            >
                <div className="flex items-center gap-3 mb-3">
                    <Users className="w-6 h-6 text-purple-400" />
                    <span className="text-sm text-white/70">Growth Circle</span>
                </div>
                <p className="text-xl font-bold text-white mb-2">Create Your Circle</p>
                <p className="text-xs text-white/40">
                    Invite friends to grow together and unlock exclusive features
                </p>
                <button
                    onClick={handleCreateCircle}
                    className="mt-4 w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                    Get Started
                </button>
            </motion.div>
        );
    }

    const nextMilestone = getNextMilestone();

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-2xl p-6 border border-purple-500/30"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Users className="w-8 h-8 text-purple-400" />
                        {circle.user_role === 'creator' && (
                            <Crown className="w-3 h-3 text-yellow-400 absolute -top-1 -right-1" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-white/70">Growth Circle</p>
                        <p className="text-lg font-bold text-white">{circle.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-1 text-white/50 text-xs">
                        <Users className="w-3 h-3" />
                        <span>{circle.member_count}/5</span>
                    </div>
                </div>
            </div>

            {/* Collective Streak */}
            <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            rotate: [0, 10, -10, 0],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    >
                        <Flame className="w-6 h-6 text-orange-400" />
                    </motion.div>
                    <div className="flex-1">
                        <p className="text-xs text-white/50">Collective Streak</p>
                        <p className="text-2xl font-bold text-white">
                            {progress?.collective_streak || 0} days
                        </p>
                    </div>
                    {progress?.milestones?.length > 0 && (
                        <Award className="w-5 h-5 text-yellow-400" />
                    )}
                </div>
            </div>

            {/* Next Milestone Progress */}
            {nextMilestone && (
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-white/40 mb-2">
                        <span>Next: {nextMilestone.name}</span>
                        <span>{nextMilestone.days} days</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${getMilestoneProgress()}%` }}
                            className="h-full bg-gradient-to-r from-purple-400 to-blue-400"
                        />
                    </div>
                </div>
            )}

            {/* Invite Button */}
            {circle.member_count < 5 && (
                <button
                    onClick={() => onInviteClick?.(circle.id, circle.name)}
                    className="w-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-white py-2 px-4 rounded-lg font-medium hover:border-purple-500/50 transition-all flex items-center justify-center gap-2"
                >
                    <UserPlus className="w-4 h-4" />
                    Invite Friends ({5 - circle.member_count} spots left)
                </button>
            )}

            {/* Full Circle Badge */}
            {circle.member_count === 5 && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg py-2 px-4 text-center">
                    <p className="text-green-400 text-sm font-medium">🎉 Circle is Full!</p>
                </div>
            )}
        </motion.div>
    );
}
