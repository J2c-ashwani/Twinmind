'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Share2, Check } from 'lucide-react'
import { captureAttributionFromLocation } from '@/lib/attribution'

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
    tag: 'Step 1 of 3: The Avoidance Trigger',
    title: 'When you have a critical high-friction task to finish, what is your go-to excuse?',
    subtitle: 'Pick your genuine instinct—not the idealized version of yourself.',
    options: [
      { text: 'I need to do more research and plan perfectly before I can start.', archetype: 'intellectual' },
      { text: "I'm exhausted right now. I'll wake up early and tackle it tomorrow.", archetype: 'exhaustion' },
      { text: 'Let me clean my workspace, organize my tabs, and fix small tasks first.', archetype: 'productive_proc' },
      { text: 'I work best under extreme last-minute deadline pressure anyway.', archetype: 'adrenaline' }
    ]
  },
  {
    tag: 'Step 2 of 3: The Interpersonal Reflex',
    title: 'When someone you respect leaves you on read for 6 hours, what does your brain do?',
    subtitle: 'Observe your real reflex in interpersonal silence.',
    options: [
      { text: 'I replay our last conversation to figure out what I said wrong.', archetype: 'overthinker' },
      { text: 'I feel an urgent itch to send a casual follow-up or check-in text.', archetype: 'control' },
      { text: "I pretend I don't care, but repeatedly check if they've been active.", archetype: 'avoidant' },
      { text: "I assume they're dismissive and mentally detach to protect my ego.", archetype: 'defensive' }
    ]
  },
  {
    tag: 'Step 3 of 3: The Unspoken Truth',
    title: 'What is the hard truth your closest friends are too polite to say to your face?',
    subtitle: 'The blind spot that repeats every 30 days.',
    options: [
      { text: 'You start 10 ambitious ideas with immense energy and finish zero of them.', archetype: 'starter' },
      { text: 'You overanalyze simple decisions until the window of opportunity closes.', archetype: 'paralysis' },
      { text: 'You say yes to everyone to feel needed, then silently resent them.', archetype: 'people_pleaser' },
      { text: 'You talk constantly about who you want to be, but repeat the exact same week.', archetype: 'loop' }
    ]
  }
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
    badge: 'ARCHETYPE: THE INTELLECTUAL AVOIDER',
    title: "Procrastination Masked as 'Research'",
    desc: "You use high intelligence to justify avoidance. You convince yourself you aren't procrastinating because you're 'preparing', but it's fear of imperfect real-world evaluation.",
    mode: 'HONEST / DARK TWIN',
    callout: "You've been 'planning' for 3 weeks. You aren't strategizing—you're terrified of failure. Take the single imperfect action today."
  },
  exhaustion: {
    badge: 'ARCHETYPE: THE TOMORROW FALLACIST',
    title: "Emotional Guilt Disguised as 'Physical Fatigue'",
    desc: "You mistake emotional dread for physical tiredness. You routinely delegate today's friction to an idealized 'future version' of yourself tomorrow who never shows up.",
    mode: 'HONEST / DARK TWIN',
    callout: "You aren't tired from work; you're exhausted from the mental weight of avoiding it. Starting for 5 minutes gives more energy than scrolling for 2 hours."
  },
  productive_proc: {
    badge: 'ARCHETYPE: THE PRODUCTIVE PROCRASTINATOR',
    title: 'False Momentum via Low-Stakes Busywork',
    desc: 'You organize your desk and clear minor emails to feel productive, while the single needle-moving priority remains untouched.',
    mode: 'HONEST / DARK TWIN',
    callout: 'Organizing your workspace is avoidance in disguise. Stop clearing minor hurdles to avoid the real milestone.'
  },
  people_pleaser: {
    badge: 'ARCHETYPE: THE BURDEN MINIMIZER',
    title: 'People-Pleasing Disguised as Kindness',
    desc: 'You volunteer your time even when empty because saying no makes you feel like an inconvenient burden. You sacrifice personal boundaries for temporary approval.',
    mode: 'THERAPIST / REFLECTIVE TWIN',
    callout: 'Where did you learn that your rest has to be earned? Saying no to others is the only way to say yes to your own life.'
  },
  overthinker: {
    badge: 'ARCHETYPE: THE RECURSIVE ANALYZER',
    title: 'Analysis Loops Replacing Real Clarity',
    desc: 'Under uncertainty, your mind replays conversations and weighs dozens of contingencies instead of testing one direct step in reality.',
    mode: 'FUTURE TWIN',
    callout: 'Thinking in circles feels responsible, but clarity only arrives after you make a real move.'
  },
  default: {
    badge: 'ARCHETYPE: THE CIRCULAR OVERTHINKER',
    title: 'Analysis Paralysis & Rationalization Loops',
    desc: 'Your cognitive default is overthinking. Standard yes-man AI fuels this by agreeing with every nuance, trapping you in recursive mental loops instead of decisive action.',
    mode: 'HONEST / DARK TWIN',
    callout: "You don't need more advice or another chatbot to agree with you. You need persistent accountability that catches you repeating your favorite excuses."
  }
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

function scoreMirrorAnswers(selected: Option[]): {
  key: string
  interpersonalPattern: string
  blindSpotNote: string
} {
  const tally: Record<string, number> = {}
  selected.forEach((opt, idx) => {
    const mapped = SECONDARY_WEIGHTS[opt.archetype] || 'default'
    // Step 3 carries higher self-reflection weight, while all 3 steps contribute
    const weight = idx === 2 ? 1.5 : idx === 1 ? 1.25 : 1.0
    tally[mapped] = (tally[mapped] || 0) + weight
  })

  const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1])
  const winningKey = ranked[0]?.[0] || 'default'

  const interpersonalMap: Record<string, string> = {
    overthinker: 'Internalizing silence & replaying micro-signals',
    control: 'Seeking quick reassurance to close uncertainty',
    avoidant: 'Detaching externally while ruminating privately',
    defensive: 'Protecting ego through preemptive withdrawal',
  }

  const blindSpotMap: Record<string, string> = {
    starter: 'Novelty chases over follow-through',
    paralysis: 'Waiting for 100% certainty before acting',
    people_pleaser: 'Over-giving followed by quiet resentment',
    loop: 'Mistaking articulation of goals for execution',
  }

  return {
    key: ARCHETYPES[winningKey] ? winningKey : 'default',
    interpersonalPattern: interpersonalMap[selected[1]?.archetype] || 'Quiet internal stress-testing',
    blindSpotNote: blindSpotMap[selected[2]?.archetype] || 'Repeating familiar hesitation loops',
  }
}

export default function MirrorTestPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Option[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [copied, setCopied] = useState(false)
  const [referralCode, setReferralCode] = useState<string>('')

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
      }, 1800)
    }
  }

  const scored = scoreMirrorAnswers(answers)
  const profile = ARCHETYPES[scored.key] || ARCHETYPES.default

  const copyShareLink = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams({
        utm_source: 'mirror_test',
        utm_medium: 'share',
        preview: scored.key,
      })
      if (referralCode) params.set('ref', referralCode)
      const url = `${window.location.origin}/test?${params.toString()}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0816] text-white flex flex-col items-center px-4 py-8 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[10%] w-[380px] h-[380px] bg-purple-600/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[5%] right-[5%] w-[420px] h-[420px] bg-pink-600/15 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-[500px] z-10 flex flex-col gap-5">
        {/* Top Header */}
        <header className="flex items-center justify-between p-3.5 bg-[#140F24]/80 backdrop-blur-xl border border-white/10 rounded-2xl">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-pink-500/20">
              TG
            </div>
            <span className="font-extrabold text-base tracking-tight">TwinGenie</span>
          </Link>
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400">
            {isCompleted ? 'Mirror Verified' : 'The Mirror Test'}
          </span>
        </header>

        {/* Progress Bar */}
        {!isScanning && !isCompleted && (
          <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: '33%' }}
              animate={{ width: `${((currentStep + 1) / QUESTIONS.length) * 100}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Active Question */}
          {!isScanning && !isCompleted && (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="bg-[#161126]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4"
            >
              <span className="text-xs font-extrabold uppercase tracking-wider text-cyan-400">
                {QUESTIONS[currentStep].tag}
              </span>
              <h1 className="text-2xl font-black leading-tight tracking-tight text-white">
                {QUESTIONS[currentStep].title}
              </h1>
              <p className="text-sm text-gray-400 -mt-1">
                {QUESTIONS[currentStep].subtitle}
              </p>

              <div className="flex flex-col gap-3 mt-2">
                {QUESTIONS[currentStep].options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelect(opt)}
                    className="flex items-center gap-3.5 p-4 rounded-2xl bg-[#1C1630]/70 border border-white/10 hover:border-purple-500 hover:bg-[#2A2046]/90 transition-all text-left group"
                  >
                    <span className="w-7 h-7 rounded-lg bg-white/10 text-cyan-400 font-black text-xs flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <span className="text-sm font-semibold text-gray-200 group-hover:text-white leading-snug">
                      {opt.text}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Scanning Animation */}
          {isScanning && (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[#161126]/90 border border-white/10 rounded-3xl p-10 flex flex-col items-center text-center gap-5 shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full border-2 border-pink-500/80 bg-pink-500/10 flex items-center justify-center animate-pulse">
                <Sparkles className="w-8 h-8 text-pink-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Calibrating Cognitive Mirror...</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-[280px]">
                  Cross-referencing 35 personality archetypes and persistent avoidance loops...
                </p>
              </div>
            </motion.div>
          )}

          {/* Results Reveal & Download Gate */}
          {isCompleted && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35 }}
              className="bg-[#161126]/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-4"
            >
              <span className="self-start px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pink-500/15 border border-pink-500/40 text-pink-400">
                {profile.badge}
              </span>

              <div className="bg-[#2A0E1A]/60 border border-pink-500/40 rounded-2xl p-5">
                <span className="text-xs font-extrabold uppercase tracking-wider text-pink-400">
                  Illustrative 3-Answer Preview • Core Pattern
                </span>
                <h2 className="text-xl font-black text-white mt-1 leading-snug">
                  {profile.title}
                </h2>
                <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                  {profile.desc}
                </p>
                <div className="mt-3 pt-3 border-t border-white/10 text-xs text-gray-300 space-y-1">
                  <div><strong className="text-white">Interpersonal reflex:</strong> {scored.interpersonalPattern}</div>
                  <div><strong className="text-white">Recurring friction:</strong> {scored.blindSpotNote}</div>
                </div>
              </div>

              {/* Chatbot Contrast Box */}
              <div className="bg-[#18122A]/80 border border-white/10 rounded-2xl p-4 flex flex-col gap-3 text-xs leading-relaxed">
                <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                  Illustrative Mode Contrast Example
                </div>
                <div className="flex gap-2.5">
                  <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-black shrink-0 h-fit">
                    Generic AI Style
                  </span>
                  <span className="text-gray-300">
                    &quot;Rest is productive! Take your time to plan perfectly before doing anything!&quot;
                  </span>
                </div>
                <div className="flex gap-2.5">
                  <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded font-black shrink-0 h-fit">
                    {profile.mode}
                  </span>
                  <span className="text-white font-medium">
                    &quot;{profile.callout}&quot;
                  </span>
                </div>
              </div>

              {/* App Store & Web Signup CTA */}
              <div className="flex flex-col gap-3 mt-1">
                <Link
                  href={`/signup?utm_source=mirror_test&archetype=${scored.key}${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ''}`}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white font-black text-base flex items-center justify-center gap-2.5 shadow-xl shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <span>Take Full 35-Question Twin Assessment</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <a
                  href={`/download?ref=${encodeURIComponent(referralCode || 'mirror_test')}&archetype=${scored.key}&utm_source=mirror_quiz`}
                  className="w-full py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Or Open Android App on Google Play</span>
                </a>

                <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-400">
                  <span>Illustrative Preview • Free 35-Trait Assessment in App</span>
                </div>

                <button
                  onClick={copyShareLink}
                  className="w-full py-3 px-4 rounded-xl border border-white/15 hover:border-white/30 text-gray-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                  <span>{copied ? 'Link Copied to Clipboard!' : 'Share The Mirror Test with a Friend'}</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-500 leading-normal py-2">
          TwinGenie • The Cognitive Digital Twin with Semantic Memory
          <div className="mt-1 flex justify-center gap-3 text-gray-400">
            <a href="/privacy" className="hover:underline">Privacy</a>
            <span>•</span>
            <a href="/terms" className="hover:underline">Terms</a>
            <span>•</span>
            <a href="/download" className="hover:underline">Google Play</a>
          </div>
        </footer>
      </div>
    </div>
  )
}