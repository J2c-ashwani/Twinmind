'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { motion } from 'framer-motion';
import {
    captureAttributionFromLocation,
    clearPendingAttribution,
    getPendingAttribution,
} from '@/lib/attribution';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const router = useRouter();
    const supabase = createClientComponentClient();

    useEffect(() => {
        const captured = captureAttributionFromLocation();
        if (captured.referralCode) {
            setReferralCode(captured.referralCode);
        }
    }, []);

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setInfoMessage('');

        const attribution = getPendingAttribution();
        const activeRef = (referralCode || attribution.referralCode || '').trim().toUpperCase() || undefined;

        try {
            // Sign up with Supabase and store referral/UTM metadata for confirmation flows
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        ...(activeRef ? { referral_code: activeRef } : {}),
                        ...(Object.keys(attribution).length > 0 ? { attribution } : {}),
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data.user && data.session?.access_token) {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/auth/signup`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${data.session.access_token}`,
                    },
                    body: JSON.stringify({
                        userId: data.user.id,
                        email: data.user.email,
                        fullName: fullName,
                        referralCode: activeRef,
                        attribution,
                    })
                });

                if (response.ok) {
                    clearPendingAttribution();
                } else {
                    console.warn('Backend signup setup returned non-200; deferred attribution preserved for next login');
                }

                router.refresh();
                router.push('/onboarding');
            } else if (data.user) {
                // Email confirmation is enabled; keep pending attribution in localStorage + auth user_metadata
                setInfoMessage('Check your email to confirm your account, then sign in. Your invite code and progress will be linked automatically.');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to sign up');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-black flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            🧠 TwinGenie
                        </h1>
                        <p className="text-gray-300 mt-2">Create your account</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-5">
                        {referralCode && (
                            <div className="rounded-xl border border-purple-400/30 bg-purple-500/10 px-4 py-3 text-sm text-purple-100">
                                Invite code applied: {referralCode}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="John Doe"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="you@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="••••••••"
                                minLength={6}
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">
                                {error}
                            </div>
                        )}

                        {infoMessage && (
                            <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl text-sm">
                                {infoMessage}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30"
                        >
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating account...
                                </div>
                            ) : (
                                'Sign Up'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-gray-400 mt-6">
                        Already have an account?{' '}
                        <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">
                            Sign in
                        </Link>
                    </p>

                    <p className="text-center text-gray-500 text-xs mt-6">
                        By signing up, you agree to our{' '}
                        <Link href="/terms" className="text-purple-400 hover:text-purple-300">Terms</Link> and{' '}
                        <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Privacy Policy</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
