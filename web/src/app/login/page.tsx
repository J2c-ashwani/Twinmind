'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Brain, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store/useStore';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { setUser } = useUserStore();

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
                // Store user in local state
                setUser({
                    id: data.user.id,
                    email: data.user.email || '',
                    name: data.user.user_metadata?.full_name,
                    is_pro: false
                });

                // Refresh router to ensure middleware sees the new cookie
                router.refresh();

                // Check if user has completed onboarding
                const { data: profile, error: profileError } = await supabase
                    .from('personality_profiles')
                    .select('user_id')
                    .eq('user_id', data.user.id)
                    .single();

                // Ignore "not found" errors - that just means no profile exists
                if (profileError && profileError.code !== 'PGRST116') {
                    console.error('Error checking profile:', profileError);
                }

                // Redirect based on whether onboarding is complete
                if (profile) {
                    console.log('Profile found, redirecting to chat');
                    router.push('/chat');
                } else {
                    console.log('No profile found, redirecting to onboarding');
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
                        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                            <Brain className="w-8 h-8 text-white" />
                        </div>
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
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl shadow-lg shadow-purple-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
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
