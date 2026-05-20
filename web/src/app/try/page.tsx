'use client'

import { useEffect } from 'react'
import { Brain, ArrowRight, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

/**
 * /try — Smart redirect page for shared messages.
 * 
 * When someone receives a shared TwinGenie message, the link
 * brings them here. This page:
 * 1. Detects their platform (iOS / Android / Desktop)
 * 2. Shows a quick emotional hook
 * 3. Redirects to the right store or web app
 */
export default function TryPage() {
    const playStoreUrl =
        process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
        'https://play.google.com/store/apps/details?id=com.asmind.app'

    useEffect(() => {
        // Auto-redirect after 3 seconds
        const timer = setTimeout(() => {
            redirectToApp()
        }, 3000)
        return () => clearTimeout(timer)
    }, [])

    function redirectToApp() {
        const ua = navigator.userAgent.toLowerCase()

        if (/iphone|ipad|ipod/.test(ua)) {
            // iOS launch is not active yet; keep users in the web onboarding flow.
            window.location.href = '/onboarding'
        } else if (/android/.test(ua)) {
            // Android → Play Store
            window.location.href = playStoreUrl
        } else {
            // Desktop → Web app
            window.location.href = '/onboarding'
        }
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="z-10 max-w-md text-center"
            >
                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
                    <Brain className="w-8 h-8 text-white" />
                </div>

                <h1 className="text-3xl md:text-4xl font-bold mb-4">
                    Someone shared a{' '}
                    <span className="gradient-text">moment</span>{' '}
                    with you
                </h1>

                <p className="text-gray-400 mb-8 text-lg">
                    TwinGenie — the AI that actually knows you.
                    Try it yourself.
                </p>

                <button
                    onClick={redirectToApp}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-semibold text-lg shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-3 mx-auto"
                >
                    <Sparkles className="w-5 h-5" />
                    Try TwinGenie Free
                    <ArrowRight className="w-5 h-5" />
                </button>

                <p className="mt-6 text-gray-500 text-sm">
                    Redirecting automatically...
                </p>
            </motion.div>
        </div>
    )
}
