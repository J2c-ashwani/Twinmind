'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Share2, Check } from 'lucide-react'
import { captureAttributionFromLocation } from '@/lib/attribution'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'

interface Option {
    text: string
    archetype: string
}

interface Question {
    tag: string
    title: string
    subtitle: string
    options: Option[]
}

const QUESTIONS: Question[] = [
    {
        tag: 'Step 1 of 3 • Avoidance Trigger',
        title: 'When you have a high-friction task to finish, what is your go-to excuse?',
        subtitle: 'Pick your real instinct—not the idealized version of yourself.',
        options: [
            { text: 'I need more research and a complete plan before I can start.', archetype: 'intellectual' },
            { text: "I'm drained right now. I'll wake up early and execute tomorrow.", archetype: 'exhaustion' },
            { text: 'Let me tidy my desk, organize tabs, and clear small tasks first.', archetype: 'productive_proc' },
            { text: 'I perform better under extreme last-minute deadline pressure anyway.', archetype: 'adrenaline' },
        ],
    },
    {
        tag: 'Step 2 of 3 • Interpersonal Reflex',
        title: 'When someone you respect leaves you on read for 6 hours, what does your brain do?',
        subtitle: 'Observe your automatic reflex inside silence.',
        options: [
            { text: 'Replay the last conversation to figure out what sounded wrong.', archetype: 'overthinker' },
            { text: 'Feel an urgent pull to send a casual follow-up just to check.', archetype: 'control' },
            { text: 'Act unbothered while checking repeatedly if they are active.', archetype: 'avoidant' },
            { text: 'Assume they are dismissive and detach mentally first.', archetype: 'defensive' },
        ],
    },
    {
        tag: 'Step 3 of 3 • Unspoken Truth',
        title: 'What pattern would your closest friends hesitate to point out directly?',
        subtitle: 'The blind spot that quietly repeats every month.',
        options: [
            { text: 'Starting ambitious projects with intense energy and finishing none.', archetype: 'starter' },
            { text: 'Overanalyzing straightforward choices until timing passes.', archetype: 'paralysis' },
            { text: 'Saying yes to everyone to avoid conflict, then silently resenting it.', archetype: 'people_pleaser' },
            { text: 'Speaking vividly about long-term goals while repeating identical weeks.', archetype: 'loop' },
        ],
    },
]

interface ArchetypeProfile {
    badge: string
    title: string
    desc: string
    mode: string
    callout: string
}

const ARCHETYPES: Record<string, ArchetypeProfile> = {
    intellectual: {
        badge: 'ARCHETYPE // INTELLECTUAL AVOIDER',
        title: "Delay Masked as 'Preparation'",
        desc: "You justify inaction as thoroughness—convincing yourself you aren't avoiding the work, just researching before imperfect evaluation.",
        mode: 'HONEST TWIN',
        callout: "You aren't strategizing anymore—you're stalling on imperfect first action. Ship one step today.",
    },
    exhaustion: {
        badge: 'ARCHETYPE // TOMORROW DELEGATOR',
        title: "Emotional Friction Misread as 'Fatigue'",
        desc: 'You outsource today’s discomfort to an idealized tomorrow version of yourself while draining energy negotiating internally.',
        mode: 'HONEST TWIN',
        callout: 'Five minutes of awkward movement restores more clarity than two hours of scrolling.',
    },
    productive_proc: {
        badge: 'ARCHETYPE // LOW-STAKES BUSYWORK',
        title: 'False Momentum Through Peripheral Tasks',
        desc: 'Clearing low-friction errands creates the sensation of progress while the single needle-moving decision stays untouched.',
        mode: 'HONEST TWIN',
        callout: 'Stop rearranging peripherals to dodge the one high-leverage priority.',
    },
    people_pleaser: {
        badge: 'ARCHETYPE // CONFLICT AVOIDER',
        title: 'Compulsively Saying Yes Against Your Own Energy',
        desc: 'You trade weekend bandwidth for two minutes of social harmony, then carry silent resentment afterward.',
        mode: 'REFLECTIVE COACH',
        callout: 'Someone else’s momentary disappointment is not an emergency you have to absorb.',
    },
    overthinker: {
        badge: 'ARCHETYPE // RECURSIVE ANALYZER',
        title: 'Mental Loops Replacing Real-World Testing',
        desc: 'Under uncertainty, your mind simulates twenty hypothetical outcomes rather than collecting one piece of real evidence.',
        mode: 'FUTURE TWIN',
        callout: 'Clarity rarely comes from another hour inside your own head—it arrives after one clean step.',
    },
    default: {
        badge: 'ARCHETYPE // RATIONALIZATION LOOP',
        title: 'Circular Reasoning Without Anchor',
        desc: 'Your default reflex under friction is recursive analysis, which sycophantic chatbots reinforce instead of interrupting.',
        mode: 'HONEST TWIN',
        callout: "You don't need validation for another delay—you need a mirror holding your actual commitments.",
    },
}

const SECONDARY_WEIGHTS: Record<string, string> = {
    intellectual: 'intellectual',
    exhaustion: 'exhaustion',
    productive_proc: 'productive_proc',
    adrenaline: 'exhaustion',
    overthinker: 'overthinker',
    control: 'productive_proc',
    avoidant: 'exhaustion',
    defensive: 'people_pleaser',
    starter: 'productive_proc',
    paralysis: 'overthinker',
    people_pleaser: 'people_pleaser',
    loop: 'intellectual',
}

function scoreMirrorAnswers(selected: Option[]) {
    const tally: Record<string, number> = {}
    selected.forEach((opt, idx) => {
        const mapped = SECONDARY_WEIGHTS[opt.archetype] || 'default'
        const weight = idx === 2 ? 1.5 : idx === 1 ? 1.25 : 1.0
        tally[mapped] = (tally[mapped] || 0) + weight
    })
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1])
    const winningKey = ranked[0]?.[0] || 'default'

    const interpersonalMap: Record<string, string> = {
        overthinker: 'Internalizing silence & replaying micro-signals',
        control: 'Seeking rapid reassurance to close ambiguity',
        avoidant: 'Presenting calm detachment while ruminating privately',
        defensive: 'Preemptive emotional withdrawal',
    }
    const blindSpotMap: Record<string, string> = {
        starter: 'Novelty starts outpacing completion',
        paralysis: 'Requiring 100% certainty before moving',
        people_pleaser: 'Over-committing followed by quiet fatigue',
        loop: 'Mistaking articulation for execution',
    }

    return {
        key: ARCHETYPES[winningKey] ? winningKey : 'default',
        interpersonalPattern: interpersonalMap[selected[1]?.archetype] || 'Quiet internal stress-testing',
        blindSpotNote: blindSpotMap[selected[2]?.archetype] || 'Familiar hesitation loops',
    }
}

export default function MirrorTestPage() {
    const [currentStep, setCurrentStep] = useState(0)
    const [answers, setAnswers] = useState<Option[]>([])
    const [isScanning, setIsScanning] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)
    const [copied, setCopied] = useState(false)
    const [referralCode, setReferralCode] = useState('')

    useEffect(() => {
        const captured = captureAttributionFromLocation()
        if (captured.referralCode) setReferralCode(captured.referralCode)
    }, [])

    const handleSelect = (option: Option) => {
        const updated = [...answers, option]
        setAnswers(updated)

        if (currentStep < QUESTIONS.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            setIsScanning(true)
            setTimeout(() => {
                setIsScanning(false)
                setIsCompleted(true)
            }, 1400)
        }
    }

    const scored = scoreMirrorAnswers(answers)
    const profile = ARCHETYPES[scored.key] || ARCHETYPES.default

    const buildShareUrl = (source: string) => {
        const origin =
            typeof window !== 'undefined' ? window.location.origin : 'https://www.twingenie.app'
        const params = new URLSearchParams({
            utm_source: source,
            utm_medium: 'share',
            preview: scored.key,
        })
        if (referralCode) params.set('ref', referralCode)
        return `${origin}/test?${params.toString()}`
    }

    const copyShareLink = () => {
        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(buildShareUrl('mirror_test'))
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const sharePromptText = `My TwinGenie 30-second diagnostic tagged me as "${profile.title}" — ${profile.mode}: "${profile.callout}" Test yours:`
    const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(
        `${sharePromptText} ${buildShareUrl('whatsapp_share')}`
    )}`
    const xShareHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        sharePromptText
    )}&url=${encodeURIComponent(buildShareUrl('x_share'))}`

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
            <SiteHeader minimal />

            <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
                <div className="pointer-events-none absolute inset-0 bg-grid-architectural opacity-45 [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_75%)]" />

                <div className="relative z-10 w-full max-w-lg space-y-5">
                    {!isScanning && !isCompleted && (
                        <div>
                            <div className="mb-2 flex justify-between font-mono text-[11px] text-neutral-400">
                                <span>Quick 3-Step Self Diagnostic</span>
                                <span>
                                    Step {currentStep + 1} / {QUESTIONS.length}
                                </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                                <motion.div
                                    className="h-full bg-[#D9A760]"
                                    initial={{ width: '33%' }}
                                    animate={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {!isScanning && !isCompleted && (
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.22 }}
                                className="enterprise-panel p-6 sm:p-8"
                            >
                                <span className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                                    {QUESTIONS[currentStep].tag}
                                </span>
                                <h1 className="mt-2 text-2xl font-semibold leading-snug text-[#F4F2EC]">
                                    {QUESTIONS[currentStep].title}
                                </h1>
                                <p className="mt-1.5 text-sm text-neutral-400">{QUESTIONS[currentStep].subtitle}</p>

                                <div className="mt-6 flex flex-col gap-2.5">
                                    {QUESTIONS[currentStep].options.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelect(opt)}
                                            className="group flex items-center gap-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-left transition-all hover:border-[#D9A760]/60 hover:bg-[#D9A760]/[0.08]"
                                        >
                                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#0B0D12] font-mono text-xs font-semibold text-[#E7C891] group-hover:border-[#D9A760] group-hover:bg-[#D9A760] group-hover:text-[#07080B]">
                                                {['A', 'B', 'C', 'D'][idx]}
                                            </span>
                                            <span className="text-sm text-neutral-200 group-hover:text-white">
                                                {opt.text}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {isScanning && (
                            <motion.div
                                key="scanning"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="enterprise-panel p-10 text-center"
                            >
                                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#D9A760]/40 bg-[#D9A760]/10">
                                    <Sparkles className="h-6 w-6 animate-pulse text-[#E7C891]" />
                                </div>
                                <h2 className="text-xl font-semibold text-[#F4F2EC]">
                                    Mapping Behavioral Signal...
                                </h2>
                                <p className="mx-auto mt-2 max-w-xs text-xs text-neutral-400">
                                    Evaluating avoidance reflex, interpersonal pressure response, and default blindspot.
                                </p>
                            </motion.div>
                        )}

                        {isCompleted && (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="enterprise-panel space-y-5 p-6 sm:p-8"
                            >
                                <span className="inline-flex rounded-md border border-[#D9A760]/30 bg-[#D9A760]/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-[#E7C891]">
                                    {profile.badge}
                                </span>

                                <div>
                                    <h2 className="text-2xl font-semibold text-[#F4F2EC]">{profile.title}</h2>
                                    <p className="mt-2 text-sm leading-relaxed text-neutral-300">{profile.desc}</p>
                                </div>

                                <div className="space-y-1.5 rounded-xl border border-white/[0.08] bg-[#0B0D12] p-4 text-xs text-neutral-300">
                                    <div>
                                        <strong className="text-white">Interpersonal reflex:</strong>{' '}
                                        {scored.interpersonalPattern}
                                    </div>
                                    <div>
                                        <strong className="text-white">Recurring friction:</strong>{' '}
                                        {scored.blindSpotNote}
                                    </div>
                                </div>

                                <div className="space-y-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-xs">
                                    <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                        Perspective Contrast
                                    </div>
                                    <p className="text-neutral-400">
                                        <strong className="text-rose-300">Generic AI:</strong> &ldquo;Take all the time you
                                        need! Rest is productive too.&rdquo;
                                    </p>
                                    <p className="text-[#F4F2EC]">
                                        <strong className="text-[#E7C891]">{profile.mode}:</strong> &ldquo;
                                        {profile.callout}&rdquo;
                                    </p>
                                </div>

                                <div className="space-y-2.5 pt-2">
                                    <Link
                                        href={`/onboarding?utm_source=mirror_test&archetype=${scored.key}${
                                            referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ''
                                        }`}
                                        className="btn-primary-ivory w-full py-3.5 text-sm"
                                    >
                                        <span>Complete Full 35-Question Twin Calibration</span>
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                    <a
                                        href={`/download?ref=${encodeURIComponent(
                                            referralCode || 'mirror_test'
                                        )}&archetype=${scored.key}&utm_source=mirror_quiz`}
                                        className="btn-secondary-obsidian w-full py-2.5 text-xs"
                                    >
                                        Open Android App on Google Play
                                    </a>
                                    <div className="grid grid-cols-3 gap-2 pt-1">
                                        <a
                                            href={whatsappShareHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] py-2.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/[0.15]"
                                        >
                                            <span>WhatsApp</span>
                                        </a>
                                        <a
                                            href={xShareHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.10] bg-white/[0.03] py-2.5 text-xs font-medium text-neutral-200 transition-colors hover:border-white/25 hover:text-white"
                                        >
                                            <span>Share on X</span>
                                        </a>
                                        <button
                                            type="button"
                                            onClick={copyShareLink}
                                            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] py-2.5 text-xs text-neutral-300 transition-colors hover:border-white/20 hover:text-white"
                                        >
                                            {copied ? (
                                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                                            ) : (
                                                <Share2 className="h-3.5 w-3.5" />
                                            )}
                                            <span>{copied ? 'Copied' : 'Copy Link'}</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <SiteFooter />
        </div>
    )
}
