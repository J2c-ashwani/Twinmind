
'use client'

import { useRouter } from 'next/navigation'
import { Sparkles, Brain, MessageCircle, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import MoodCheckIn from '../components/Daily/MoodCheckIn';
import MoodHistory from '../components/Daily/MoodHistory';
import DailyChallenges from '../components/Daily/DailyChallenges';

export default function Home() {
    const router = useRouter()

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 overflow-hidden relative">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
            </div>

            {/* Main content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="z-10 max-w-4xl text-center"
            >
                {/* Logo/Icon */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className="mb-8 inline-block"
                >
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl">
                        <Brain className="w-12 h-12 text-white" />
                    </div>
                </motion.div>

                {/* Heading */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-6xl md:text-7xl font-bold mb-6"
                >
                    <span className="gradient-text">TwinGenie</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="text-xl md:text-2xl text-gray-300 mb-12 max-w-2xl mx-auto"
                >
                    Create your AI Digital Twin that thinks, talks, and behaves exactly like you.
                    Experience the future of self-reflection and personal AI.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 }}
                    className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
                >
                    <button
                        onClick={() => router.push('/onboarding')}
                        className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-semibold text-lg shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2"
                    >
                        <Sparkles className="w-5 h-5" />
                        Create Your Twin
                        <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                    </button>

                    <button
                        onClick={() => router.push('/login')}
                        className="glass-button text-lg flex items-center gap-2"
                    >
                        <MessageCircle className="w-5 h-5" />
                        Sign In
                    </button>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"
                >
                    {[
                        {
                            icon: <Brain className="w-8 h-8" />,
                            title: 'Personality Engine',
                            description: 'AI analyzes 30 questions to build your complete personality model'
                        },
                        {
                            icon: <MessageCircle className="w-8 h-8" />,
                            title: 'Natural Conversations',
                            description: 'Chat with your twin using advanced memory and context'
                        },
                        {
                            icon: <Sparkles className="w-8 h-8" />,
                            title: 'Multiple Modes',
                            description: 'Normal, Future, Dark, and Therapist versions of yourself'
                        }
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1 + idx * 0.2 }}
                            className="glass-card p-6 hover:bg-white/20 transition-all duration-300"
                        >
                            <div className="mb-4 text-purple-400">{feature.icon}</div>
                            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                            <p className="text-gray-400">{feature.description}</p>
                        </motion.div>
                    ))}
                </motion.div>
            </motion.div>
        </div>
    )
}
