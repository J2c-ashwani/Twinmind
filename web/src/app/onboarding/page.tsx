'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Loader2, ChevronLeft, ChevronRight, Mail, Lock, User } from 'lucide-react'

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
    selected_option?: string
    answer_text?: string
}

// Authentic 35-question Big Five psychometric assessment matching production database and scoring engine
const DEFAULT_FALLBACK_QUESTIONS: Question[] = [
    // Screen 1: Openness, Extraversion, Conscientiousness (Q1 - Q7)
    { id: 1, question_text: "How do you usually approach new experiences?", question_type: "single_choice", options_json: ["Curious and excited", "Cautious but willing", "Prefer familiar things", "Avoid them"], screen_number: 1, allow_other: false },
    { id: 2, question_text: "When plans change suddenly, how do you feel?", question_type: "single_choice", options_json: ["Stressed", "Annoyed", "Excited", "Neutral"], screen_number: 1, allow_other: false },
    { id: 3, question_text: "How do you recharge after a long day?", question_type: "single_choice", options_json: ["Alone", "With close friends", "In a group", "Doing hobbies"], screen_number: 1, allow_other: false },
    { id: 4, question_text: "In social situations, you usually:", question_type: "single_choice", options_json: ["Start conversations", "Wait for others", "Stick to familiar people", "Avoid socializing"], screen_number: 1, allow_other: false },
    { id: 5, question_text: "Which describes your social energy?", question_type: "single_choice", options_json: ["High", "Medium", "Low", "Depends on mood"], screen_number: 1, allow_other: false },
    { id: 6, question_text: "How organized are you day-to-day?", question_type: "single_choice", options_json: ["Very organized", "Somewhat organized", "Not organized", "Organized only under pressure"], screen_number: 1, allow_other: false },
    { id: 7, question_text: "How often do you procrastinate?", question_type: "single_choice", options_json: ["Rarely", "Sometimes", "Often", "Almost always"], screen_number: 1, allow_other: false },

    // Screen 2: Problem-Solving, Planning, Openness (Q8 - Q14)
    { id: 8, question_text: "When solving problems, you prefer:", question_type: "single_choice", options_json: ["Logic and structure", "Creativity and ideas", "A mix of both", "Delegating to others"], screen_number: 2, allow_other: false },
    { id: 9, question_text: "Do you plan everything or improvise?", question_type: "single_choice", options_json: ["Plan in detail", "Rough plan", "Improvise mostly", "Completely spontaneous"], screen_number: 2, allow_other: false },
    { id: 10, question_text: "How important is perfection to you?", question_type: "single_choice", options_json: ["Very important", "Somewhat important", "Not important", "Depends on task"], screen_number: 2, allow_other: false },
    { id: 11, question_text: "When working on a project, you:", question_type: "single_choice", options_json: ["Plan ahead fully", "Plan key steps", "Start and adjust", "Improvise entirely"], screen_number: 2, allow_other: false },
    { id: 12, question_text: "Do you enjoy exploring new ideas, cultures, or perspectives?", question_type: "single_choice", options_json: ["Yes, very much", "Sometimes", "Rarely", "Not at all"], screen_number: 2, allow_other: false },
    { id: 13, question_text: "Do you enjoy abstract thinking or philosophical discussions?", question_type: "single_choice", options_json: ["Yes", "Sometimes", "Rarely", "No"], screen_number: 2, allow_other: false },
    { id: 14, question_text: "How often do you daydream?", question_type: "single_choice", options_json: ["Very often", "Sometimes", "Rarely", "Never"], screen_number: 2, allow_other: false },

    // Screen 3: Emotional responses, Stress, Triggers (Q15 - Q21)
    { id: 15, question_text: "When stressed, you usually:", question_type: "single_choice", options_json: ["Take action", "Withdraw", "Overthink", "Distract yourself", "Seek support"], screen_number: 3, allow_other: false },
    { id: 16, question_text: "What hurts you the most?", question_type: "single_choice", options_json: ["Being ignored", "Being criticized", "Feeling unappreciated", "Feeling controlled", "Betrayal"], screen_number: 3, allow_other: false },
    { id: 17, question_text: "How intense are your emotions?", question_type: "single_choice", options_json: ["Very intense", "Moderate", "Mild", "Hard to notice"], screen_number: 3, allow_other: false },
    { id: 18, question_text: "When something goes wrong, you:", question_type: "single_choice", options_json: ["Expect the worst", "Stay optimistic", "Look for solutions", "Blame yourself"], screen_number: 3, allow_other: false },
    { id: 19, question_text: "What instantly makes you angry or upset?", question_type: "single_choice", options_json: ["Disrespect", "Unfairness", "Betrayal", "Chaos/lack of control", "Being ignored"], screen_number: 3, allow_other: false },
    { id: 20, question_text: "How often do you experience anxiety, anger, or sadness?", question_type: "single_choice", options_json: ["Very often", "Sometimes", "Rarely", "Almost never"], screen_number: 3, allow_other: false },
    { id: 21, question_text: "When overwhelmed, what do you usually do?", question_type: "single_choice", options_json: ["Take action", "Shut down", "Distract myself", "Seek support", "Cry or release emotions"], screen_number: 3, allow_other: false },

    // Screen 4: Decision-making & Motivation (Q22 - Q27)
    { id: 22, question_text: "When making big decisions, you rely on:", question_type: "single_choice", options_json: ["Logic", "Intuition", "Emotions", "Advice from others"], screen_number: 4, allow_other: false },
    { id: 23, question_text: "Do you decide quickly or slowly?", question_type: "single_choice", options_json: ["Quickly", "After thinking", "Very slowly", "Depends on situation"], screen_number: 4, allow_other: false },
    { id: 24, question_text: "Are you comfortable deciding without full information?", question_type: "single_choice", options_json: ["Yes", "Sometimes", "No", "Depends on risk"], screen_number: 4, allow_other: false },
    { id: 25, question_text: "What motivates you more?", question_type: "single_choice", options_json: ["Success", "Avoiding failure", "Recognition", "Freedom", "Stability"], screen_number: 4, allow_other: false },
    { id: 26, question_text: "What matters most in life right now?", question_type: "single_choice", options_json: ["Achievement", "Relationships", "Freedom", "Security", "Creativity"], screen_number: 4, allow_other: false },
    { id: 27, question_text: "What drives you more?", question_type: "single_choice", options_json: ["Achieving success", "Avoiding failure", "Helping others", "Proving yourself", "Finding meaning"], screen_number: 4, allow_other: false },

    // Screen 5: Relationships, Trust, Fears & Vulnerabilities (Q28 - Q35)
    { id: 28, question_text: "In relationships, you are:", question_type: "single_choice", options_json: ["Independent", "Emotionally connected", "Both", "Unsure"], screen_number: 5, allow_other: false },
    { id: 29, question_text: "When someone hurts you, you:", question_type: "single_choice", options_json: ["Forgive quickly", "Take time", "Hold grudges", "Cut them off"], screen_number: 5, allow_other: false },
    { id: 30, question_text: "Do you naturally trust people?", question_type: "single_choice", options_json: ["Yes", "Slowly", "Rarely", "No"], screen_number: 5, allow_other: false },
    { id: 31, question_text: "What do you fear losing the most?", question_type: "single_choice", options_json: ["Loved ones", "Freedom", "Stability", "Respect", "Identity"], screen_number: 5, allow_other: false },
    { id: 32, question_text: "What do people misunderstand about you the most?", question_type: "single_choice", options_json: ["My intentions", "My emotions", "My personality", "My goals", "My boundaries"], screen_number: 5, allow_other: false },
    { id: 33, question_text: "What is a weakness you rarely talk about?", question_type: "text", options_json: null, screen_number: 5, allow_other: false },
    { id: 34, question_text: "What behavior from others hurts you the most?", question_type: "single_choice", options_json: ["Criticism", "Ignoring", "Controlling behavior", "Lies", "Lack of appreciation"], screen_number: 5, allow_other: false },
    { id: 35, question_text: "In relationships, do you fear:", question_type: "single_choice", options_json: ["Losing people", "Being controlled", "Both", "Neither"], screen_number: 5, allow_other: false }
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
            // Check if user is already signed in
            const { data: { session } } = await supabase.auth.getSession()

            if (session) {
                // User is signed in, check if they've completed onboarding (must have generated personality)
                const { data: profile } = await supabase
                    .from('personality_profiles')
                    .select('personality_json')
                    .eq('user_id', session.user.id)
                    .single()

                // If profile exists AND has personality data, they've completed onboarding
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
            const result: any = await Promise.race([
                api.getQuestions(),
                timeoutPromise
            ])
            if (result?.questions && result.questions.length >= 20) {
                // Guard against wiping in-flight user answers
                setAnswers(currentAnswers => {
                    if (Object.keys(currentAnswers).length === 0) {
                        setQuestions(result.questions)
                    }
                    return currentAnswers
                })
            }
        } catch (error) {
            console.warn('Using authentic embedded 35-question dataset:', error)
            // DEFAULT_FALLBACK_QUESTIONS already in state
        }
    }

    const currentQuestions = questions.filter(q => q.screen_number === currentScreen)

    function handleAnswer(questionId: number, selectedOption: string, isOther: boolean = false) {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                question_id: questionId,
                selected_option: isOther ? 'Other' : selectedOption,
                answer_text: isOther ? (otherTextInputs[questionId] || '') : null
            }
        }))
    }

    function handleOtherText(questionId: number, text: string) {
        setOtherTextInputs(prev => ({ ...prev, [questionId]: text }))

        // Update answer if "Other" is already selected
        if (answers[questionId]?.selected_option === 'Other') {
            setAnswers(prev => ({
                ...prev,
                [questionId]: {
                    ...prev[questionId],
                    answer_text: text
                }
            }))
        }
    }

    function handleTextAnswer(questionId: number, text: string) {
        setAnswers(prev => ({
            ...prev,
            [questionId]: {
                question_id: questionId,
                selected_option: 'text', // Per spec: text questions store with selected="text"
                answer_text: text
            }
        }))
    }

    function handleMultiSelect(questionId: number, option: string, selected: boolean) {
        setMultiSelectAnswers(prev => {
            const current = new Set(prev[questionId] || [])
            if (selected) {
                current.add(option)
            } else {
                current.delete(option)
            }
            const updated = { ...prev, [questionId]: current }

            // Sync to answers map as comma-separated for API submission
            if (current.size > 0) {
                setAnswers(a => ({
                    ...a,
                    [questionId]: {
                        question_id: questionId,
                        selected_option: Array.from(current).join(', '),
                        answer_text: null
                    }
                }))
            } else {
                setAnswers(a => {
                    const { [questionId]: _, ...rest } = a
                    return rest
                })
            }

            return updated
        })
    }

    function canProgress() {
        // Check if all questions on current screen are answered
        return currentQuestions.every(q => {
            const answer = answers[q.id]
            if (!answer) return false

            if (q.question_type === 'text' || q.question_type === 'number') {
                // For text/number questions: require text input
                return answer.answer_text && answer.answer_text.trim().length > 0
            }

            if (q.question_type === 'multiple_select') {
                // For multi-select: require at least one selection
                const selections = multiSelectAnswers[q.id]
                return selections != null && selections.size > 0
            }

            // For single_choice questions
            if (!answer.selected_option) return false

            // If "Other" is selected, require text input
            if (answer.selected_option === 'Other') {
                return answer.answer_text && answer.answer_text.trim().length > 0
            }

            // Default options: immediately valid
            return true
        })
    }

    async function handleNext() {
        if (currentScreen < totalScreens) {
            setCurrentScreen(prev => prev + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } else {
            // All questions answered
            // Check if user already has an active session
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
            case 1: return "Let's get to know you"
            case 2: return 'Your personality'
            case 3: return 'Your mindset'
            case 4: return 'Your values & lifestyle'
            case 5: return 'Your goals & decisions'
            default: return 'Tell us about yourself'
        }
    }

    function handleBack() {
        if (currentScreen > 1) {
            setCurrentScreen(prev => prev - 1)
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

            // Defensive check: Ensure public.users profile exists before inserting answers
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', userId)
                        .maybeSingle()
                    if (profile) break
                } catch (e) {
                    // ignore and retry
                }
                await new Promise(r => setTimeout(r, 200 * (attempt + 1)))
            }

            // Format answers for API
            const formattedAnswers = Object.values(answers).map(answer => ({
                question_id: answer.question_id,
                selected_option: answer.selected_option || null,
                answer_text: answer.answer_text || null
            }))

            // Submit answers with retry
            let submitSuccess = false
            let lastSubmitError = null
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await api.submitAnswers(formattedAnswers, token)
                    submitSuccess = true
                    break
                } catch (err: any) {
                    lastSubmitError = err
                    console.warn(`submitAnswers attempt ${attempt + 1} failed:`, err.message)
                    await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
                }
            }

            if (!submitSuccess) {
                throw lastSubmitError || new Error('Failed to save assessment answers')
            }

            // Generate personality
            await api.generatePersonality(token)

            // Redirect to chat
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

            // 1. Create or authenticate Supabase account
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email: signupData.email,
                password: signupData.password,
                options: {
                    data: {
                        full_name: signupData.name
                    },
                    emailRedirectTo: window.location.origin + '/chat'
                }
            })

            if (signUpError) {
                // If user is already registered, sign in with their password
                if (signUpError.message?.toLowerCase().includes('already registered')) {
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: signupData.email,
                        password: signupData.password
                    })
                    if (signInError) {
                        throw new Error('This account already exists. Please verify your password or sign in directly.')
                    }
                    token = signInData?.session?.access_token || null
                    userId = signInData?.user?.id || null
                } else {
                    throw signUpError
                }
            } else {
                if (!authData.user) throw new Error('Failed to create account')

                if (!authData.session) {
                    setSignupError('Account created! Please check your email to confirm your account before signing in.')
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

            // 2. Defensive check: Ensure public.users profile exists (matching mobile app logic)
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', userId)
                        .maybeSingle()
                    if (profile) break
                } catch (e) {
                    // ignore and retry
                }
                await new Promise(r => setTimeout(r, 200 * (attempt + 1)))
            }

            // 3. Format answers for API
            const formattedAnswers = Object.values(answers).map(answer => ({
                question_id: answer.question_id,
                selected_option: answer.selected_option || null,
                answer_text: answer.answer_text || null
            }))

            // 4. Submit answers with retry
            let submitSuccess = false
            let lastSubmitError = null
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await api.submitAnswers(formattedAnswers, token)
                    submitSuccess = true
                    break
                } catch (err: any) {
                    lastSubmitError = err
                    console.warn(`submitAnswers attempt ${attempt + 1} failed:`, err.message)
                    await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
                }
            }

            if (!submitSuccess) {
                throw lastSubmitError || new Error('Failed to save assessment answers')
            }

            // 5. Generate personality
            await api.generatePersonality(token)

            // 6. Redirect to chat
            router.push('/chat')

        } catch (error: any) {
            console.error('Error submitting:', error)
            setSignupError(error.message || 'Failed to create your twin')
            setGenerating(false)
        } finally {
            setLoading(false)
        }
    }

    if (questions.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
                <Brain className="w-12 h-12 text-purple-400 mb-4 animate-pulse" />
                <h2 className="text-2xl font-bold mb-2">Preparing Reflection Assessment</h2>
                <p className="text-gray-400 mb-6 max-w-sm">Initializing cognitive assessment module...</p>
                <button
                    onClick={() => setQuestions(DEFAULT_FALLBACK_QUESTIONS)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium text-white transition-all shadow-lg"
                >
                    Start Reflection Now
                </button>
            </div>
        )
    }

    if (generating) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center"
                >
                    <div className="w-32 h-32 mx-auto mb-8 relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" />
                        <div className="absolute inset-4 bg-slate-900 rounded-full flex items-center justify-center">
                            <Brain className="w-12 h-12 text-purple-400 animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold mb-4">Building Your Digital Mind...</h2>
                    <p className="text-gray-400 max-w-md">
                        Our AI is analyzing your personality and creating your unique digital twin.
                        This might take a moment.
                    </p>
                </motion.div>
            </div>
        )
    }

    if (showSignup) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md"
                >
                    <div className="glass-card p-8">
                        <div className="text-center mb-8">
                            <img
                                src="/logo.png"
                                alt="TwinGenie Logo"
                                className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-lg shadow-purple-500/25 mb-4"
                            />
                            <h2 className="text-3xl font-bold mb-2">Create Your Account</h2>
                            <p className="text-gray-400">Just one more step to meet your digital twin</p>
                        </div>

                        {signupError && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">
                                {signupError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-300 ml-1 mb-2 block">Full Name</label>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="text"
                                        value={signupData.name}
                                        onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                                        placeholder="Enter your name"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-300 ml-1 mb-2 block">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="email"
                                        value={signupData.email}
                                        onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                                        placeholder="Enter your email"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-300 ml-1 mb-2 block">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                                    <input
                                        type="password"
                                        value={signupData.password}
                                        onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                                        placeholder="Choose a password (min 6 characters)"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={loading || !signupData.name || !signupData.email || !signupData.password || signupData.password.length < 6}
                                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                ) : (
                                    'Create Twin'
                                )}
                            </button>

                            <button
                                onClick={() => setShowSignup(false)}
                                disabled={loading}
                                className="w-full text-gray-400 hover:text-white text-sm py-2 transition-colors"
                            >
                                ← Back to questions
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        )
    }

    const progress = (currentScreen / totalScreens) * 100

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6">
            <div className="w-full max-w-3xl">
                {/* Progress */}
                <div className="mb-8">
                    <div className="flex justify-between text-sm text-gray-400 mb-2">
                        <span>Screen {currentScreen} of {totalScreens}</span>
                        <span>{Math.round(progress)}% complete</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                        />
                    </div>
                </div>

                {/* Questions */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentScreen}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="glass-card p-8 mb-6"
                    >
                        <h2 className="text-2xl font-bold mb-6">{getScreenTitle()}</h2>

                        <div className="space-y-8">
                            {currentQuestions.map((q) => (
                                <div key={q.id} className="space-y-3">
                                    <label className="block text-lg font-medium">
                                        {q.question_text}
                                    </label>

                                    {q.question_type === 'text' ? (
                                        // Text input for open-ended question
                                        <textarea
                                            value={answers[q.id]?.answer_text || ''}
                                            onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl 
                               focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 
                               outline-none transition-all resize-none"
                                            rows={3}
                                            placeholder="Share your thoughts..."
                                        />
                                    ) : q.question_type === 'number' ? (
                                        // Numeric input
                                        <input
                                            type="number"
                                            value={answers[q.id]?.answer_text || ''}
                                            onChange={(e) => handleTextAnswer(q.id, e.target.value)}
                                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl 
                               focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 
                               outline-none transition-all"
                                            placeholder="Enter a number..."
                                        />
                                    ) : q.question_type === 'multiple_select' ? (
                                        // Checkboxes for multi-select
                                        <div className="space-y-2">
                                            {q.options_json?.map((option) => {
                                                const isSelected = multiSelectAnswers[q.id]?.has(option) ?? false
                                                return (
                                                    <label
                                                        key={option}
                                                        className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer
                                ${isSelected
                                                                ? 'border-purple-500 bg-purple-500/10'
                                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={(e) => handleMultiSelect(q.id, option, e.target.checked)}
                                                            className="mr-3 w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
                                                        />
                                                        <span className="text-base">{option}</span>
                                                        {isSelected && (
                                                            <svg className="ml-auto w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </label>
                                                )
                                            })}

                                            {/* "Other" option for multi-select */}
                                            {q.allow_other && (() => {
                                                const isOtherSelected = multiSelectAnswers[q.id]?.has('Other') ?? false
                                                return (
                                                    <div className="space-y-2">
                                                        <label
                                                            className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer
                                  ${isOtherSelected
                                                                    ? 'border-purple-500 bg-purple-500/10'
                                                                    : 'border-white/10 bg-white/5 hover:border-white/20'
                                                                }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isOtherSelected}
                                                                onChange={(e) => handleMultiSelect(q.id, 'Other', e.target.checked)}
                                                                className="mr-3 w-5 h-5 text-purple-600 focus:ring-purple-500 rounded"
                                                            />
                                                            <span className="text-base">Other</span>
                                                        </label>

                                                        {isOtherSelected && (
                                                            <motion.input
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                type="text"
                                                                value={otherTextInputs[q.id] || ''}
                                                                onChange={(e) => handleOtherText(q.id, e.target.value)}
                                                                placeholder="Please specify..."
                                                                className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl 
                                       focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 
                                       outline-none transition-all ml-8"
                                                            />
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    ) : (
                                        // Radio buttons for single choice
                                        <div className="space-y-2">
                                            {q.options_json?.map((option) => (
                                                <label
                                                    key={option}
                                                    className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer
                            ${answers[q.id]?.selected_option === option
                                                            ? 'border-purple-500 bg-purple-500/10'
                                                            : 'border-white/10 bg-white/5 hover:border-white/20'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`question-${q.id}`}
                                                        value={option}
                                                        checked={answers[q.id]?.selected_option === option}
                                                        onChange={() => handleAnswer(q.id, option)}
                                                        className="mr-3 w-5 h-5 text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <span className="text-base">{option}</span>
                                                </label>
                                            ))}

                                            {/* "Other" option */}
                                            {q.allow_other && (
                                                <div className="space-y-2">
                                                    <label
                                                        className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer
                              ${answers[q.id]?.selected_option === 'Other'
                                                                ? 'border-purple-500 bg-purple-500/10'
                                                                : 'border-white/10 bg-white/5 hover:border-white/20'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`question-${q.id}`}
                                                            value="Other"
                                                            checked={answers[q.id]?.selected_option === 'Other'}
                                                            onChange={() => handleAnswer(q.id, 'Other', true)}
                                                            className="mr-3 w-5 h-5 text-purple-600 focus:ring-purple-500"
                                                        />
                                                        <span className="text-base">Other</span>
                                                    </label>

                                                    {answers[q.id]?.selected_option === 'Other' && (
                                                        <motion.input
                                                            initial={{ opacity: 0, height: 0 }}
                                                            animate={{ opacity: 1, height: 'auto' }}
                                                            type="text"
                                                            value={otherTextInputs[q.id] || ''}
                                                            onChange={(e) => handleOtherText(q.id, e.target.value)}
                                                            placeholder="Please specify..."
                                                            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl 
                                       focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 
                                       outline-none transition-all ml-8"
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

                {/* Navigation */}
                <div className="flex justify-between gap-4">
                    <button
                        onClick={handleBack}
                        disabled={currentScreen === 1}
                        className="glass-button disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Back
                    </button>

                    <button
                        onClick={handleNext}
                        disabled={loading || !canProgress()}
                        className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl 
                     font-semibold disabled:opacity-50 disabled:cursor-not-allowed
                     hover:scale-105 transition-transform flex items-center gap-2"
                    >
                        {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                        {currentScreen === totalScreens ? 'Create My Twin' : 'Next'}
                        {currentScreen < totalScreens && <ChevronRight className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </div>
    )
}
