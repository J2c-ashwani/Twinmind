
'use client'

import { useRouter } from 'next/navigation'
import { Brain, ArrowRight, Shield, Sparkles, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Home() {
    const router = useRouter()

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
            {/* Ambient background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-3xl" />
            </div>

            {/* Main content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 max-w-3xl text-center"
            >
                {/* Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="mb-8 inline-block"
                >
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
                        <Brain className="w-10 h-10 text-white" />
                    </div>
                </motion.div>

                {/* Headline — Emotion first, not feature first */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-5xl md:text-7xl font-bold mb-6 leading-tight"
                >
                    The AI that actually{' '}
                    <span className="gradient-text">knows you</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-lg md:text-xl text-gray-300 mb-10 max-w-xl mx-auto leading-relaxed"
                >
                    Your AI companion for honest reflection, emotional support,
                    and personal growth. Not a chatbot — a digital twin built from
                    your personality.
                </motion.p>

                {/* Single CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
                >
                    <button
                        onClick={() => router.push('/onboarding')}
                        className="group relative px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-semibold text-lg shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-3"
                    >
                        <Sparkles className="w-5 h-5" />
                        Try It Free
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={() => router.push('/login')}
                        className="glass-button text-base flex items-center gap-2 opacity-80 hover:opacity-100"
                    >
                        Already have an account? Sign In
                    </button>
                </motion.div>

                {/* Trust signals — minimal, honest */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="flex flex-wrap justify-center gap-8 text-sm text-gray-400"
                >
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-400" />
                        <span>Your data stays private</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-purple-400" />
                        <span>4 AI personality modes</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-pink-400" />
                        <span>Free to start</span>
                    </div>
                </motion.div>

                {/* One-liner social proof placeholder */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="mt-12 text-gray-500 text-sm"
                >
                    Built for people who think deeply about who they are.
                </motion.p>
            </motion.div>
        </div>
    )
}
