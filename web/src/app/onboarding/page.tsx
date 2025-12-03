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

export default function OnboardingPage() {
    const router = useRouter()
    const [currentScreen, setCurrentScreen] = useState(1)
    const [questions, setQuestions] = useState<Question[]>([])
    const [answers, setAnswers] = useState<Record<number, Answer>>({})
    const [otherTextInputs, setOtherTextInputs] = useState<Record<number, string>>({})
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
                // User is signed in, check if they've completed onboarding
                const { data: profile } = await supabase
                    .from('personality_profiles')
                    .select('user_id')
                    .eq('user_id', session.user.id)
                    .single()

                // If profile exists, they've already completed onboarding
                if (profile) {
                    router.push('/chat')
                }
                // If no profile, they need to complete onboarding but don't need signup form
            }
        } catch (error) {
            console.error('Error checking profile:', error)
        }
    }

    async function loadQuestions() {
        try {
            const { questions: qs } = await api.getQuestions()
            setQuestions(qs)
        } catch (error) {
            console.error('Failed to load questions:', error)
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

    function canProgress() {
        // Check if all questions on current screen are answered
        return currentQuestions.every(q => {
            const answer = answers[q.id]
            if (!answer) return false

            if (q.question_type === 'text') {
                // For text questions: require text input
                return answer.answer_text && answer.answer_text.trim().length > 0
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
            // First, sign out any existing session to ensure clean signup
            await supabase.auth.signOut()

            // Now show signup form for new account
            setShowSignup(true)
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

            // Format answers for API
            const formattedAnswers = Object.values(answers).map(answer => ({
                question_id: answer.question_id,
                selected_option: answer.selected_option,
                answer_text: answer.answer_text
            }))

            // Submit answers
            await api.submitAnswers(formattedAnswers, token)

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
            // Create Supabase account
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

            if (signUpError) throw signUpError
            if (!authData.user) throw new Error('Failed to create account')

            // Check if we have a session (email confirmation might be required)
            if (!authData.session) {
                setSignupError('Account created! Please check your email to confirm your account before signing in.')
                setLoading(false)
                setGenerating(false)
                // Redirect to login after 3 seconds
                setTimeout(() => router.push('/login'), 3000)
                return
            }

            const token = authData.session.access_token

            // Note: User profile in public.users table is created automatically 
            // by the database trigger (handle_new_user function)

            // Format answers for API
            const formattedAnswers = Object.values(answers).map(answer => ({
                question_id: answer.question_id,
                selected_option: answer.selected_option,
                answer_text: answer.answer_text
            }))

            // Submit answers
            await api.submitAnswers(formattedAnswers, token)

            // Generate personality
            await api.generatePersonality(token)

            // Redirect to chat
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
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
                            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-4">
                                <Brain className="w-8 h-8 text-white" />
                            </div>
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
                        <h2 className="text-2xl font-bold mb-6">Tell us about yourself</h2>

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
                        disabled={loading}
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
