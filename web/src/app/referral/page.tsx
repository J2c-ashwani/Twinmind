'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { motion } from 'framer-motion';
import { Copy, Share2, Users, Gift, Check } from 'lucide-react';

export default function ReferralPage() {
    const [referralCode, setReferralCode] = useState('');
    const [stats, setStats] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadReferralData();
    }, []);

    const loadReferralData = async () => {
        try {
            const [code, statsData] = await Promise.all([
                apiClient.getReferralCode(),
                apiClient.getReferralStats(),
            ]);
            setReferralCode((code as any)?.code || '');
            setStats(statsData);
        } catch (error) {
            console.error('Failed to load referral data:', error);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(`https://twinmind.app/join/${referralCode}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareToSocial = (platform: string) => {
        const url = `https://twinmind.app/join/${referralCode}`;
        const text = "I'm using TwinMind - the most advanced AI companion. Join me!";

        const urls: Record<string, string> = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
        };

        window.open(urls[platform], '_blank');
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="text-center mb-8">
                <h1 className="text-4xl font-bold mb-2">Invite Friends</h1>
                <p className="text-gray-600">Share TwinMind and earn rewards together!</p>
            </div>

            {/* Referral Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-8 text-white shadow-2xl mb-8"
            >
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold mb-2">Your Referral Code</h2>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
                        <div className="text-3xl font-mono font-bold tracking-wider">{referralCode}</div>
                    </div>
                    <button
                        onClick={copyToClipboard}
                        className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
                    >
                        {copied ? (
                            <>
                                <Check className="w-5 h-5" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="w-5 h-5" />
                                Copy Link
                            </>
                        )}
                    </button>
                </div>

                {/* Share Buttons */}
                <div className="grid grid-cols-3 gap-4">
                    <button
                        onClick={() => shareToSocial('twitter')}
                        className="p-4 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all"
                    >
                        <div className="text-2xl mb-1">𝕏</div>
                        <div className="text-sm">Twitter</div>
                    </button>
                    <button
                        onClick={() => shareToSocial('facebook')}
                        className="p-4 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all"
                    >
                        <div className="text-2xl mb-1">📘</div>
                        <div className="text-sm">Facebook</div>
                    </button>
                    <button
                        onClick={() => shareToSocial('whatsapp')}
                        className="p-4 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-all"
                    >
                        <div className="text-2xl mb-1">💬</div>
                        <div className="text-sm">WhatsApp</div>
                    </button>
                </div>
            </motion.div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <Users className="w-8 h-8 text-purple-500 mb-3" />
                        <div className="text-3xl font-bold text-gray-900">{stats.invited}</div>
                        <div className="text-sm text-gray-600">Friends Invited</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <Check className="w-8 h-8 text-green-500 mb-3" />
                        <div className="text-3xl font-bold text-gray-900">{stats.joined}</div>
                        <div className="text-sm text-gray-600">Friends Joined</div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <Gift className="w-8 h-8 text-yellow-500 mb-3" />
                        <div className="text-3xl font-bold text-gray-900">{stats.rewards_earned}</div>
                        <div className="text-sm text-gray-600">XP Earned</div>
                    </div>
                </div>
            )}

            {/* Rewards */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-6">Referral Rewards</h2>
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            50
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold">You Get 50 XP</div>
                            <div className="text-sm text-gray-600">When your friend joins</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                            25
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold">They Get 25 XP</div>
                            <div className="text-sm text-gray-600">Welcome bonus for new users</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-white font-bold">
                            🎁
                        </div>
                        <div className="flex-1">
                            <div className="font-semibold">Unlock Premium Features</div>
                            <div className="text-sm text-gray-600">Refer 5 friends to unlock exclusive features</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
