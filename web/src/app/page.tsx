'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    Brain,
    ArrowRight,
    Shield,
    Sparkles,
    MessageCircle,
    Check,
    Smartphone,
    Zap,
    Users,
    Lock,
    Star,
    Flame,
    ShieldCheck,
    Layers,
    Cpu,
    BarChart3,
    RefreshCw,
    ExternalLink,
    Send,
    ChevronDown,
    Eye,
    Compass,
    Heart
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ScenarioOption {
    label: string
    prompt: string
    responses: {
        normal: string
        future: string
        honest: string
        therapist: string
    }
}

const DEMO_SCENARIOS: ScenarioOption[] = [
    {
        label: 'Setting Healthy Boundaries',
        prompt: "A close friend asked me for another big favor that will drain my entire weekend, but I feel guilty saying no because I don't want to disappoint them.",
        responses: {
            normal: "It's natural to care deeply about friends, but true relationships aren't built on self-sacrifice. Saying yes when your battery is at zero only breeds quiet resentment over time.",
            future: "Looking back five years from now, you will realize that people respect clear, calm boundaries far more than constant people-pleasing. Protect your peace and recharge with kind honesty.",
            honest: "Let's be direct: You're not saying yes out of generosity—you're saying yes out of fear of conflict. Sacrificing your own mental health to avoid a moment of mild awkwardness cheats both of you.",
            therapist: "Notice where that guilt is located in your body right now. Where did you first learn the belief that someone else's comfort is your personal responsibility? What would kind self-preservation look like here?"
        }
    },
    {
        label: 'Overcoming Self-Doubt & Fear',
        prompt: "I've been holding back from pursuing a creative goal I deeply care about because I'm terrified that people will judge me or that I'll fail publicly.",
        responses: {
            normal: "Starting something vulnerable is always intimidating. But the quiet ache of wondering 'what if' lasts much longer than the temporary sting of making mistakes while learning.",
            future: "Decades from now, you won't remember the awkward early attempts—you'll only remember whether you gave yourself permission to try. Give yourself that grace today.",
            honest: "You're waiting for complete confidence before taking a step, but confidence only comes after action. Stop hiding behind perfectionism—it's just fear in an intellectual mask. Put your work out there.",
            therapist: "What does failure mean about your identity in your inner narrative? Let's separate the outcome of an experiment from your unconditional self-worth as a person."
        }
    },
    {
        label: 'Breaking Evening Doomscrolling',
        prompt: "Every night I intend to sleep early and take care of my health, but I end up scrolling social media for two hours and waking up exhausted and self-critical.",
        responses: {
            normal: "Late-night scrolling is often 'revenge bedtime procrastination'—your mind searching for autonomy after a demanding day. Be gentle with yourself, but put the phone in another room tonight.",
            future: "Your daily vitality and mental clarity compound into the life you build. Trading tomorrow's focus and joy for cheap dopamine tonight is a cost you don't need to keep paying.",
            honest: "You are escaping into an endless feed because sitting in quiet stillness with your own unedited thoughts feels uncomfortable. Put the phone down 30 minutes before sleep. No excuses.",
            therapist: "What uncomfortable emotion or restlessness surfaces when the lights go out and the room goes quiet? Let's explore what true emotional rest and nourishment feel like for you tonight."
        }
    }
]

export default function Home() {
    const router = useRouter()
    const [selectedScenarioIndex, setSelectedScenarioIndex] = useState(0)
    const [activeTwinMode, setActiveTwinMode] = useState<'normal' | 'future' | 'honest' | 'therapist'>('honest')
    const [customPrompt, setCustomPrompt] = useState('')
    const [simulatedCustomResponse, setSimulatedCustomResponse] = useState<string | null>(null)
    const [isSimulating, setIsSimulating] = useState(false)
    const [openFaq, setOpenFaq] = useState<number | null>(null)

    const currentScenario = DEMO_SCENARIOS[selectedScenarioIndex]

    const handleSimulateCustom = () => {
        if (!customPrompt.trim()) return
        setIsSimulating(true)
        setSimulatedCustomResponse(null)
        setTimeout(() => {
            let res = ""
            if (activeTwinMode === 'honest') {
                res = `[Demonstration Preview — Honest Mode]: Looking closely at "${customPrompt}": You might be overthinking this to avoid the emotional vulnerability of taking action. What is the one truthful step you already know you need to take?`
            } else if (activeTwinMode === 'future') {
                res = `[Demonstration Preview — Future Mode]: Looking at "${customPrompt}" five years from now: The temporary awkwardness or discomfort of today won't matter at all. What matters is choosing the path that helps you become the person you respect.`
            } else if (activeTwinMode === 'therapist') {
                res = `[Demonstration Preview — Reflective Mode]: Holding space for "${customPrompt}": What deeper feeling or fear is asking for your attention right beneath this thought? Acknowledge it gently before trying to fix it.`
            } else {
                res = `[Demonstration Preview — Normal Mode]: Exploring "${customPrompt}" with you: This speaks to your core desire for balance and meaning. Let's break it down into one small, peaceful step for today.`
            }
            setSimulatedCustomResponse(res)
            setIsSimulating(false)
        }, 600)
    }

    const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL || 'https://play.google.com/store/apps/details?id=com.asmind.app'

    return (
        <div className="min-h-screen bg-[#0F0F1E] text-white selection:bg-purple-600 selection:text-white">
            {/* Ambient Background Glows matching Mobile App Palette */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute top-1/3 right-10 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[140px] animate-pulse" style={{ animationDuration: '8s' }} />
                <div className="absolute bottom-10 left-10 w-96 h-96 bg-purple-900/15 rounded-full blur-[128px]" />
            </div>

            {/* Clean Consumer Navigation Bar */}
            <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0F0F1E]/80 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <img
                            src="/logo.png"
                            alt="TwinGenie"
                            className="w-10 h-10 rounded-xl object-cover shadow-lg shadow-purple-500/25 group-hover:scale-105 transition-transform"
                        />
                        <div>
                            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-gray-100 to-purple-200 bg-clip-text text-transparent">
                                TwinGenie
                            </span>
                            <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                                AI Companion
                            </span>
                        </div>
                    </Link>

                    {/* Human-Friendly Navigation Links */}
                    <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-300">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#coaching" className="hover:text-white transition-colors">Life Coach</a>
                        <a href="#modes" className="hover:text-white transition-colors">4 Twin Modes</a>
                        <a href="#demo" className="hover:text-white transition-colors">Interactive Demo</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
                    </nav>

                    {/* Clean Consumer CTAs */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="px-3.5 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                        >
                            Sign In
                        </Link>

                        <Link
                            href="/onboarding"
                            className="inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-105"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>Create Your Twin</span>
                        </Link>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="relative z-10">
                {/* Hero Section */}
                <section className="pt-20 pb-16 md:pt-28 md:pb-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs sm:text-sm font-medium mb-8"
                    >
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>AI Digital Twin & Personal Reflection Companion</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.1 }}
                        className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-8"
                    >
                        The AI that doesn't just agree with you.{' '}
                        <span className="block mt-2 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                            It helps you think clearly.
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                        className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-10"
                    >
                        Standard AI chatbots flatter your biases. <strong className="text-white">TwinGenie</strong> builds your psychometric digital twin from a 35-trait assessment, giving you 4 cognitive perspectives, long-term vector memory, and brutally honest reflection to conquer mental blindspots.
                    </motion.p>

                    {/* Hero CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-14"
                    >
                        <Link
                            href="/onboarding"
                            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 font-semibold text-base shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 text-white"
                        >
                            <Sparkles className="w-5 h-5" />
                            <span>Create Your Twin (Free)</span>
                            <ArrowRight className="w-5 h-5" />
                        </Link>

                        <a
                            href={playStoreUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 font-semibold text-base transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 text-white"
                        >
                            <Smartphone className="w-5 h-5 text-emerald-400" />
                            <span>Get on Google Play</span>
                            <ExternalLink className="w-4 h-4 text-gray-400" />
                        </a>

                        <a
                            href="#demo"
                            className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-purple-500/30 font-semibold text-base transition-all duration-300 text-purple-200"
                        >
                            Try Interactive Demo ↓
                        </a>
                    </motion.div>

                    {/* Verification & Trust Badges */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.7, delay: 0.4 }}
                        className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-6 border-t border-white/10 text-left"
                    >
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <div>
                                <div className="text-xs font-semibold text-white">Private & Encrypted</div>
                                <div className="text-[11px] text-gray-400">Strict Data Confidentiality</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <Compass className="w-5 h-5 text-purple-400 flex-shrink-0" />
                            <div>
                                <div className="text-xs font-semibold text-white">4 Cognitive Angles</div>
                                <div className="text-[11px] text-gray-400">Authentic, Future, Honest, Care</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                            <div>
                                <div className="text-xs font-semibold text-white">AI Life Coach</div>
                                <div className="text-[11px] text-gray-400">Multi-Day Guided Tracks</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                            <Star className="w-5 h-5 text-amber-400 flex-shrink-0" />
                            <div>
                                <div className="text-xs font-semibold text-white">Google Play Verified</div>
                                <div className="text-[11px] text-gray-400">Android & Web Synchronized</div>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* Section: Live Interactive Demo Simulator */}
                <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto scroll-mt-24">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
                            <Eye className="w-3.5 h-3.5" />
                            Interactive Product Demonstration • Sample Scenarios
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                            Experience the 4 Perspectives in Action
                        </h2>
                        <p className="text-gray-400 mt-2 max-w-2xl mx-auto text-sm sm:text-base">
                            This preview demonstrates how TwinGenie adapts cognitive framing across 4 perspectives using illustrative dilemma scenarios. For live AI reflection calibrated to your unique 35-trait personality profile with persistent vector memory, create your twin or get the Android app.
                        </p>
                    </div>

                    {/* Simulator Card */}
                    <div className="rounded-3xl border border-white/15 bg-slate-900/90 shadow-2xl backdrop-blur-2xl overflow-hidden">
                        {/* Scenario Selector Header */}
                        <div className="p-4 sm:p-6 border-b border-white/10 bg-slate-950/60">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                1. Select an Everyday Life Dilemma to Explore:
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {DEMO_SCENARIOS.map((sc, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setSelectedScenarioIndex(idx)
                                            setSimulatedCustomResponse(null)
                                        }}
                                        className={`px-4 py-3 rounded-xl text-left text-xs sm:text-sm font-medium transition-all border ${
                                            selectedScenarioIndex === idx
                                                ? 'bg-purple-600/30 border-purple-500 text-white shadow-md'
                                                : 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        {sc.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* User Input Bubble Display */}
                        <div className="p-4 sm:p-6 border-b border-white/10 bg-slate-900/40">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                User Input:
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm sm:text-base text-gray-200 italic">
                                "{currentScenario.prompt}"
                            </div>
                        </div>

                        {/* Mode Selector Tabs */}
                        <div className="p-4 sm:p-6 border-b border-white/10 bg-slate-950/40">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                                2. Switch Perspective to Consult:
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <button
                                    onClick={() => setActiveTwinMode('normal')}
                                    className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center justify-center gap-2 ${
                                        activeTwinMode === 'normal'
                                            ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span>🪞 Normal Twin</span>
                                </button>

                                <button
                                    onClick={() => setActiveTwinMode('future')}
                                    className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center justify-center gap-2 ${
                                        activeTwinMode === 'future'
                                            ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-500/20'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span>🔮 Future (5Y) Twin</span>
                                </button>

                                <button
                                    onClick={() => setActiveTwinMode('honest')}
                                    className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center justify-center gap-2 ${
                                        activeTwinMode === 'honest'
                                            ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/20'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span>⚡ Honest / Dark Twin</span>
                                </button>

                                <button
                                    onClick={() => setActiveTwinMode('therapist')}
                                    className={`py-3 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center justify-center gap-2 ${
                                        activeTwinMode === 'therapist'
                                            ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                                    }`}
                                >
                                    <span>🌿 Reflective Coach</span>
                                </button>
                            </div>
                        </div>

                        {/* Perspective Response Display */}
                        <div className="p-6 sm:p-8 min-h-[180px] bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col justify-center">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeTwinMode + selectedScenarioIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-3"
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${
                                            activeTwinMode === 'honest' ? 'bg-rose-400 animate-ping' :
                                            activeTwinMode === 'future' ? 'bg-purple-400 animate-ping' :
                                            activeTwinMode === 'therapist' ? 'bg-emerald-400 animate-ping' :
                                            'bg-blue-400 animate-ping'
                                        }`} />
                                        <span className="text-xs uppercase tracking-widest font-bold text-gray-400">
                                            {activeTwinMode === 'honest' ? 'Unfiltered Reality Check' :
                                             activeTwinMode === 'future' ? '5-Year Strategic Horizon' :
                                             activeTwinMode === 'therapist' ? 'Socratic Emotional Inquiry' :
                                             'Core Self Mirror'}
                                        </span>
                                    </div>

                                    <p className="text-base sm:text-lg text-gray-100 leading-relaxed font-normal">
                                        {currentScenario.responses[activeTwinMode]}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Custom Prompt Interactive Box */}
                        <div className="p-4 sm:p-6 bg-slate-950 border-t border-white/10">
                            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                Or Test Your Own Thought:
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt(e.target.value)}
                                    placeholder="e.g., How do I stop procrastinating and start living with intention?"
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSimulateCustom()}
                                />
                                <button
                                    onClick={handleSimulateCustom}
                                    disabled={!customPrompt.trim() || isSimulating}
                                    className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium text-sm flex items-center gap-2 transition-all"
                                >
                                    <Send className="w-4 h-4" />
                                    <span className="hidden sm:inline">Reflect</span>
                                </button>
                            </div>

                            {simulatedCustomResponse && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mt-4 p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 text-sm text-purple-200"
                                >
                                    {simulatedCustomResponse}
                                </motion.div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Section: The 4 Cognitive Perspectives Deep Dive */}
                <section id="modes" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24 border-t border-white/10">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">
                            Cognitive Diversity
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                            One Mind. Four Uncompromising Angles.
                        </h2>
                        <p className="text-gray-400 mt-4 max-w-2xl mx-auto text-base sm:text-lg">
                            Different decisions require different lenses. TwinGenie lets you pivot seamlessly between four specialized AI companion personas.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Mode 1 */}
                        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-blue-500/40 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                                🪞
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white flex items-center justify-between">
                                <span>Normal Twin</span>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">The Authentic Self</span>
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                Mirrors your calibrated psychological traits, values, and decision instincts. Acts as your everyday sounding board for brainstorming, goal alignment, and cognitive coherence.
                            </p>
                            <ul className="space-y-2 text-xs text-gray-300">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                    <span>Tuned to your Big Five assessment results</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                    <span>Maintains continuity across long-term personal projects</span>
                                </li>
                            </ul>
                        </div>

                        {/* Mode 2 */}
                        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                                🔮
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white flex items-center justify-between">
                                <span>Future Twin</span>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/20">5-Years Wiser</span>
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                Speaks from your aspirational future state. Evaluates your choices against compound returns, preventing you from sacrificing long-term compounding for short-term gratification.
                            </p>
                            <ul className="space-y-2 text-xs text-gray-300">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                    <span>Long-horizon strategic framing for high-stakes bets</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                    <span>Filters daily urgent noise from true legacy goals</span>
                                </li>
                            </ul>
                        </div>

                        {/* Mode 3 */}
                        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-rose-500/40 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                                ⚡
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white flex items-center justify-between">
                                <span>Honest / Dark Twin</span>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/20">Zero Sycophancy</span>
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                The antidote to yes-man AI. Directly calls out avoidance, rationalizations, and mental shortcuts. Pinpoints the uncomfortable truths you hide from yourself.
                            </p>
                            <ul className="space-y-2 text-xs text-gray-300">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                    <span>Catches recursive overthinking and excuse loops</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-rose-400 flex-shrink-0" />
                                    <span>Forces decisive action when you are procrastinating</span>
                                </li>
                            </ul>
                        </div>

                        {/* Mode 4 */}
                        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform">
                                🌿
                            </div>
                            <h3 className="text-2xl font-bold mb-3 text-white flex items-center justify-between">
                                <span>Reflective Twin</span>
                                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">Therapeutic Inquiry</span>
                            </h3>
                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                Guides Socratic inquiry into burnout, emotional triggers, and impostor syndrome. Helps you decouple self-worth from external outcomes with grounded self-compassion.
                            </p>
                            <ul className="space-y-2 text-xs text-gray-300">
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    <span>Burnout triage and emotional decompression</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                    <span>Root-cause analysis of stress and relational conflict</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Section: Flagship AI Life Coach Programs */}
                <section id="coaching" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24 border-t border-white/10">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-semibold uppercase tracking-wider mb-3">
                            <Sparkles className="w-3.5 h-3.5" />
                            Flagship Coaching Programs
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                            Personalized AI Life Coach Journeys
                        </h2>
                        <p className="text-gray-400 mt-4 max-w-2xl mx-auto text-base sm:text-lg">
                            Move beyond open-ended chats. Embark on structured, multi-day guided programs designed to break anxiety loops, overcome self-doubt, and cultivate lasting peace of mind.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Program 1 */}
                        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-pink-500/40 transition-all duration-300 flex flex-col justify-between group">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 group-hover:scale-110 transition-transform">
                                        <Heart className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs px-3 py-1 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/20 font-medium">
                                        7 Days • Guided
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-white">7-Day Anxiety Reset</h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                    A gentle, compassionate journey to recognize anxiety triggers, practice somatic body scans, challenge worst-case scenarios, and build a lasting personal coping toolkit.
                                </p>
                                <ul className="space-y-2.5 text-xs text-gray-300 mb-6">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-pink-400 flex-shrink-0" />
                                        <span>5-4-3-2-1 Sensory Grounding Techniques</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-pink-400 flex-shrink-0" />
                                        <span>Gentle Exposure & Self-Compassion Drills</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-pink-400 flex-shrink-0" />
                                        <span>Personalized Emergency Coping Blueprint</span>
                                    </li>
                                </ul>
                            </div>
                            <Link
                                href="/life-coach"
                                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/30 text-white font-medium text-xs text-center transition-all flex items-center justify-center gap-2"
                            >
                                <span>Explore Anxiety Reset</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {/* Program 2 */}
                        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-yellow-500/40 transition-all duration-300 flex flex-col justify-between group">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                                        <Zap className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs px-3 py-1 rounded-full bg-yellow-500/15 text-yellow-300 border border-yellow-500/20 font-medium">
                                        5 Days • High Impact
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-white">5-Day Confidence Boost</h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                    Quick, actionable psychological exercises to dismantle imposter syndrome, master assertive communication, reframe past mistakes, and visualize your most capable self.
                                </p>
                                <ul className="space-y-2.5 text-xs text-gray-300 mb-6">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                        <span>Core Strengths & Value Inventory</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                        <span>Assertiveness Practice & Voice Anchoring</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                        <span>Failure Reframing & Future Projection</span>
                                    </li>
                                </ul>
                            </div>
                            <Link
                                href="/life-coach"
                                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-yellow-500/20 border border-white/10 hover:border-yellow-500/30 text-white font-medium text-xs text-center transition-all flex items-center justify-center gap-2"
                            >
                                <span>Explore Confidence Boost</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {/* Program 3 */}
                        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group">
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                        <Brain className="w-6 h-6 text-emerald-400" />
                                    </div>
                                    <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-medium">
                                        30 Days • Transformation
                                    </span>
                                </div>
                                <h3 className="text-2xl font-bold mb-3 text-white">Daily Gratitude Habit</h3>
                                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                    Rewire your mental default from scarcity to abundance. Micro-prompts designed to deepen appreciation for everyday moments, strengthen key relationships, and find silver linings.
                                </p>
                                <ul className="space-y-2.5 text-xs text-gray-300 mb-6">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Daily Positivity Priming & Habit Stacking</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Relationship Appreciation Micro-Actions</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Challenge Transmutation & Resilience Practice</span>
                                    </li>
                                </ul>
                            </div>
                            <Link
                                href="/life-coach"
                                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/30 text-white font-medium text-xs text-center transition-all flex items-center justify-center gap-2"
                            >
                                <span>Explore Gratitude Journey</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Section: Core Product Features */}
                <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24 border-t border-white/10">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-300 text-xs font-semibold uppercase tracking-wider mb-3">
                            Product Capabilities
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                            Designed for Deep Self-Discovery
                        </h2>
                        <p className="text-gray-400 mt-4 max-w-2xl mx-auto text-base sm:text-lg">
                            More than a chatbot. A personalized AI companion designed to understand who you truly are and help you grow every single day.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-purple-500/30 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6">
                                <Brain className="w-6 h-6 text-purple-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">35-Trait Personality Blueprint</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Analyzes your emotional patterns, communication style, decision values, and core strengths to calibrate your Twin before your first reflection.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-yellow-500/30 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 flex items-center justify-center mb-6">
                                <Zap className="w-6 h-6 text-yellow-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">AI Life Coach Journeys</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Structured, multi-day guided programs designed to break anxiety loops, overcome self-doubt, build assertiveness, and foster daily gratitude.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-pink-500/30 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center mb-6">
                                <Layers className="w-6 h-6 text-pink-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Deep Adaptive Memory</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Never forgets who you are. Seamlessly connects insights, breakthroughs, and reflections across weeks and months into an evolving story of your growth.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6">
                                <Flame className="w-6 h-6 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Daily Mood & Habit Streaks</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Form a grounding daily habit. Track emotional shifts over time, celebrate consistent streaks, and connect stress triggers to actionable lifestyle adjustments.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-amber-500/30 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-6">
                                <BarChart3 className="w-6 h-6 text-amber-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Cognitive Growth Insights</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Weekly automated summaries uncovering recurring thought loops, celebrating personal wins, and illuminating blindspots with gentle clarity.
                            </p>
                        </div>

                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 hover:border-blue-500/30 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6">
                                <Users className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-white">Private Growth Circles</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Connect with thoughtful, self-reflective peers. Share milestone reflections anonymously in a safe, supportive space free from social media pressure.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section: Technical & Google Cloud Architecture */}
                <section id="architecture" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto scroll-mt-24 border-t border-white/10">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-3">
                            <Cpu className="w-3.5 h-3.5" />
                            Technical Architecture & Cloud Roadmap
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                            Built for Scalable Cognitive AI
                        </h2>
                        <p className="text-gray-400 mt-4 max-w-3xl mx-auto text-base sm:text-lg">
                            Transparent breakdown of our current production stack, active Google Cloud migration, and long-term infrastructure roadmap.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Currently Running */}
                        <div className="p-8 rounded-3xl bg-slate-900/80 border border-blue-500/30 flex flex-col justify-between">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-500/20">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                                    Currently Running (Production)
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Core Application Stack</h3>
                                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                                    Live services powering daily user reflections, psychometric profile generation, and mobile app sync:
                                </p>
                                <ul className="space-y-3 text-xs text-gray-300">
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>Backend API:</strong> Node.js / Express REST microservices with CORS isolation and JWT authentication.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>Database & Auth:</strong> Supabase-managed PostgreSQL with Row-Level Security (RLS).</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>Vector Memory:</strong> pgvector extension storing 1536-dim semantic embeddings for conversation continuity.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>AI Model Routing:</strong> Google Gemini 1.5 & OpenAI multi-provider inference routing.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>Mobile Distribution:</strong> Production Android app on Google Play with In-App Billing.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Currently Integrating */}
                        <div className="p-8 rounded-3xl bg-slate-900/80 border border-purple-500/30 flex flex-col justify-between">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4 border border-purple-500/20">
                                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                    Active Cloud Migration
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Google Cloud Infrastructure</h3>
                                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                                    Target deployment workloads utilizing Google Cloud startup program credits:
                                </p>
                                <ul className="space-y-3 text-xs text-gray-300">
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>Cloud Run Deployment:</strong> Containerizing the Express microservices for serverless horizontal autoscaling.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>Vertex AI Gemini Pipelines:</strong> Consolidating AI inference directly onto Google Vertex AI Gemini 1.5 Pro and Flash endpoints.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>Firebase Cloud Messaging:</strong> Reliable push notifications for daily mood check-ins and reflection streaks.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Architecture Roadmap */}
                        <div className="p-8 rounded-3xl bg-slate-900/80 border border-emerald-500/30 flex flex-col justify-between">
                            <div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-500/20">
                                    Roadmap (Next Milestones)
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3">Enterprise Scalability</h3>
                                <p className="text-xs text-gray-400 leading-relaxed mb-6">
                                    Planned high-throughput architecture as our active user base scales:
                                </p>
                                <ul className="space-y-3 text-xs text-gray-300">
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>Cloud SQL Multi-Region:</strong> Automated replication and failover for high availability.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>BigQuery Analytics:</strong> Aggregated, anonymized cognitive telemetry to identify population-level decision trends.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                        <span><strong>Fine-Tuned Cognitive Adapters:</strong> Custom LoRA model fine-tuning on Vertex AI for personalized voice and style mimicry.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Pricing & Commercial Viability */}
                <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto scroll-mt-24 border-t border-white/10">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold uppercase tracking-wider mb-3">
                            Sustainable Economics
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-gray-400 mt-4 max-w-2xl mx-auto text-base sm:text-lg">
                            Start for free. Upgrade to Pro for unlimited memory and all 4 cognitive modes, seamlessly billed through Google Play.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                        {/* Free Tier */}
                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                            <div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Free Starter</div>
                                <div className="text-4xl font-extrabold text-white mb-4">$0 <span className="text-base text-gray-400 font-normal">/ month</span></div>
                                <p className="text-sm text-gray-400 mb-6">Perfect for testing your initial personality profile and basic reflection.</p>
                                <ul className="space-y-3 text-sm text-gray-300 mb-8">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>35-Trait Personality Assessment</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>50 AI reflection messages / month</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Normal & Reflective Modes</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Daily mood tracking</span>
                                    </li>
                                </ul>
                            </div>
                            <button
                                onClick={() => router.push('/onboarding')}
                                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all"
                            >
                                Get Started Free
                            </button>
                        </div>

                        {/* Pro Tier (Popular) */}
                        <div className="p-8 rounded-3xl bg-gradient-to-b from-purple-900/40 via-slate-900 to-slate-950 border-2 border-purple-500 shadow-2xl shadow-purple-500/20 flex flex-col justify-between relative">
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                                Most Popular
                            </div>
                            <div>
                                <div className="text-xs font-semibold text-purple-300 uppercase tracking-wider mb-2">Pro Companion</div>
                                <div className="text-4xl font-extrabold text-white mb-4">$5.99 <span className="text-base text-gray-400 font-normal">/ month</span></div>
                                <div className="text-xs text-purple-300 mb-4 font-medium">₹499 / month in India via Google Play</div>
                                <p className="text-sm text-gray-300 mb-6">Complete cognitive reflection suite for curious minds, lifelong learners, and anyone seeking daily clarity.</p>
                                <ul className="space-y-3 text-sm text-gray-200 mb-8">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <strong className="text-white">Unlimited AI reflection messages</strong>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <strong className="text-white">All 4 Cognitive Twin Modes</strong>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <span>Infinite Vector Semantic Memory</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <span>Growth Circles & Private Sharing</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-purple-400 flex-shrink-0" />
                                        <span>Google Play In-App Billing security</span>
                                    </li>
                                </ul>
                            </div>
                            <a
                                href={playStoreUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm transition-all text-center shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
                            >
                                <Smartphone className="w-4 h-4" />
                                <span>Subscribe on Android</span>
                            </a>
                        </div>

                        {/* Annual Tier */}
                        <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/10 flex flex-col justify-between">
                            <div>
                                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Annual Pass</div>
                                <div className="text-4xl font-extrabold text-white mb-4">$47.88 <span className="text-base text-gray-400 font-normal">/ year</span></div>
                                <div className="text-xs text-emerald-400 mb-4 font-semibold">Save 33% • Equivalent to $3.99/mo ($47.88/yr, or ₹3,999/yr in India via Google Play)</div>
                                <p className="text-sm text-gray-400 mb-6">For committed individuals tracking full-year personal growth and emotional well-being.</p>
                                <ul className="space-y-3 text-sm text-gray-300 mb-8">
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Everything in Pro Companion</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Priority model latency</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Exportable cognitive growth reports</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Priority VIP reflection support</span>
                                    </li>
                                </ul>
                            </div>
                            <a
                                href={playStoreUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-sm transition-all text-center flex items-center justify-center gap-2"
                            >
                                <span>Get Annual via Google Play</span>
                            </a>
                        </div>
                    </div>
                </section>

                {/* Section: Founder & Company Credibility */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-white/10">
                    <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 to-purple-950/30 border border-white/10">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl font-extrabold text-white shadow-xl shadow-purple-500/20 flex-shrink-0">
                                AK
                            </div>
                            <div className="space-y-3 text-center md:text-left">
                                <div className="text-xs font-bold text-purple-400 uppercase tracking-widest">
                                    Founder's Note
                                </div>
                                <h3 className="text-2xl sm:text-3xl font-bold text-white">
                                    Why I Built TwinGenie
                                </h3>
                                <p className="text-gray-300 text-sm sm:text-base leading-relaxed italic">
                                    "Most AI products are programmed to be people-pleasers. They confirm your cognitive biases, flatter your half-baked hypotheses, and give you comforting illusions. TwinGenie was born from a fundamental belief: real growth requires intellectual friction. We built an AI that cares enough about your potential to tell you the truth."
                                </p>
                                <div className="pt-2 text-sm text-gray-400">
                                    <strong className="text-white">Ashwani Kumar</strong> — Founder & CEO, TwinGenie • <a href="mailto:ashwani@twingenie.app" className="text-purple-400 hover:underline">ashwani@twingenie.app</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section: Frequently Asked Questions (FAQ) */}
                <section id="faq" className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto scroll-mt-24 border-t border-white/10">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-gray-400 mt-2 text-sm sm:text-base">
                            Everything you need to know about TwinGenie, privacy, and technology.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {[
                            {
                                q: "How is TwinGenie different from ChatGPT or generic chatbots?",
                                a: "Generic chatbots have no persistent memory of your psychological tendencies, and are trained with RLHF to be excessively agreeable (sycophancy). TwinGenie uses a 35-trait psychometric profile, permanent vector memory, and 4 specialized modes (including an Honest Mode that actively challenges your excuses) to provide deep cognitive reflection."
                            },
                            {
                                q: "Is my personal reflection and journal data private?",
                                a: "Yes. Your thoughts are stored with AES-256 bit encryption and strict Row-Level Security (RLS). We never sell your personal data or use your private reflection sessions to train third-party public models."
                            },
                            {
                                q: "Is the app available on mobile?",
                                a: "Yes! TwinGenie is live on the Google Play Store (ID: com.asmind.app). You can download it directly to your Android device, and all reflections sync automatically between web and mobile."
                            },
                            {
                                q: "How does the subscription work?",
                                a: "We offer a Free Starter Tier for basic daily reflection. Upgrading to Pro Companion is handled directly through Google Play Billing for maximum payment security and one-click cancellation management."
                            },
                            {
                                q: "What cloud technology powers TwinGenie?",
                                a: "TwinGenie is built on modern scalable cloud architecture utilizing Google Gemini LLMs for reasoning, PostgreSQL with pgvector for high-dimensional semantic search, and containerized Cloud Run microservices."
                            }
                        ].map((faq, i) => (
                            <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full p-5 text-left font-semibold text-white flex items-center justify-between gap-4 hover:bg-white/5 transition-colors"
                                >
                                    <span>{faq.q}</span>
                                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                                </button>
                                {openFaq === i && (
                                    <div className="px-5 pb-5 text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-3">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Final Call to Action */}
                <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center border-t border-white/10">
                    <div className="p-10 sm:p-16 rounded-3xl bg-gradient-to-r from-purple-900/60 via-slate-900 to-pink-900/60 border border-purple-500/30 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight mb-4">
                                Stop Collecting Opinions. Start Understanding Yourself.
                            </h2>
                            <p className="text-gray-300 text-base sm:text-lg mb-8">
                                Take the 5-minute personality reflection assessment and meet your AI Twin today.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => router.push('/onboarding')}
                                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-base shadow-xl shadow-purple-500/25 transition-all hover:scale-105 flex items-center justify-center gap-2"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    <span>Start Free Assessment</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                                <a
                                    href={playStoreUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold text-base transition-all flex items-center justify-center gap-2"
                                >
                                    <Smartphone className="w-5 h-5 text-emerald-400" />
                                    <span>Download on Google Play</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Comprehensive Footer */}
            <footer className="border-t border-white/10 bg-slate-950 py-14 px-4 sm:px-6 lg:px-8 relative z-10 text-sm">
                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
                    {/* Brand column */}
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center gap-3">
                            <img
                                src="/logo.png"
                                alt="TwinGenie Logo"
                                className="w-9 h-9 rounded-xl object-cover shadow-md shadow-purple-500/20"
                            />
                            <span className="font-bold text-xl tracking-tight text-white">TwinGenie</span>
                        </Link>
                        <p className="text-gray-400 text-xs leading-relaxed">
                            Personalized AI companion for daily reflection, emotional clarity, and lifelong personal growth.
                        </p>
                    </div>

                    {/* Product */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-white">Product</div>
                        <ul className="space-y-2 text-xs text-gray-400">
                            <li><a href="#coaching" className="hover:text-white transition-colors">Life Coach Programs</a></li>
                            <li><a href="#demo" className="hover:text-white transition-colors">Interactive Demo</a></li>
                            <li><a href="#modes" className="hover:text-white transition-colors">4 Cognitive Modes</a></li>
                            <li><a href="#features" className="hover:text-white transition-colors">Core Features</a></li>
                            <li><a href="#architecture" className="hover:text-white transition-colors">Cloud Architecture</a></li>
                            <li><a href="#pricing" className="hover:text-white transition-colors">Pricing Plans</a></li>
                        </ul>
                    </div>

                    {/* Applications */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-white">Platforms</div>
                        <ul className="space-y-2 text-xs text-gray-400">
                            <li>
                                <Link href="/onboarding" className="hover:text-purple-300 transition-colors">
                                    Create Your Twin
                                </Link>
                            </li>
                            <li>
                                <Link href="/login" className="hover:text-purple-300 transition-colors">
                                    Sign In
                                </Link>
                            </li>
                            <li>
                                <a href={playStoreUrl} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Android (Google Play)</span>
                                </a>
                            </li>
                            <li>
                                <Link href="/life-coach" className="hover:text-purple-300 transition-colors">
                                    Life Coach Programs
                                </Link>
                            </li>
                            <li>
                                <Link href="/subscription" className="hover:text-white transition-colors">
                                    Membership & Subscriptions
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal & Contact */}
                    <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-white">Legal & Support</div>
                        <ul className="space-y-2 text-xs text-gray-400">
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                            <li>
                                <a href="mailto:founder@twingenie.app" className="hover:text-purple-300 transition-colors">
                                    founder@twingenie.app
                                </a>
                            </li>
                            <li>
                                <a href="mailto:ashwani@twingenie.app" className="hover:text-purple-300 transition-colors">
                                    ashwani@twingenie.app
                                </a>
                            </li>
                            <li>
                                <a href="mailto:support@twingenie.app" className="hover:text-purple-300 transition-colors">
                                    support@twingenie.app
                                </a>
                            </li>
                            <li className="text-[11px] text-gray-500 pt-1">
                                Founder & CEO: Ashwani Kumar
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
                    <p>© {new Date().getFullYear()} TwinGenie. All rights reserved.</p>
                    <p className="text-xs text-gray-400">
                        Empowering personal reflection, emotional clarity, and intentional growth worldwide.
                    </p>
                </div>
            </footer>
        </div>
    )
}
