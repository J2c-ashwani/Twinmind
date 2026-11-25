'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store/useStore';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { flushPendingAttribution } from '@/lib/attribution';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [redirectTo, setRedirectTo] = useState('/chat');
    const { setUser } = useUserStore();

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('error') === 'oauth_failed') {
            setError('Google sign-in could not be completed. Please try again.');
        }
        const target = params.get('redirectTo');
        if (target && target.startsWith('/') && !target.startsWith('//')) {
            setRedirectTo(target);
        }
    }, []);

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            const nextQuery = redirectTo !== '/chat' ? `?next=${encodeURIComponent(redirectTo)}` : '';
            const { error: oauthError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback${nextQuery}`,
                },
            });
            if (oauthError) throw oauthError;
        } catch (err: any) {
            setError(err.message || 'Failed to sign in with Google');
            setGoogleLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Real Supabase authentication
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (signInError) throw signInError;

            if (data.user) {
                const accessToken = data.session?.access_token;
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

                if (accessToken) {
                    await flushPendingAttribution({
                        accessToken,
                        userId: data.user.id,
                        email: data.user.email,
                        fullName: data.user.user_metadata?.full_name,
                        userMetadata: data.user.user_metadata,
                    });
                }

                // Resolve real subscription status so Pro users keep Pro state on web
                let isPro = false;
                if (accessToken) {
                    try {
                        const subRes = await fetch(`${apiUrl}/api/subscription/status`, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });
                        if (subRes.ok) {
                            const subData = await subRes.json();
                            isPro = Boolean(subData?.isPro ?? subData?.subscription?.is_pro);
                        }
                    } catch {
                        // Ignore non-fatal subscription lookup error during login
                    }
                }

                // Store user in local state
                setUser({
                    id: data.user.id,
                    email: data.user.email || '',
                    name: data.user.user_metadata?.full_name,
                    is_pro: isPro
                });

                // Refresh router to ensure middleware sees the new cookie
                router.refresh();

                // Check if user has completed onboarding via backend first (bypasses client RLS quirks)
                let hasProfile = false;
                if (accessToken) {
                    try {
                        const profileRes = await fetch(`${apiUrl}/api/personality/profile`, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });
                        hasProfile = profileRes.ok;
                    } catch {
                        // Fall through to Supabase check
                    }
                }

                if (!hasProfile) {
                    const { data: profile, error: profileError } = await supabase
                        .from('personality_profiles')
                        .select('user_id')
                        .eq('user_id', data.user.id)
                        .maybeSingle();

                    if (profileError && profileError.code !== 'PGRST116') {
                        console.error('Error checking profile:', profileError);
                    }
                    hasProfile = Boolean(profile);
                }

                // Redirect based on whether onboarding is complete
                if (hasProfile) {
                    router.push(redirectTo);
                } else {
                    router.push('/onboarding');
                }
            }

        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };



    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden relative">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md z-10"
            >
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/10">
                    <div className="text-center mb-8">
                        <img
                            src="/logo.png"
                            alt="TwinGenie Logo"
                            className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-lg shadow-purple-500/25 mb-4"
                        />
                        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
                        <p className="text-gray-400">Sign in to continue your journey</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || googleLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Sign In <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="my-5 flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs uppercase tracking-wider text-gray-400">or</span>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading || googleLoading}
                        className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {googleLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                                    <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z" />
                                </svg>
                                <span>Continue with Google</span>
                            </>
                        )}
                    </button>



                    <p className="mt-6 text-center text-sm text-gray-400">
                        Don't have an account?{' '}
                        <button onClick={() => router.push('/onboarding')} className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
                            Create Twin
                        </button>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
