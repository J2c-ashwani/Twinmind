'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import { flushPendingAttribution } from '@/lib/attribution'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import SiteHeader from '@/components/Layout/SiteHeader'
import SiteFooter from '@/components/Layout/SiteFooter'
import { BrandEmblem } from '@/components/Layout/BrandMark'

interface Question {
    id: number
    question_text: string
    question_type: string
    options_json: string[] | null
    screen_number: number
    allow_other: boolean
}

interface Answer {
    question_id: number
    selected_option?: string | null
    answer_text?: string | null
}

// Authentic 35-question Big Five psychometric assessment matching production database and scoring engine
const DEFAULT_FALLBACK_QUESTIONS: Question[] = [
    // Screen 1: Openness, Extraversion, Conscientiousness (Q1 - Q7)
    { id: 1, question_text: 'How do you usually approach new experiences?', question_type: 'single_choice', options_json: ['Curious and excited', 'Cautious but willing', 'Prefer familiar things', 'Avoid them'], screen_number: 1, allow_other: false },
    { id: 2, question_text: 'When plans change suddenly, how do you feel?', question_type: 'single_choice', options_json: ['Stressed', 'Annoyed', 'Excited', 'Neutral'], screen_number: 1, allow_other: false },
    { id: 3, question_text: 'How do you recharge after a long day?', question_type: 'single_choice', options_json: ['Alone', 'With close friends', 'In a group', 'Doing hobbies'], screen_number: 1, allow_other: false },
    { id: 4, question_text: 'In social situations, you usually:', question_type: 'single_choice', options_json: ['Start conversations', 'Wait for others', 'Stick to familiar people', 'Avoid socializing'], screen_number: 1, allow_other: false },
    { id: 5, question_text: 'Which describes your social energy?', question_type: 'single_choice', options_json: ['High', 'Medium', 'Low', 'Depends on mood'], screen_number: 1, allow_other: false },
    { id: 6, question_text: 'How organized are you day-to-day?', question_type: 'single_choice', options_json: ['Very organized', 'Somewhat organized', 'Not organized', 'Organized only under pressure'], screen_number: 1, allow_other: false },
    { id: 7, question_text: 'How often do you procrastinate?', question_type: 'single_choice', options_json: ['Rarely', 'Sometimes', 'Often', 'Almost always'], screen_number: 1, allow_other: false },

    // Screen 2: Problem-Solving, Planning, Openness (Q8 - Q14)
    { id: 8, question_text: 'When solving problems, you prefer:', question_type: 'single_choice', options_json: ['Logic and structure', 'Creativity and ideas', 'A mix of both', 'Delegating to others'], screen_number: 2, allow_other: false },
    { id: 9, question_text: 'Do you plan everything or improvise?', question_type: 'single_choice', options_json: ['Plan in detail', 'Rough plan', 'Improvise mostly', 'Completely spontaneous'], screen_number: 2, allow_other: false },
    { id: 10, question_text: 'How important is perfection to you?', question_type: 'single_choice', options_json: ['Very important', 'Somewhat important', 'Not important', 'Depends on task'], screen_number: 2, allow_other: false },
    { id: 11, question_text: 'When working on a project, you:', question_type: 'single_choice', options_json: ['Plan ahead fully', 'Plan key steps', 'Start and adjust', 'Improvise entirely'], screen_number: 2, allow_other: false },
    { id: 12, question_text: 'Do you enjoy exploring new ideas, cultures, or perspectives?', question_type: 'single_choice', options_json: ['Yes, very much', 'Sometimes', 'Rarely', 'Not at all'], screen_number: 2, allow_other: false },
    { id: 13, question_text: 'Do you enjoy abstract thinking or philosophical discussions?', question_type: 'single_choice', options_json: ['Yes', 'Sometimes', 'Rarely', 'No'], screen_number: 2, allow_other: false },
    { id: 14, question_text: 'How often do you daydream?', question_type: 'single_choice', options_json: ['Very often', 'Sometimes', 'Rarely', 'Never'], screen_number: 2, allow_other: false },

    // Screen 3: Emotional responses, Stress, Triggers (Q15 - Q21)
    { id: 15, question_text: 'When stressed, you usually:', question_type: 'single_choice', options_json: ['Take action', 'Withdraw', 'Overthink', 'Distract yourself', 'Seek support'], screen_number: 3, allow_other: false },
    { id: 16, question_text: 'What hurts you the most?', question_type: 'single_choice', options_json: ['Being ignored', 'Being criticized', 'Feeling unappreciated', 'Feeling controlled', 'Betrayal'], screen_number: 3, allow_other: false },
    { id: 17, question_text: 'How intense are your emotions?', question_type: 'single_choice', options_json: ['Very intense', 'Moderate', 'Mild', 'Hard to notice'], screen_number: 3, allow_other: false },
    { id: 18, question_text: 'When something goes wrong, you:', question_type: 'single_choice', options_json: ['Expect the worst', 'Stay optimistic', 'Look for solutions', 'Blame yourself'], screen_number: 3, allow_other: false },
    { id: 19, question_text: 'What instantly makes you angry or upset?', question_type: 'single_choice', options_json: ['Disrespect', 'Unfairness', 'Betrayal', 'Chaos/lack of control', 'Being ignored'], screen_number: 3, allow_other: false },
    { id: 20, question_text: 'How often do you experience anxiety, anger, or sadness?', question_type: 'single_choice', options_json: ['Very often', 'Sometimes', 'Rarely', 'Almost never'], screen_number: 3, allow_other: false },
    { id: 21, question_text: 'When overwhelmed, what do you usually do?', question_type: 'single_choice', options_json: ['Take action', 'Shut down', 'Distract myself', 'Seek support', 'Cry or release emotions'], screen_number: 3, allow_other: false },

    // Screen 4: Decision-making & Motivation (Q22 - Q27)
    { id: 22, question_text: 'When making big decisions, you rely on:', question_type: 'single_choice', options_json: ['Logic', 'Intuition', 'Emotions', 'Advice from others'], screen_number: 4, allow_other: false },
    { id: 23, question_text: 'Do you decide quickly or slowly?', question_type: 'single_choice', options_json: ['Quickly', 'After thinking', 'Very slowly', 'Depends on situation'], screen_number: 4, allow_other: false },
    { id: 24, question_text: 'Are you comfortable deciding without full information?', question_type: 'single_choice', options_json: ['Yes', 'Sometimes', 'No', 'Depends on risk'], screen_number: 4, allow_other: false },
    { id: 25, question_text: 'What motivates you more?', question_type: 'single_choice', options_json: ['Success', 'Avoiding failure', 'Recognition', 'Freedom', 'Stability'], screen_number: 4, allow_other: false },
    { id: 26, question_text: 'What matters most in life right now?', question_type: 'single_choice', options_json: ['Achievement', 'Relationships', 'Freedom', 'Security', 'Creativity'], screen_number: 4, allow_other: false },
    { id: 27, question_text: 'What drives you more?', question_type: 'single_choice', options_json: ['Achieving success', 'Avoiding failure', 'Helping others', 'Proving yourself', 'Finding meaning'], screen_number: 4, allow_other: false },

    // Screen 5: Relationships, Trust, Fears & Vulnerabilities (Q28 - Q35)
    { id: 28, question_text: 'In relationships, you are:', question_type: 'single_choice', options_json: ['Independent', 'Emotionally connected', 'Both', 'Unsure'], screen_number: 5, allow_other: false },
    { id: 29, question_text: 'When someone hurts you, you:', question_type: 'single_choice', options_json: ['Forgive quickly', 'Take time', 'Hold grudges', 'Cut them off'], screen_number: 5, allow_other: false },
    { id: 30, question_text: 'Do you naturally trust people?', question_type: 'single_choice', options_json: ['Yes', 'Slowly', 'Rarely', 'No'], screen_number: 5, allow_other: false },
    { id: 31, question_text: 'What do you fear losing the most?', question_type: 'single_choice', options_json: ['Loved ones', 'Freedom', 'Stability', 'Respect', 'Identity'], screen_number: 5, allow_other: false },
    { id: 32, question_text: 'What do people misunderstand about you the most?', question_type: 'single_choice', options_json: ['My intentions', 'My emotions', 'My personality', 'My goals', 'My boundaries'], screen_number: 5, allow_other: false },
    { id: 33, question_text: 'What is a weakness you rarely talk about?', question_type: 'text', options_json: null, screen_number: 5, allow_other: false },
    { id: 34, question_text: 'What behavior from others hurts you the most?', question_type: 'single_choice', options_json: ['Criticism', 'Ignoring', 'Controlling behavior', 'Lies', 'Lack of appreciation'], screen_number: 5, allow_other: false },
    { id: 35, question_text: 'In relationships, do you fear:', question_type: 'single_choice', options_json: ['Losing people', 'Being controlled', 'Both', 'Neither'], screen_number: 5, allow_other: false },
]

export default function OnboardingPage() {
    const router = useRouter()
    const [currentScreen, setCurrentScreen] = useState(1)
    const [questions, setQuestions] = useState<Question[]>(DEFAULT_FALLBACK_QUESTIONS)
    const [answers, setAnswers] = useState<Record<number, Answer>>({})
    const [otherTextInputs, setOtherTextInputs] = useState<Record<number, string>>({})
    const [multiSelectAnswers, setMultiSelectAnswers] = useState<Record<number, Set<string>>>({})
    const [loading, setLoading] = useState(false)
    const [generating, setGenerating] = useState(false)
    const [showSignup, setShowSignup] = useState(false)
    const [signupData, setSignupData] = useState({ name: '', email: '', password: '' })
    const [signupError, setSignupError] = useState('')

    const totalScreens = 5

    useEffect(() => {
        checkAuthAndProfile()
        loadQuestions()
    }, [])

    async function checkAuthAndProfile() {
        try {
            const { data: { session } } = await supabase.auth.getSession()

            if (session) {
                await flushPendingAttribution({
                    accessToken: session.access_token,
                    userId: session.user.id,
                    email: session.user.email,
                    fullName: session.user.user_metadata?.full_name,
                    userMetadata: session.user.user_metadata,
                })

                const { data: profile } = await supabase
                    .from('personality_profiles')
                    .select('personality_json')
                    .eq('user_id', session.user.id)
                    .single()

                if (profile && profile.personality_json) {
                    router.push('/chat')
                }
            }
        } catch (error) {
            console.error('Error checking profile:', error)
        }
    }

    async function loadQuestions() {
        try {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Question fetch timeout')), 2500)
            )
            const result: any = await Promise.race([api.getQuestions(), timeoutPromise])
            if (result?.questions && result.questions.length >= 20) {
                setAnswers((currentAnswers) => {
                    if (Object.keys(currentAnswers).length === 0) {
                        setQuestions(result.questions)
                    }
                    return currentAnswers
                })
            }
        } catch (error) {
            console.warn('Using authentic embedded 35-question dataset:', error)
        }
    }

    const currentQuestions = questions.filter((q) => q.screen_number === currentScreen)

    function handleAnswer(questionId: number, selectedOption: string, isOther: boolean = false) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: {
                question_id: questionId,
                selected_option: isOther ? 'Other' : selectedOption,
                answer_text: isOther ? otherTextInputs[questionId] || '' : null,
            },
        }))
    }

    function handleOtherText(questionId: number, text: string) {
        setOtherTextInputs((prev) => ({ ...prev, [questionId]: text }))

        if (answers[questionId]?.selected_option === 'Other') {
            setAnswers((prev) => ({
                ...prev,
                [questionId]: {
                    ...prev[questionId],
                    answer_text: text,
                },
            }))
        }
    }

    function handleTextAnswer(questionId: number, text: string) {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: {
                question_id: questionId,
                selected_option: 'text',
                answer_text: text,
            },
        }))
    }

    function handleMultiSelect(questionId: number, option: string, selected: boolean) {
        setMultiSelectAnswers((prev) => {
            const current = new Set(prev[questionId] || [])
            if (selected) {
                current.add(option)
            } else {
                current.delete(option)
            }
            const updated = { ...prev, [questionId]: current }

            if (current.size > 0) {
                setAnswers((a) => ({
                    ...a,
                    [questionId]: {
                        question_id: questionId,
                        selected_option: Array.from(current).join(', '),
                        answer_text: null,
                    },
                }))
            } else {
                setAnswers((a) => {
                    const { [questionId]: _, ...rest } = a
                    return rest
                })
            }

            return updated
        })
    }

    function canProgress() {
        return currentQuestions.every((q) => {
            const answer = answers[q.id]
            if (!answer) return false

            if (q.question_type === 'text' || q.question_type === 'number') {
                return Boolean(answer.answer_text && answer.answer_text.trim().length > 0)
            }

            if (q.question_type === 'multiple_select') {
                const selections = multiSelectAnswers[q.id]
                return selections != null && selections.size > 0
            }

            if (!answer.selected_option) return false
            if (answer.selected_option === 'Other') {
                return Boolean(answer.answer_text && answer.answer_text.trim().length > 0)
            }
            return true
        })
    }

    async function handleNext() {
        if (currentScreen < totalScreens) {
            setCurrentScreen((prev) => prev + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                await handleSubmitForExistingUser()
            } else {
                setShowSignup(true)
            }
        }
    }

    function getScreenTitle() {
        switch (currentScreen) {
            case 1:
                return 'Openness, Energy & Discipline'
            case 2:
                return 'Problem-Solving & Cognitive Style'
            case 3:
                return 'Emotional Responses & Stress Triggers'
            case 4:
                return 'Decision-Making & Core Drives'
            case 5:
                return 'Relationships, Trust & Blindspots'
            default:
                return 'Psychometric Calibration'
        }
    }

    function handleBack() {
        if (currentScreen > 1) {
            setCurrentScreen((prev) => prev - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    async function handleSubmitForExistingUser() {
        setLoading(true)
        setGenerating(true)

        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
                return
            }

            const token = session.access_token
            const userId = session.user.id

            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', userId)
                        .maybeSingle()
                    if (profile) break
                } catch {}
                await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
            }

            const formattedAnswers = Object.values(answers).map((answer) => ({
                question_id: answer.question_id,
                selected_option: answer.selected_option || null,
                answer_text: answer.answer_text || null,
            }))

            let submitSuccess = false
            let lastSubmitError: any = null
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await api.submitAnswers(formattedAnswers, token)
                    submitSuccess = true
                    break
                } catch (err: any) {
                    lastSubmitError = err
                    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
                }
            }

            if (!submitSuccess) {
                throw lastSubmitError || new Error('Failed to save assessment answers')
            }

            await api.generatePersonality(token)
            router.push('/chat')
        } catch (error: any) {
            console.error('Error submitting:', error)
            alert(error.message || 'Failed to create your twin')
            setGenerating(false)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubmit() {
        setLoading(true)
        setGenerating(true)
        setSignupError('')

        try {
            let token: string | null = null
            let userId: string | null = null

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: signupData.email,
                password: signupData.password,
                options: {
                    data: {
                        full_name: signupData.name,
                    },
                    emailRedirectTo: window.location.origin + '/chat',
                },
            })

            if (signUpError) {
                if (signUpError.message?.toLowerCase().includes('already registered')) {
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: signupData.email,
                        password: signupData.password,
                    })
                    if (signInError) {
                        throw new Error('This account already exists. Verify your password or sign in directly.')
                    }
                    token = signInData?.session?.access_token || null
                    userId = signInData?.user?.id || null
                } else {
                    throw signUpError
                }
            } else {
                if (!authData.user) throw new Error('Failed to create account')

                if (!authData.session) {
                    setSignupError(
                        'Account created. Check your email to confirm your address before signing in.'
                    )
                    setLoading(false)
                    setGenerating(false)
                    setTimeout(() => router.push('/login'), 3000)
                    return
                }

                token = authData.session.access_token
                userId = authData.user.id
            }

            if (!token || !userId) {
                throw new Error('Unable to establish an authenticated session.')
            }

            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', userId)
                        .maybeSingle()
                    if (profile) break
                } catch {}
                await new Promise((r) => setTimeout(r, 200 * (attempt + 1)))
            }

            const formattedAnswers = Object.values(answers).map((answer) => ({
                question_id: answer.question_id,
                selected_option: answer.selected_option || null,
                answer_text: answer.answer_text || null,
            }))

            let submitSuccess = false
            let lastSubmitError: any = null
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await api.submitAnswers(formattedAnswers, token)
                    submitSuccess = true
                    break
                } catch (err: any) {
                    lastSubmitError = err
                    await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
                }
            }

            if (!submitSuccess) {
                throw lastSubmitError || new Error('Failed to save assessment answers')
            }

            await api.generatePersonality(token)
            router.push('/chat')
        } catch (error: any) {
            console.error('Error submitting:', error)
            setSignupError(error.message || 'Failed to create your twin')
            setGenerating(false)
        } finally {
            setLoading(false)
        }
    }

    const totalAnswered = Object.keys(answers).length
    const progress = (currentScreen / totalScreens) * 100

    if (generating) {
        return (
            <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
                <SiteHeader minimal ctaHref="/login" ctaLabel="Sign in" />
                <div className="flex-1 flex flex-col items-center justify-center p-6">
                    <motion.div
                        initial={{ scale: 0.94, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="enterprise-panel max-w-md w-full p-10 text-center"
                    >
                        <div className="mx-auto mb-6 flex justify-center">
                            <BrandEmblem size="lg" />
                        </div>
                        <div className="font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                            35-Trait Scoring &amp; Synthesis
                        </div>
                        <h2 className="mt-2 text-2xl font-semibold text-[#F4F2EC]">
                            Calibrating Your Digital Twin
                        </h2>
                        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
                            Mapping your Big Five traits, conflict triggers, and cognitive style directives...
                        </p>
                        <div className="mt-6 flex justify-center">
                            <Loader2 className="h-5 w-5 animate-spin text-[#E7C891]" />
                        </div>
                    </motion.div>
                </div>
                <SiteFooter />
            </div>
        )
    }

    if (showSignup) {
        return (
            <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
                <SiteHeader minimal ctaHref="/login" ctaLabel="Sign in" />
                <main className="flex-1 flex items-center justify-center px-4 py-12">
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full max-w-md"
                    >
                        <div className="enterprise-panel p-8">
                            <div className="text-center mb-7">
                                <div className="flex justify-center mb-4">
                                    <BrandEmblem size="lg" />
                                </div>
                                <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-400">
                                    35 / 35 Responses Captured
                                </div>
                                <h1 className="mt-2 text-2xl font-semibold text-[#F4F2EC]">
                                    Save &amp; Generate Your Twin
                                </h1>
                                <p className="mt-1.5 text-sm text-neutral-400">
                                    Create an encrypted account to initialize your calibrated workspace.
                                </p>
                            </div>

                            {signupError && (
                                <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200">
                                    {signupError}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-neutral-300">
                                        Full Name
                                    </label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                        <input
                                            type="text"
                                            value={signupData.name}
                                            onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                                            placeholder="Enter your name"
                                            className="w-full rounded-xl border border-white/10 bg-[#07080B] py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-neutral-300">
                                        Email
                                    </label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                        <input
                                            type="email"
                                            value={signupData.email}
                                            onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                                            placeholder="you@domain.com"
                                            className="w-full rounded-xl border border-white/10 bg-[#07080B] py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-neutral-300">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
                                        <input
                                            type="password"
                                            value={signupData.password}
                                            onChange={(e) =>
                                                setSignupData({ ...signupData, password: e.target.value })
                                            }
                                            placeholder="Minimum 6 characters"
                                            className="w-full rounded-xl border border-white/10 bg-[#07080B] py-3 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={
                                        loading ||
                                        !signupData.name ||
                                        !signupData.email ||
                                        !signupData.password ||
                                        signupData.password.length < 6
                                    }
                                    className="btn-primary-ivory mt-2 w-full py-3.5 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        'Initialize My Digital Twin'
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setShowSignup(false)}
                                    disabled={loading}
                                    className="w-full py-2 text-xs text-neutral-400 transition-colors hover:text-white"
                                >
                                    ← Return to questions
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </main>
                <SiteFooter />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#07080B] text-[#F4F2EC] flex flex-col">
            <SiteHeader minimal ctaHref="/login" ctaLabel="Sign in" />

            <main className="flex-1 px-4 py-10 sm:px-6">
                <div className="mx-auto w-full max-w-3xl">
                    {/* Calibration Header */}
                    <div className="mb-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-[#D9A760]">
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                    Psychometric Calibration • Phase {currentScreen} of {totalScreens}
                                </div>
                                <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-[#F4F2EC] sm:text-3xl">
                                    {getScreenTitle()}
                                </h1>
                            </div>
                            <div className="rounded-xl border border-white/[0.08] bg-[#0D1016] px-3.5 py-2 text-right">
                                <div className="font-mono text-xs font-semibold text-[#F4F2EC]">
                                    {totalAnswered} / {questions.length}
                                </div>
                                <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">
                                    Traits Logged
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-5 gap-1.5">
                            {[1, 2, 3, 4, 5].map((step) => (
                                <div
                                    key={step}
                                    className={`h-1.5 rounded-full transition-colors ${
                                        step < currentScreen
                                            ? 'bg-emerald-400'
                                            : step === currentScreen
                                            ? 'bg-[#D9A760]'
                                            : 'bg-white/[0.08]'
                                    }`}
                                />
                            ))}
                        </div>
                        <div className="mt-2 flex justify-between font-mono text-[10px] text-neutral-500">
                            <span>Screen {currentScreen} of {totalScreens}</span>
                            <span>{Math.round(progress)}% progression</span>
                        </div>
                    </div>

                    {/* Question Sheet */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentScreen}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.22 }}
                            className="enterprise-panel mb-8 p-6 sm:p-8"
                        >
                            <div className="space-y-9">
                                {currentQuestions.map((q) => (
                                    <div key={q.id} className="space-y-3.5">
                                        <label className="block text-base font-medium leading-snug text-[#F4F2EC] sm:text-lg">
                                            <span className="mr-2 font-mono text-xs text-[#D9A760]">
                                                Q{String(q.id).padStart(2, '0')}
                                            </span>
                                            {q.question_text}
                                        </label>

                                        {q.question_type === 'text' ? (
                                            <textarea
                                                value={answers[q.id]?.answer_text || ''}
                                                onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                                                className="w-full resize-none rounded-xl border border-white/[0.12] bg-[#07080B] px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                                rows={3}
                                                placeholder="Share an honest thought..."
                                            />
                                        ) : q.question_type === 'number' ? (
                                            <input
                                                type="number"
                                                value={answers[q.id]?.answer_text || ''}
                                                onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                                                className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                                placeholder="Enter a number..."
                                            />
                                        ) : q.question_type === 'multiple_select' ? (
                                            <div className="space-y-2">
                                                {q.options_json?.map((option) => {
                                                    const isSelected = multiSelectAnswers[q.id]?.has(option) ?? false
                                                    return (
                                                        <label
                                                            key={option}
                                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all ${
                                                                isSelected
                                                                    ? 'border-[#D9A760]/65 bg-[#D9A760]/[0.09] text-white'
                                                                    : 'border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.04]'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={(e) =>
                                                                    handleMultiSelect(q.id, option, e.target.checked)
                                                                }
                                                                className="sr-only"
                                                            />
                                                            <span
                                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                                                    isSelected
                                                                        ? 'border-[#D9A760] bg-[#D9A760] text-[#07080B]'
                                                                        : 'border-white/25 bg-transparent'
                                                                }`}
                                                            >
                                                                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                                                            </span>
                                                            <span className="text-sm">{option}</span>
                                                        </label>
                                                    )
                                                })}

                                                {q.allow_other && (() => {
                                                    const isOtherSelected =
                                                        multiSelectAnswers[q.id]?.has('Other') ?? false
                                                    return (
                                                        <div className="space-y-2">
                                                            <label
                                                                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all ${
                                                                    isOtherSelected
                                                                        ? 'border-[#D9A760]/65 bg-[#D9A760]/[0.09] text-white'
                                                                        : 'border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.04]'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isOtherSelected}
                                                                    onChange={(e) =>
                                                                        handleMultiSelect(q.id, 'Other', e.target.checked)
                                                                    }
                                                                    className="sr-only"
                                                                />
                                                                <span
                                                                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                                                        isOtherSelected
                                                                            ? 'border-[#D9A760] bg-[#D9A760] text-[#07080B]'
                                                                            : 'border-white/25 bg-transparent'
                                                                    }`}
                                                                >
                                                                    {isOtherSelected && (
                                                                        <Check className="h-3 w-3 stroke-[3]" />
                                                                    )}
                                                                </span>
                                                                <span className="text-sm">Other</span>
                                                            </label>

                                                            {isOtherSelected && (
                                                                <input
                                                                    type="text"
                                                                    value={otherTextInputs[q.id] || ''}
                                                                    onChange={(e) =>
                                                                        handleOtherText(q.id, e.target.value)
                                                                    }
                                                                    placeholder="Please specify..."
                                                                    className="ml-6 w-[calc(100%-1.5rem)] rounded-xl border border-white/[0.12] bg-[#07080B] px-4 py-2.5 text-sm text-white focus:border-[#D9A760]/60 focus:outline-none"
                                                                />
                                                            )}
                                                        </div>
                                                    )
                                                })()}
                                            </div>
                                        ) : (
                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {q.options_json?.map((option) => {
                                                    const selected = answers[q.id]?.selected_option === option
                                                    return (
                                                        <label
                                                            key={option}
                                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all ${
                                                                selected
                                                                    ? 'border-[#D9A760]/70 bg-[#D9A760]/[0.10] text-white'
                                                                    : 'border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.04]'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`question-${q.id}`}
                                                                value={option}
                                                                checked={selected}
                                                                onChange={() => handleAnswer(q.id, option)}
                                                                className="sr-only"
                                                            />
                                                            <span
                                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                                                                    selected
                                                                        ? 'border-[#D9A760]'
                                                                        : 'border-white/25 bg-transparent'
                                                                }`}
                                                            >
                                                                {selected && (
                                                                    <span className="h-2 w-2 rounded-full bg-[#D9A760]" />
                                                                )}
                                                            </span>
                                                            <span className="text-sm">{option}</span>
                                                        </label>
                                                    )
                                                })}

                                                {q.allow_other && (
                                                    <div className="space-y-2 sm:col-span-2">
                                                        <label
                                                            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-all ${
                                                                answers[q.id]?.selected_option === 'Other'
                                                                    ? 'border-[#D9A760]/70 bg-[#D9A760]/[0.10] text-white'
                                                                    : 'border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:border-white/20 hover:bg-white/[0.04]'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`question-${q.id}`}
                                                                value="Other"
                                                                checked={answers[q.id]?.selected_option === 'Other'}
                                                                onChange={() => handleAnswer(q.id, 'Other', true)}
                                                                className="sr-only"
                                                            />
                                                            <span
                                                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                                                    answers[q.id]?.selected_option === 'Other'
                                                                        ? 'border-[#D9A760]'
                                                                        : 'border-white/25 bg-transparent'
                                                                }`}
                                                            >
                                                                {answers[q.id]?.selected_option === 'Other' && (
                                                                    <span className="h-2 w-2 rounded-full bg-[#D9A760]" />
                                                                )}
                                                            </span>
                                                            <span className="text-sm">Other</span>
                                                        </label>

                                                        {answers[q.id]?.selected_option === 'Other' && (
                                                            <input
                                                                type="text"
                                                                value={otherTextInputs[q.id] || ''}
                                                                onChange={(e) => handleOtherText(q.id, e.target.value)}
                                                                placeholder="Please specify..."
                                                                className="w-full rounded-xl border border-white/[0.12] bg-[#07080B] px-4 py-2.5 text-sm text-white focus:border-[#D9A760]/60 focus:outline-none"
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* Footer Controls */}
                    <div className="flex items-center justify-between gap-4">
                        <button
                            type="button"
                            onClick={handleBack}
                            disabled={currentScreen === 1}
                            className="btn-secondary-obsidian px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            <span>Back</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleNext}
                            disabled={loading || !canProgress()}
                            className="btn-primary-ivory px-7 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            <span>{currentScreen === totalScreens ? 'Complete & Create My Twin' : 'Continue'}</span>
                            {currentScreen < totalScreens && <ChevronRight className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    )
}
