'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
    ArrowRight,
    ArrowUpRight,
    Check,
    ChevronDown,
    Compass,
    Cpu,
    Database,
    Eye,
    Flame,
    HeartHandshake,
    Layers,
    Lock,
    MessageSquare,
    Mic,
    ShieldAlert,
    ShieldCheck,
    Smartphone,
    Sparkles,
    TrendingUp,
    X,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'
import { CORE_FAQS } from '@/lib/seo'

type TwinPerspectiveId = 'normal' | 'future' | 'honest' | 'therapist'

interface ScenarioOption {
    id: string
    label: string
    contextTag: string
    prompt: string
    memoryCallback: string
    responses: Record<
        TwinPerspectiveId,
        {
            text: string
            biasTargeted: string
            directive: string
        }
    >
}

interface PricingTierResponse {
    country: string
    currency: string
    symbol: string
    monthly: { amount: number; display: string; usd: number }
    yearly: { amount: number; display: string; usd: number; savings: string }
}

const PERSPECTIVES: Array<{
    id: TwinPerspectiveId
    name: string
    shortName: string
    subtitle: string
    badge: string
    accentColor: string
    borderActive: string
    pillClass: string
    dotClass: string
    icon: typeof Compass
}> = [
    {
        id: 'normal',
        name: 'Normal Twin',
        shortName: 'Normal',
        subtitle: 'Calibrated Self Mirror',
        badge: 'Core Reflection',
        accentColor: 'text-sky-300',
        borderActive: 'border-sky-400/50 bg-sky-500/[0.08] text-white',
        pillClass: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
        dotClass: 'bg-sky-400',
        icon: Compass,
    },
    {
        id: 'future',
        name: 'Future Twin',
        shortName: 'Future (5Y)',
        subtitle: 'Long-Horizon Perspective',
        badge: 'Compounding View',
        accentColor: 'text-[#E7C891]',
        borderActive: 'border-[#D9A760]/60 bg-[#D9A760]/[0.10] text-white',
        pillClass: 'border-[#D9A760]/30 bg-[#D9A760]/10 text-[#E7C891]',
        dotClass: 'bg-[#D9A760]',
        icon: TrendingUp,
    },
    {
        id: 'honest',
        name: 'Honest Twin',
        shortName: 'Honest',
        subtitle: 'Zero-Sycophancy Reality Check',
        badge: 'Anti-Bias Mode',
        accentColor: 'text-rose-300',
        borderActive: 'border-rose-400/50 bg-rose-500/[0.10] text-white',
        pillClass: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
        dotClass: 'bg-rose-400',
        icon: ShieldAlert,
    },
    {
        id: 'therapist',
        name: 'Reflective Coach',
        shortName: 'Reflective',
        subtitle: 'Socratic Emotional Inquiry',
        badge: 'Grounded Clarity',
        accentColor: 'text-emerald-300',
        borderActive: 'border-emerald-400/50 bg-emerald-500/[0.10] text-white',
        pillClass: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
        dotClass: 'bg-emerald-400',
        icon: HeartHandshake,
    },
]

const DEMO_SCENARIOS: ScenarioOption[] = [
    {
        id: 'boundaries',
        label: 'Boundaries & People-Pleasing',
        contextTag: 'RELATIONAL CONFLICT',
        prompt:
            "Someone close keeps asking for favors that wipe out my entire weekend, and I feel guilty every time I think about saying no.",
        memoryCallback: 'Vector match: 3 prior entries noting resentment after overcommitting on weekends.',
        responses: {
            normal: {
                text: "You care about staying reliable, which is why declining feels heavy. Notice the cost pattern: agreeing when depleted doesn't preserve the friendship—it quietly taxes it.",
                biasTargeted: 'Fairness distortion',
                directive: 'Hold calm warmth without over-explaining your refusal.',
            },
            future: {
                text: 'Five years out, no durable relationship was ever built on your exhaustion. Set the boundary cleanly this weekend so resentment never settles in underneath.',
                biasTargeted: 'Short-term approval bias',
                directive: 'Prioritize compounding trust over momentary comfort.',
            },
            honest: {
                text: "Be direct with yourself: you aren't saying yes out of generosity—you're buying temporary relief from conflict. Trading an entire weekend to avoid two minutes of awkwardness is a losing trade.",
                biasTargeted: 'Conflict-avoidance rationalization',
                directive: 'Challenge the excuse directly; propose a single clear refusal line.',
            },
            therapist: {
                text: 'When you imagine sending a firm no, where does the guilt tighten first? What belief taught you that protecting your own rest makes you selfish?',
                biasTargeted: 'Conditioned guilt reflex',
                directive: 'Separate care for others from responsibility for their disappointment.',
            },
        },
    },
    {
        id: 'fear',
        label: 'Fear of Public Judgment',
        contextTag: 'EXECUTION PARALYSIS',
        prompt:
            "I've kept a creative project in drafts for three months because every time I prepare to publish it, I find one more detail to polish.",
        memoryCallback: 'Trait signal: High Openness paired with perfectionist avoidance under evaluation.',
        responses: {
            normal: {
                text: 'Your standards are genuine, but polishing past a threshold stops improving the craft and starts insulating your ego from outside feedback.',
                biasTargeted: 'Standards vs. protection ambiguity',
                directive: 'Anchor quality bars to shippable milestones.',
            },
            future: {
                text: 'Two years from now you will barely recall who saw version one—only whether you built the discipline to put real work into the world on schedule.',
                biasTargeted: 'Spotlight effect distortion',
                directive: 'Compress evaluation horizon from day-one perfection to iteration speed.',
            },
            honest: {
                text: "That isn't craft discipline anymore—it's fear wearing a perfectionist disguise. Waiting until you feel ready guarantees you stay invisible. Ship the draft before tonight.",
                biasTargeted: 'Procrastination masked as preparation',
                directive: 'Strip intellectual excuses and name the concrete next ship step.',
            },
            therapist: {
                text: 'What would imperfect public feedback seem to say about your worth? Can we treat version one as neutral data rather than a verdict on who you are?',
                biasTargeted: 'Identity-outcome fusion',
                directive: 'Decouple experiment feedback from personal self-worth.',
            },
        },
    },
    {
        id: 'doomscrolling',
        label: 'Late-Night Avoidance Loop',
        contextTag: 'SLEEP & HABITS',
        prompt:
            'Every night I plan to sleep on time, yet I scroll for two hours in the dark and wake up angry at myself.',
        memoryCallback: 'Weekly pattern: Late-night screen spikes correlate with unaddressed daytime stress.',
        responses: {
            normal: {
                text: 'Late scrolling is rarely about the feed itself—it feels like the first quiet hour nobody owns but you. Replace it intentionally rather than relying on midnight willpower.',
                biasTargeted: 'Willpower attribution fallacy',
                directive: 'Design pre-sleep friction outside the bedroom.',
            },
            future: {
                text: 'Compounded sleep debt silently taxes every conversation and decision you make the next afternoon. Protect tomorrow morning more than midnight numbness.',
                biasTargeted: 'Hyperbolic discounting',
                directive: 'Contrast tonight’s low-value dopamine against next-day clarity.',
            },
            honest: {
                text: "You're numbing out because sitting quietly with unfiltered thoughts feels uncomfortable after a busy day. Put the charger in another room right now—no negotiating with midnight impulses.",
                biasTargeted: 'Emotional distraction loop',
                directive: 'Interrupt bargaining before sleep window closes.',
            },
            therapist: {
                text: 'When the room gets quiet at 11 PM, what unresolved feeling tends to surface? Let’s give that pressure a 3-minute check-in so screens don’t have to carry it.',
                biasTargeted: 'Unprocessed emotional residue',
                directive: 'Name the underlying stressor gently before wind-down.',
            },
        },
    },
]

const COACHING_PROGRAMS = [
    {
        badge: '7-DAY GUIDED TRACK',
        title: '7-Day Anxiety Reset',
        summary:
            'Structured daily protocols to map somatic triggers, dismantle catastrophizing loops, and leave with a personalized grounding playbook.',
        days: [
            'Day 01: Trigger taxonomy & physiological nervous-system baseline',
            'Day 03: Cognitive probability testing on worst-case assumptions',
            'Day 07: Custom rapid-reset response protocol',
        ],
        accent: 'border-emerald-500/25 text-emerald-300',
    },
    {
        badge: '5-DAY SPRINT',
        title: '5-Day Confidence & Assertion',
        summary:
            'Targeted drills for high-stakes conversations, disarming impostor narratives, and practicing firm boundaries without over-apologizing.',
        days: [
            'Day 01: Evidence inventory vs. internal distortion audit',
            'Day 03: Spoken assertiveness rehearsals via voice check-ins',
            'Day 05: Calm boundary scripts for real-world pressure',
        ],
        accent: 'border-[#D9A760]/30 text-[#E7C891]',
    },
    {
        badge: '30-DAY PRACTICE',
        title: 'Daily Clarity & Habit Lock',
        summary:
            'Short morning and evening reflections designed to spot recurring energy leaks, track mood shifts, and reinforce compounding habits.',
        days: [
            'Day 01: Baseline intention & friction audit',
            'Day 14: Mid-cycle vector insight pattern review',
            'Day 30: Longitudinal behavioral trend summary',
        ],
        accent: 'border-sky-500/25 text-sky-300',
    },
]

const HERO_TRAITS = [
    { label: 'Analytical Skepticism', value: 84 },
    { label: 'Conflict Avoidance', value: 62 },
    { label: 'Long-Horizon Focus', value: 78 },
    { label: 'Emotional Reactivity', value: 49 },
]

export default function Home() {
    const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0)
    const [activeMode, setActiveMode] = useState<TwinPerspectiveId>('honest')
    const [previewProgramIdx, setPreviewProgramIdx] = useState<number | null>(null)
    const [openFaq, setOpenFaq] = useState<number | null>(0)
    const [pricing, setPricing] = useState<PricingTierResponse | null>(null)

    const playStoreUrl =
        process.env.NEXT_PUBLIC_PLAY_STORE_URL ||
        'https://play.google.com/store/apps/details?id=com.asmind.app'

    useEffect(() => {
        let mounted = true
        fetch('/api/pricing')
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
                if (mounted && data?.pricing) setPricing(data.pricing)
            })
            .catch(() => {})
        return () => {
            mounted = false
        }
    }, [])

    const activeScenario = DEMO_SCENARIOS[selectedScenarioIdx]
    const activePerspective = PERSPECTIVES.find((p) => p.id === activeMode) || PERSPECTIVES[2]
    const activeResponse = activeScenario.responses[activeMode]

    const proMonthlyDisplay = pricing?.monthly?.display || '$5.99'
    const proYearlyDisplay = pricing?.yearly?.display || '$47.88'
    const proSavings = pricing?.yearly?.savings || '33%'

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC]">
            <SiteHeader />

            <main className="relative">
                {/* Architectural background field */}
                <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                    <div className="absolute inset-0 bg-grid-architectural opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_80%)]" />
                    <div className="absolute -top-40 left-1/2 h-[420px] w-[780px] -translate-x-1/2 rounded-full bg-[#D9A760]/[0.06] blur-[140px]" />
                </div>

                {/* HERO */}
                <section className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 md:pt-20 lg:px-8 lg:pb-28">
                    <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
                        {/* Hero Copy */}
                        <motion.div
                            initial={{ opacity: 0, y: 14 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.45 }}
                            className="lg:col-span-6"
                        >
                            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-white/[0.10] bg-white/[0.03] px-3.5 py-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-neutral-300">
                                    35-Trait Psychometric Digital Twin
                                </span>
                            </div>

                            <h1 className="text-4xl font-semibold tracking-[-0.03em] text-[#F4F2EC] sm:text-5xl lg:text-[3.65rem] lg:leading-[1.06]">
                                AI shouldn&apos;t flatter your blindspots.{' '}
                                <span className="font-serif text-[1.08em] font-normal italic text-[#E7C891]">
                                    It should help you see clearly.
                                </span>
                            </h1>

                            <p className="mt-6 max-w-xl text-base leading-relaxed text-neutral-400 sm:text-lg">
                                Generic chatbots agree with whatever framing you feed them.{' '}
                                <strong className="font-semibold text-[#F4F2EC]">TwinGenie</strong> calibrates
                                your digital twin through a structured 35-question psychometric assessment, retains
                                semantic vector memory across weeks, and challenges your thinking from four distinct
                                cognitive angles.
                            </p>

                            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                                <Link
                                    href="/onboarding"
                                    className="btn-primary-ivory px-6 py-3.5 text-sm sm:text-[15px]"
                                >
                                    <span>Create Your 35-Trait Twin</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>

                                <a
                                    href={playStoreUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-secondary-obsidian px-5 py-3.5 text-sm sm:text-[15px]"
                                >
                                    <Smartphone className="h-4 w-4 text-emerald-400" />
                                    <span>Android on Google Play</span>
                                    <ArrowUpRight className="h-3.5 w-3.5 text-neutral-500" />
                                </a>
                            </div>

                            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/[0.08] pt-6 text-xs text-neutral-400">
                                <span className="inline-flex items-center gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                                    RLS-Isolated PostgreSQL Memory
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5 text-[#D9A760]" />
                                    Zero Public Model Training
                                </span>
                                <Link
                                    href="/test"
                                    className="inline-flex items-center gap-1 text-[#E7C891] transition-colors hover:underline"
                                >
                                    <span>Quick 3-Step Self Diagnostic</span>
                                    <ArrowRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </motion.div>

                        {/* Interactive Product Telemetry Showcase */}
                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.55, delay: 0.08 }}
                            className="lg:col-span-6"
                        >
                            <div className="enterprise-panel overflow-hidden">
                                {/* Top Window Chrome */}
                                <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0B0D12] px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                                        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                                        <span className="ml-2 font-mono text-[11px] text-neutral-400">
                                            twin_console // calibration_v4
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        CALIBRATED
                                    </span>
                                </div>

                                <div className="grid divide-y divide-white/[0.08] sm:grid-cols-5 sm:divide-x sm:divide-y-0">
                                    {/* Psychometric Blueprint Column */}
                                    <div className="bg-[#0B0D12]/60 p-5 sm:col-span-2">
                                        <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                            35-Trait Fingerprint
                                        </div>
                                        <div className="mt-1 text-sm font-semibold text-[#F4F2EC]">
                                            Decision Style Matrix
                                        </div>

                                        <div className="mt-5 space-y-3.5">
                                            {HERO_TRAITS.map((trait) => (
                                                <div key={trait.label}>
                                                    <div className="mb-1 flex justify-between text-[11px]">
                                                        <span className="text-neutral-300">{trait.label}</span>
                                                        <span className="font-mono text-neutral-400">
                                                            {trait.value}%
                                                        </span>
                                                    </div>
                                                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                                        <div
                                                            className="h-full rounded-full bg-gradient-to-r from-[#C48B3F] to-[#E7C891]"
                                                            style={{ width: `${trait.value}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
                                            <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#E7C891]">
                                                <Database className="h-3 w-3" />
                                                VECTOR MEMORY INDEX
                                            </div>
                                            <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">
                                                1536-dim semantic embeddings link past commitments to today&apos;s
                                                decisions.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Live Switchable Perspective Preview */}
                                    <div className="flex flex-col justify-between p-5 sm:col-span-3">
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                                    Active Perspective
                                                </span>
                                                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-neutral-400">
                                                    <Mic className="h-3 w-3 text-[#D9A760]" /> Voice &amp; Text Ready
                                                </span>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-1.5">
                                                {PERSPECTIVES.map((p) => {
                                                    const Icon = p.icon
                                                    const active = activeMode === p.id
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => setActiveMode(p.id)}
                                                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-[11px] font-medium transition-all ${
                                                                active
                                                                    ? p.borderActive
                                                                    : 'border-white/[0.06] bg-white/[0.02] text-neutral-400 hover:bg-white/[0.05] hover:text-neutral-200'
                                                            }`}
                                                        >
                                                            <Icon className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate">{p.shortName}</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>

                                            <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
                                                <div className="text-[11px] text-neutral-500">Prompt</div>
                                                <p className="mt-1 text-xs leading-relaxed text-neutral-300">
                                                    &ldquo;{activeScenario.prompt}&rdquo;
                                                </p>
                                            </div>

                                            <AnimatePresence mode="wait">
                                                <motion.div
                                                    key={activeMode + activeScenario.id}
                                                    initial={{ opacity: 0, y: 6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -6 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="mt-3 rounded-xl border border-white/[0.09] bg-[#12161F] p-4"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${activePerspective.accentColor}`}
                                                        >
                                                            <span
                                                                className={`h-1.5 w-1.5 rounded-full ${activePerspective.dotClass}`}
                                                            />
                                                            {activePerspective.name}
                                                        </span>
                                                        <span className="font-mono text-[10px] text-neutral-500">
                                                            {activeResponse.biasTargeted}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2.5 text-xs leading-relaxed text-[#F4F2EC]">
                                                        {activeResponse.text}
                                                    </p>
                                                </motion.div>
                                            </AnimatePresence>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between border-t border-white/[0.07] pt-3 text-[11px]">
                                            <span className="text-neutral-500">Full 35-trait scoring required</span>
                                            <Link
                                                href="/onboarding"
                                                className="inline-flex items-center gap-1 font-medium text-[#E7C891] hover:underline"
                                            >
                                                <span>Calibrate yours</span>
                                                <ArrowRight className="h-3 w-3" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* Metrics Strip */}
                    <div className="mt-14 grid grid-cols-2 divide-y divide-white/[0.08] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0D12] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
                        {[
                            { k: 'PSYCHOMETRICS', v: '35-Item Assessment', d: '5-stage Big Five calibration' },
                            { k: 'PERSPECTIVES', v: '4 Distinct Angles', d: 'Normal, Future, Honest, Care' },
                            { k: 'CONTINUITY', v: '1536-Dim Vectors', d: 'PostgreSQL pgvector retrieval' },
                            { k: 'GOVERNANCE', v: 'Zero Model Training', d: 'TLS 1.3 + Row-Level Security' },
                        ].map((item) => (
                            <div key={item.k} className="p-5 sm:p-6">
                                <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                                    {item.k}
                                </div>
                                <div className="mt-1.5 text-base font-semibold text-[#F4F2EC]">{item.v}</div>
                                <div className="mt-0.5 text-xs text-neutral-400">{item.d}</div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4-PERSPECTIVE DECISION LAB */}
                <section
                    id="perspectives"
                    className="relative z-10 scroll-mt-20 border-t border-white/[0.08] py-20 lg:py-24"
                >
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                            <div>
                                <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                                    <Eye className="h-3.5 w-3.5" />
                                    Cognitive Perspective Architecture
                                </div>
                                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-4xl">
                                    One dilemma. Four uncompromising angles.
                                </h2>
                            </div>
                            <p className="max-w-md text-sm leading-relaxed text-neutral-400">
                                Compare how TwinGenie&apos;s perspective router reframes identical human conflicts
                                instead of producing one generic agreeable paragraph.
                            </p>
                        </div>

                        <div className="enterprise-panel mt-10 overflow-hidden">
                            {/* Scenario Selector */}
                            <div className="border-b border-white/[0.08] bg-[#0B0D12] p-5 sm:p-6">
                                <div className="mb-3 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                                    01 / Select Dilemma Scenario
                                </div>
                                <div className="grid gap-2.5 sm:grid-cols-3">
                                    {DEMO_SCENARIOS.map((scenario, idx) => (
                                        <button
                                            key={scenario.id}
                                            type="button"
                                            onClick={() => setSelectedScenarioIdx(idx)}
                                            className={`rounded-xl border p-3.5 text-left transition-all ${
                                                selectedScenarioIdx === idx
                                                    ? 'border-[#D9A760]/60 bg-[#D9A760]/[0.09] text-white'
                                                    : 'border-white/[0.07] bg-white/[0.02] text-neutral-400 hover:border-white/15 hover:text-neutral-200'
                                            }`}
                                        >
                                            <div className="font-mono text-[10px] text-neutral-500">
                                                {scenario.contextTag}
                                            </div>
                                            <div className="mt-1 text-sm font-medium">{scenario.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Perspective Tabs + Detailed Output */}
                            <div className="grid lg:grid-cols-12">
                                <div className="border-b border-white/[0.08] p-5 sm:p-6 lg:col-span-5 lg:border-b-0 lg:border-r">
                                    <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                                        02 / User Reflection Input
                                    </div>
                                    <blockquote className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm leading-relaxed text-neutral-200">
                                        &ldquo;{activeScenario.prompt}&rdquo;
                                    </blockquote>

                                    <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#090B10] px-3.5 py-2.5 font-mono text-[11px] text-neutral-400">
                                        {activeScenario.memoryCallback}
                                    </div>

                                    <div className="mt-6 font-mono text-[11px] uppercase tracking-wider text-neutral-500">
                                        03 / Pivot Perspective
                                    </div>
                                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                                        {PERSPECTIVES.map((p) => {
                                            const Icon = p.icon
                                            const isSelected = activeMode === p.id
                                            return (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    onClick={() => setActiveMode(p.id)}
                                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                                                        isSelected
                                                            ? p.borderActive
                                                            : 'border-white/[0.07] bg-white/[0.02] text-neutral-400 hover:border-white/15 hover:text-white'
                                                    }`}
                                                >
                                                    <Icon className="h-4 w-4 shrink-0" />
                                                    <span>{p.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between bg-[#0B0D12]/60 p-6 sm:p-8 lg:col-span-7">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={activeMode + activeScenario.id}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span
                                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-medium ${activePerspective.pillClass}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${activePerspective.dotClass}`}
                                                    />
                                                    {activePerspective.name} — {activePerspective.subtitle}
                                                </span>
                                                <span className="font-mono text-[11px] text-neutral-500">
                                                    {activePerspective.badge}
                                                </span>
                                            </div>

                                            <p className="mt-6 text-lg leading-relaxed text-[#F4F2EC] sm:text-xl">
                                                {activeResponse.text}
                                            </p>

                                            <div className="mt-8 grid gap-3 border-t border-white/[0.08] pt-5 sm:grid-cols-2">
                                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                                                    <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                                        Cognitive Bias Countered
                                                    </div>
                                                    <div className="mt-1 text-xs font-medium text-neutral-200">
                                                        {activeResponse.biasTargeted}
                                                    </div>
                                                </div>
                                                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                                                    <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                                        System Style Directive
                                                    </div>
                                                    <div className="mt-1 text-xs font-medium text-neutral-200">
                                                        {activeResponse.directive}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>

                                    <div className="mt-8 flex flex-col justify-between gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:items-center">
                                        <span className="text-xs text-neutral-400">
                                            Live Twin responses adapt strictly to your 35 psychometric answers.
                                        </span>
                                        <Link
                                            href="/onboarding"
                                            className="btn-primary-ivory px-4 py-2.5 text-xs"
                                        >
                                            <span>Calibrate Your 35 Traits</span>
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 35-TRAIT PSYCHOMETRIC ENGINE PIPELINE */}
                <section
                    id="engine"
                    className="relative z-10 scroll-mt-20 border-t border-white/[0.08] py-20 lg:py-24"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                                <Cpu className="h-3.5 w-3.5" />
                                Psychometric &amp; Memory Core
                            </div>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-4xl">
                                Calibrated before your first message. Smarter every week.
                            </h2>
                            <p className="mt-4 text-sm leading-relaxed text-neutral-400 sm:text-base">
                                Most AI companions start from a blank prompt. TwinGenie initializes an explicit
                                personality model from your 35 responses, then updates context over time through
                                semantic vector recall and mood telemetry.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-3">
                            {[
                                {
                                    step: 'STAGE 01',
                                    title: '35-Question Behavioral Assessment',
                                    desc: 'Five structured screens capture Openness, Conscientiousness, Extraversion, Stress Reactivity, Decision Speed, and Relational Trust—scoring numeric trait weights directly into your style layer.',
                                    icon: Layers,
                                    tag: 'Required Onboarding Core',
                                },
                                {
                                    step: 'STAGE 02',
                                    title: '1536-Dim Episodic Vector Memory',
                                    desc: 'Conversations and reflections are embedded and stored in isolated PostgreSQL pgvector namespaces so your Twin recalls past promises, contradictions, and breakthroughs across months.',
                                    icon: Database,
                                    tag: 'Persistent Context',
                                },
                                {
                                    step: 'STAGE 03',
                                    title: 'Voice, Mood & Growth Telemetry',
                                    desc: 'Full voice reflection support, daily emotional check-ins, Year-in-Pixels heatmaps, and anonymous Growth Circles keep behavioral momentum measurable.',
                                    icon: Flame,
                                    tag: 'Longitudinal Feedback',
                                },
                            ].map((item) => {
                                const Icon = item.icon
                                return (
                                    <div key={item.step} className="enterprise-panel-hover p-7">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-[11px] font-semibold text-[#D9A760]">
                                                {item.step}
                                            </span>
                                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-neutral-300">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                        </div>
                                        <h3 className="mt-5 text-lg font-semibold text-[#F4F2EC]">{item.title}</h3>
                                        <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">{item.desc}</p>
                                        <div className="mt-5 inline-flex rounded-md border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                                            {item.tag}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {/* GUIDED COACHING TRACKS */}
                <section
                    id="programs"
                    className="relative z-10 scroll-mt-20 border-t border-white/[0.08] py-20 lg:py-24"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                            <div>
                                <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Structured Life Coach Tracks
                                </div>
                                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-4xl">
                                    Multi-day guided clarity sprints.
                                </h2>
                            </div>
                            <p className="max-w-md text-sm text-neutral-400">
                                Beyond free-form chat, follow sequenced coaching curricula with interactive exercises
                                and reflection milestones.
                            </p>
                        </div>

                        <div className="mt-10 grid gap-6 md:grid-cols-3">
                            {COACHING_PROGRAMS.map((prog, idx) => (
                                <div
                                    key={prog.title}
                                    className="enterprise-panel-hover flex flex-col justify-between p-7"
                                >
                                    <div>
                                        <span
                                            className={`inline-flex rounded-md border bg-white/[0.02] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ${prog.accent}`}
                                        >
                                            {prog.badge}
                                        </span>
                                        <h3 className="mt-4 text-xl font-semibold text-[#F4F2EC]">{prog.title}</h3>
                                        <p className="mt-2.5 text-sm leading-relaxed text-neutral-400">
                                            {prog.summary}
                                        </p>

                                        <ul className="mt-6 space-y-2.5 border-t border-white/[0.07] pt-5 text-xs text-neutral-300">
                                            {prog.days.map((d) => (
                                                <li key={d} className="flex items-start gap-2">
                                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9A760]" />
                                                    <span>{d}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="mt-7 flex gap-2.5">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewProgramIdx(idx)}
                                            className="btn-secondary-obsidian flex-1 py-2.5 text-xs"
                                        >
                                            Preview Curriculum
                                        </button>
                                        <Link
                                            href="/onboarding"
                                            className="btn-primary-ivory px-4 py-2.5 text-xs"
                                        >
                                            Start
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* ARCHITECTURE, SECURITY & GOVERNANCE */}
                <section
                    id="architecture"
                    className="relative z-10 scroll-mt-20 border-t border-white/[0.08] py-20 lg:py-24"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-emerald-400">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                Security, Infrastructure &amp; Data Sovereignty
                            </div>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-4xl">
                                Built for private personal introspection at scale.
                            </h2>
                            <p className="mt-4 text-sm leading-relaxed text-neutral-400 sm:text-base">
                                Designed from day one around isolated tenant storage, commercial zero-training AI
                                agreements, and verifiable user control over every stored memory.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-3">
                            <div className="enterprise-panel p-7">
                                <div className="font-mono text-[11px] uppercase tracking-wider text-sky-300">
                                    Production Runtime
                                </div>
                                <h3 className="mt-2 text-lg font-semibold text-[#F4F2EC]">
                                    Full-Stack Synchronized Platform
                                </h3>
                                <ul className="mt-5 space-y-3 text-xs leading-relaxed text-neutral-300">
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                                        <span>
                                            <strong className="text-white">API Microservices:</strong> Node.js/Express
                                            architecture with JWT auth, quota fencing, and SSE response streaming.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                                        <span>
                                            <strong className="text-white">Cross-Platform Sync:</strong> Next.js Web
                                            Workspace synchronized seamlessly with Android on Google Play (
                                            <code className="font-mono text-neutral-200">com.asmind.app</code>).
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" />
                                        <span>
                                            <strong className="text-white">Resilient AI Routing:</strong> Multi-model
                                            orchestration backed by Vertex AI &amp; Gemini reasoning pipelines.
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            <div className="enterprise-panel p-7">
                                <div className="font-mono text-[11px] uppercase tracking-wider text-emerald-300">
                                    Data Isolation
                                </div>
                                <h3 className="mt-2 text-lg font-semibold text-[#F4F2EC]">
                                    Zero Public Model Training
                                </h3>
                                <ul className="mt-5 space-y-3 text-xs leading-relaxed text-neutral-300">
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                        <span>
                                            <strong className="text-white">Transport &amp; Storage:</strong> HTTPS /
                                            TLS 1.3 in transit paired with Supabase PostgreSQL volume encryption.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                        <span>
                                            <strong className="text-white">Row-Level Security (RLS):</strong> Strict
                                            per-user database policies scope chats, trait vectors, and audio logs.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                        <span>
                                            <strong className="text-white">No Data Brokerage:</strong> Personal
                                            reflection entries are never sold or used to train public base models.
                                        </span>
                                    </li>
                                </ul>
                            </div>

                            <div className="enterprise-panel p-7">
                                <div className="font-mono text-[11px] uppercase tracking-wider text-[#E7C891]">
                                    User Governance
                                </div>
                                <h3 className="mt-2 text-lg font-semibold text-[#F4F2EC]">
                                    Self-Serve Compliance &amp; Safety
                                </h3>
                                <ul className="mt-5 space-y-3 text-xs leading-relaxed text-neutral-300">
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9A760]" />
                                        <span>
                                            <strong className="text-white">Granular Erasure:</strong> Delete individual
                                            data scopes (chat, memories, voice, profile) anytime on{' '}
                                            <Link href="/delete-data" className="text-[#E7C891] hover:underline">
                                                Data Deletion
                                            </Link>
                                            .
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9A760]" />
                                        <span>
                                            <strong className="text-white">Immediate Account Removal:</strong>{' '}
                                            Self-serve deletion verified on{' '}
                                            <Link href="/delete-account" className="text-[#E7C891] hover:underline">
                                                Account Deletion
                                            </Link>
                                            .
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2.5">
                                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9A760]" />
                                        <span>
                                            <strong className="text-white">Non-Clinical Guardrails:</strong> Explicit
                                            crisis-safety routing and clear non-medical boundaries.
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PRICING */}
                <section
                    id="pricing"
                    className="relative z-10 scroll-mt-20 border-t border-white/[0.08] py-20 lg:py-24"
                >
                    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                                Commercial Model
                            </div>
                            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#F4F2EC] sm:text-4xl">
                                Start free. Upgrade seamlessly on Android.
                            </h2>
                            <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-400 sm:text-base">
                                Launch includes full free access to all 4 Twin perspectives on Web and Android, with
                                unlimited memory &amp; voice synchronized via Google Play Billing.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 lg:grid-cols-3">
                            {/* Free */}
                            <div className="enterprise-panel flex flex-col justify-between p-8">
                                <div>
                                    <div className="font-mono text-xs uppercase tracking-wider text-neutral-400">
                                        Free Starter
                                    </div>
                                    <div className="mt-4 flex items-baseline gap-1.5">
                                        <span className="text-4xl font-semibold text-[#F4F2EC]">
                                            {pricing?.symbol || '$'}0
                                        </span>
                                        <span className="text-sm text-neutral-500">/ forever</span>
                                    </div>
                                    <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                                        Full 35-trait calibration and daily reflection across Web &amp; Mobile.
                                    </p>
                                    <ul className="mt-7 space-y-3 text-sm text-neutral-300">
                                        {[
                                            'Complete 35-Question Assessment',
                                            'All 4 Cognitive Perspectives',
                                            '10 daily text reflections + 3 voice',
                                            'Daily mood check-ins & streaks',
                                        ].map((f) => (
                                            <li key={f} className="flex items-center gap-2.5 text-xs">
                                                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <Link
                                    href="/onboarding"
                                    className="btn-secondary-obsidian mt-8 w-full py-3 text-xs font-semibold"
                                >
                                    Start 35-Trait Assessment
                                </Link>
                            </div>

                            {/* Pro Monthly */}
                            <div className="enterprise-panel relative flex flex-col justify-between border-[#D9A760]/45 bg-[#10131C] p-8 shadow-[0_0_60px_-24px_rgba(217,167,96,0.3)]">
                                <span className="absolute -top-3 left-6 rounded-full border border-[#D9A760]/40 bg-[#1B1710] px-3 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#E7C891]">
                                    Most Popular
                                </span>
                                <div>
                                    <div className="font-mono text-xs uppercase tracking-wider text-[#E7C891]">
                                        Pro Companion
                                    </div>
                                    <div className="mt-4 flex items-baseline gap-1.5">
                                        <span className="text-4xl font-semibold text-[#F4F2EC]">
                                            {proMonthlyDisplay}
                                        </span>
                                        <span className="text-sm text-neutral-400">/ month</span>
                                    </div>
                                    <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                                        Unlimited text, voice, vector continuity, and guided programs synced across
                                        devices.
                                    </p>
                                    <ul className="mt-7 space-y-3 text-sm text-neutral-200">
                                        {[
                                            'Unlimited AI & voice reflections',
                                            'Unlimited semantic vector memory',
                                            'All Guided Life Coach tracks',
                                            'Growth Circles & cognitive insights',
                                        ].map((f) => (
                                            <li key={f} className="flex items-center gap-2.5 text-xs">
                                                <Check className="h-4 w-4 shrink-0 text-[#D9A760]" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <a
                                    href={playStoreUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary-ivory mt-8 w-full py-3 text-xs font-semibold"
                                >
                                    <Smartphone className="h-4 w-4" />
                                    <span>Subscribe via Google Play</span>
                                </a>
                            </div>

                            {/* Annual */}
                            <div className="enterprise-panel flex flex-col justify-between p-8">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs uppercase tracking-wider text-neutral-400">
                                            Annual Pass
                                        </span>
                                        <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
                                            Save {proSavings}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex items-baseline gap-1.5">
                                        <span className="text-4xl font-semibold text-[#F4F2EC]">
                                            {proYearlyDisplay}
                                        </span>
                                        <span className="text-sm text-neutral-500">/ year</span>
                                    </div>
                                    <p className="mt-3 text-xs leading-relaxed text-neutral-400">
                                        Full-year longitudinal memory, cognitive analytics, and VIP support.
                                    </p>
                                    <ul className="mt-7 space-y-3 text-sm text-neutral-300">
                                        {[
                                            'Everything in Pro Companion',
                                            'Year-in-Pixels behavioral telemetry',
                                            'Priority inference routing',
                                            'Billed securely via Google Play',
                                        ].map((f) => (
                                            <li key={f} className="flex items-center gap-2.5 text-xs">
                                                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                                                <span>{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <Link
                                    href="/subscription"
                                    className="btn-secondary-obsidian mt-8 w-full py-3 text-xs font-semibold"
                                >
                                    Compare Regional Plans
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FOUNDER NOTE & FAQ */}
                <section className="relative z-10 border-t border-white/[0.08] py-20 lg:py-24">
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                        {/* Founder Thesis */}
                        <div className="enterprise-panel p-8 sm:p-10">
                            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-[#D9A760]/40 bg-[#141822] font-serif text-2xl italic text-[#E7C891]">
                                    AK
                                </div>
                                <div>
                                    <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                                        Founder&apos;s Thesis
                                    </div>
                                    <p className="mt-2 font-serif text-xl leading-relaxed text-[#F4F2EC] sm:text-2xl">
                                        &ldquo;Most AI assistants are trained to please you in the moment. Growth
                                        requires intellectual friction—an AI calibrated enough to remember your
                                        commitments and honest enough to challenge your blindspots.&rdquo;
                                    </p>
                                    <div className="mt-4 text-xs text-neutral-400">
                                        <strong className="text-white">Ashwani Kumar</strong> — Founder, TwinGenie •{' '}
                                        <a
                                            href="mailto:ashwani@twingenie.app"
                                            className="text-[#E7C891] hover:underline"
                                        >
                                            ashwani@twingenie.app
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FAQ */}
                        <div id="faq" className="mt-16 scroll-mt-24">
                            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                                <h2 className="text-2xl font-semibold tracking-tight text-[#F4F2EC] sm:text-3xl">
                                    Frequently Asked Questions
                                </h2>
                                <div className="flex flex-wrap gap-3 text-xs">
                                    <Link
                                        href="/methodology"
                                        className="font-medium text-[#E7C891] hover:underline"
                                    >
                                        35-Trait Methodology &rarr;
                                    </Link>
                                    <Link
                                        href="/compare"
                                        className="font-medium text-neutral-300 hover:text-white hover:underline"
                                    >
                                        Compare vs ChatGPT &rarr;
                                    </Link>
                                    <Link
                                        href="/faq"
                                        className="font-medium text-neutral-300 hover:text-white hover:underline"
                                    >
                                        All Questions &rarr;
                                    </Link>
                                </div>
                            </div>
                            <div className="mt-6 space-y-3">
                                {CORE_FAQS.map((item, idx) => {
                                    const isOpen = openFaq === idx
                                    return (
                                        <div key={item.question} className="enterprise-panel overflow-hidden">
                                            <button
                                                type="button"
                                                aria-expanded={isOpen}
                                                onClick={() => setOpenFaq(isOpen ? null : idx)}
                                                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium text-[#F4F2EC] transition-colors hover:bg-white/[0.02]"
                                            >
                                                <span>{item.question}</span>
                                                <ChevronDown
                                                    className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform ${
                                                        isOpen ? 'rotate-180' : ''
                                                    }`}
                                                />
                                            </button>
                                            <div
                                                className={`${
                                                    isOpen ? 'block' : 'hidden'
                                                } border-t border-white/[0.06] px-5 py-4 text-xs leading-relaxed text-neutral-400 sm:text-sm`}
                                            >
                                                {item.answer}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />

            {/* Coaching Curriculum Modal Preview */}
            {previewProgramIdx !== null && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={COACHING_PROGRAMS[previewProgramIdx].title}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
                >
                    <div className="enterprise-panel w-full max-w-lg p-6 sm:p-7">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                                    {COACHING_PROGRAMS[previewProgramIdx].badge}
                                </div>
                                <h3 className="mt-1 text-xl font-semibold text-[#F4F2EC]">
                                    {COACHING_PROGRAMS[previewProgramIdx].title}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewProgramIdx(null)}
                                aria-label="Close preview"
                                className="rounded-lg border border-white/10 p-1.5 text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <p className="mt-3 text-sm leading-relaxed text-neutral-300">
                            {COACHING_PROGRAMS[previewProgramIdx].summary}
                        </p>

                        <div className="mt-5 space-y-2.5">
                            {COACHING_PROGRAMS[previewProgramIdx].days.map((step) => (
                                <div
                                    key={step}
                                    className="flex items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-xs text-neutral-200"
                                >
                                    <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#D9A760]" />
                                    <span>{step}</span>
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                            <Link
                                href="/onboarding"
                                className="btn-primary-ivory flex-1 py-2.5 text-xs"
                            >
                                Calibrate Your Twin &amp; Begin
                            </Link>
                            <button
                                type="button"
                                onClick={() => setPreviewProgramIdx(null)}
                                className="btn-secondary-obsidian py-2.5 text-xs"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
