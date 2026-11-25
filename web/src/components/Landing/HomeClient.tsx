'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    ArrowRight,
    CheckCircle2,
    Clock,
    Menu,
    MessageCircle,
    Shield,
    Smartphone,
    Sparkles,
    X,
} from 'lucide-react'
import { motion } from 'framer-motion'

const HEADER_LINKS = [
    { href: '/test', label: 'Quick 30s Test' },
    { href: '/methodology', label: 'How It Works' },
    { href: '/compare', label: 'Compare' },
    { href: '/subscription', label: 'Pricing' },
    { href: '/faq', label: 'FAQ' },
]

export default function HomeClient() {
    const router = useRouter()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const playStoreUrl =
        process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
        'https://play.google.com/store/apps/details?id=com.asmind.app'

    return (
        <div className="min-h-screen flex flex-col justify-between overflow-x-hidden relative">
            {/* Ambient background matching Oct 27 UI */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"
                    style={{ animationDuration: '4s' }}
                />
                <div
                    className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse"
                    style={{ animationDuration: '6s', animationDelay: '1s' }}
                />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-500/10 rounded-full blur-3xl" />
            </div>

            {/* Clean Consumer Top Header */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/70 border-b border-white/10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <Link href="/" className="flex items-center gap-2.5 shrink-0">
                        <img
                            src="/logo.png"
                            alt="TwinGenie Logo"
                            className="w-9 h-9 rounded-xl object-cover shadow-md shadow-purple-500/25 border border-white/15"
                        />
                        <span className="font-bold text-lg tracking-tight text-white">
                            TwinGenie
                        </span>
                    </Link>

                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
                        {HEADER_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className="hover:text-white transition-colors"
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2.5">
                        <Link
                            href="/login"
                            className="hidden sm:inline-flex px-3.5 py-2 text-sm font-medium text-gray-200 hover:text-white transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/onboarding"
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition-all whitespace-nowrap"
                        >
                            Create Your Twin
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen((v) => !v)}
                            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                            className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-white/15 bg-white/5 text-gray-200"
                        >
                            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-white/10 bg-slate-950/95 px-4 py-3 space-y-1.5">
                        {HEADER_LINKS.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className="block px-3 py-2 rounded-lg text-sm text-gray-200 hover:bg-white/10 hover:text-white"
                            >
                                {item.label}
                            </Link>
                        ))}
                        <Link
                            href="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block px-3 py-2 rounded-lg text-sm font-medium text-purple-300 hover:bg-white/10"
                        >
                            Already have an account? Sign In
                        </Link>
                    </div>
                )}
            </header>

            {/* Main content — Oct 27 focused consumer flow + mobile Why-35 clarity */}
            <motion.main
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
                className="z-10 max-w-3xl mx-auto text-center px-4 sm:px-6 py-8 sm:py-10"
            >
                {/* Original Brand Logo */}
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
                    className="mb-5 inline-flex flex-col items-center gap-2"
                >
                    <img
                        src="/logo.png"
                        alt="TwinGenie Logo"
                        className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl object-cover shadow-2xl shadow-purple-500/30 border border-white/15"
                    />
                </motion.div>

                {/* Headline */}
                <motion.h1
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                    className="text-3xl sm:text-5xl md:text-6xl font-bold mb-4 leading-tight tracking-tight"
                >
                    The AI that doesn&apos;t just tell you{' '}
                    <span className="gradient-text block mt-1">what you want to hear.</span>
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="text-base sm:text-lg text-gray-300 mb-6 max-w-2xl mx-auto leading-relaxed"
                >
                    <span className="text-white font-medium">
                        Less validation. More self-understanding.
                    </span>{' '}
                    Create your personal AI twin, chat freely with honest perspectives, and reflect
                    on the goals you set for yourself.
                </motion.p>

                {/* Primary CTAs: Create Twin & Sign In */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.45 }}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6"
                >
                    <button
                        type="button"
                        onClick={() => router.push('/onboarding')}
                        className="group relative w-full sm:w-auto justify-center whitespace-nowrap px-8 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl font-semibold text-base sm:text-lg shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-3 text-white"
                    >
                        <Sparkles className="w-5 h-5 shrink-0" />
                        <span>Create Your Twin</span>
                        <ArrowRight className="w-5 h-5 shrink-0 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <button
                        type="button"
                        onClick={() => router.push('/login')}
                        className="glass-button w-full sm:w-auto justify-center text-sm sm:text-base flex items-center gap-2 opacity-95 hover:opacity-100 px-6 py-3.5 sm:py-4 rounded-2xl border border-white/15 hover:bg-white/10 transition-all text-gray-100"
                    >
                        <span>Already have an account? Sign In</span>
                    </button>
                </motion.div>

                {/* Mobile-Matched "Why 35 Questions?" Pre-Click Card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.55 }}
                    className="max-w-xl mx-auto mb-7 text-left rounded-2xl bg-white/[0.06] border border-purple-500/30 p-4 sm:p-5 backdrop-blur-md shadow-xl"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="text-sm sm:text-base font-bold text-purple-300">
                            Before you start: Why 35 questions?
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Takes ~3 mins</span>
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-200 leading-relaxed mb-3">
                        Clicking <strong className="text-white">Create Your Twin</strong> guides you
                        through 35 quick questions across 5 short screens. These build your initial
                        personality baseline so your Twin understands how you think and communicate
                        from your very first chat.
                    </p>
                    <div className="grid sm:grid-cols-3 gap-2 text-xs text-gray-300">
                        <div className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Reflect clearly on what&apos;s on your mind</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Explore 4 perspectives together</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span>Remember context as you keep talking</span>
                        </div>
                    </div>
                </motion.div>

                {/* Minimal human trust signals */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.65 }}
                    className="flex flex-wrap justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-300"
                >
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-green-400" />
                        <span>Private, encrypted memory</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-purple-400" />
                        <span>4 chat perspectives</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-pink-400" />
                        <span>Zero sycophancy or flattery</span>
                    </div>
                </motion.div>

                <p className="mt-5 text-gray-400 text-xs sm:text-sm">
                    Made for everyone looking for honest reflection, clarity, and everyday personal growth.
                </p>
            </motion.main>

            {/* Mandatory Legal & Compliance Footer */}
            <footer className="z-10 border-t border-white/10 bg-slate-950/60 backdrop-blur-md">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
                    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                        <Link href="/privacy" className="hover:text-white transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms" className="hover:text-white transition-colors">
                            Terms &amp; Conditions
                        </Link>
                        <Link href="/delete-account" className="hover:text-white transition-colors">
                            Account Deletion
                        </Link>
                        <Link href="/delete-data" className="hover:text-white transition-colors">
                            Data Deletion
                        </Link>
                        <a
                            href={playStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-purple-300 hover:text-white transition-colors"
                        >
                            <Smartphone className="w-3.5 h-3.5" />
                            <span>Google Play App</span>
                        </a>
                        <a
                            href="mailto:support@twingenie.app"
                            className="hover:text-white transition-colors"
                        >
                            support@twingenie.app
                        </a>
                    </div>
                    <p className="text-gray-500">
                        © {new Date().getFullYear()} TwinGenie. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
