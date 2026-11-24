'use client'

import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { apiClient } from '@/lib/api/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, CheckCircle, ChevronLeft, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

export default function CoachingSessionPage() {
    const params = useParams()
    const router = useRouter()
    const [session, setSession] = useState<any>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [showExercise, setShowExercise] = useState(false)
    const [error, setError] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (params.id) {
            startSession()
        }
    }, [params.id])

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const startSession = async () => {
        try {
            setError('')
            const supabase = createClientComponentClient()
            const {
                data: { session: authSession },
            } = await supabase.auth.getSession()
            if (!authSession?.access_token) {
                router.push('/login')
                return
            }
            apiClient.setToken(authSession.access_token)

            await apiClient.startProgram(params.id as string)
            const data = await apiClient.getSession(params.id as string)
            setSession(data)

            if ((data as any)?.session_history && (data as any).session_history.length > 0) {
                setMessages(
                    (data as any).session_history.map((m: any, idx: number) => ({
                        role: m.sender_type === 'user' ? 'user' : 'ai',
                        content: m.content,
                        id: `hist-${idx}-${m.created_at || Date.now()}`,
                    }))
                )
            } else {
                setMessages([
                    {
                        role: 'ai',
                        content: (data as any).content?.initial_prompt || 'Welcome to your coaching session.',
                        id: 'init',
                    },
                ])
            }
        } catch (err) {
            console.error('Failed to start session:', err)
            setError(err instanceof Error ? err.message : 'Failed to start Life Coach session.')
        } finally {
            setLoading(false)
        }
    }

    const handleSend = async () => {
        if (!input.trim() || sending) return

        const userMsg = input
        setInput('')
        setSending(true)

        const newMessages = [...messages, { role: 'user', content: userMsg, id: Date.now().toString() }]
        setMessages(newMessages)

        try {
            const response = (await apiClient.sendSessionMessage(
                params.id as string,
                userMsg,
                newMessages.map((m) => ({ role: m.role, content: m.content }))
            )) as any

            setMessages((prev) => [
                ...prev,
                { role: 'ai', content: response.response, id: Date.now().toString() },
            ])
        } catch (err) {
            console.error('Failed to send message:', err)
        } finally {
            setSending(false)
        }
    }

    const handleComplete = async () => {
        const notes = prompt('Any reflection notes for today? (Optional)')
        if (notes === null) return

        try {
            await apiClient.completeSession(params.id as string, notes)
            router.push('/life-coach')
        } catch (err) {
            console.error('Failed to complete session:', err)
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#07080B]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D9A760] border-t-transparent" />
            </div>
        )
    }

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#07080B] p-6">
                <div className="enterprise-panel max-w-md border-rose-500/30 p-7 text-center">
                    <h1 className="text-lg font-semibold text-[#F4F2EC]">Session Unavailable</h1>
                    <p className="mt-2 text-sm text-neutral-400">
                        {error || 'This Life Coach program could not be opened.'}
                    </p>
                    <Link href="/life-coach" className="btn-primary-ivory mt-6 px-5 py-2.5 text-xs">
                        Back to Programs
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-screen flex-col bg-[#07080B] text-[#F4F2EC]">
            <header className="z-10 flex items-center justify-between border-b border-white/[0.08] bg-[#0B0D12] px-4 py-3.5 sm:px-6">
                <div className="flex items-center gap-3">
                    <Link
                        href="/life-coach"
                        className="rounded-lg border border-white/10 p-2 text-neutral-400 hover:bg-white/[0.05] hover:text-white"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <h1 className="text-sm font-semibold text-[#F4F2EC] sm:text-base">
                            Day {session.progress.current_day}: {session.content.title}
                        </h1>
                        <p className="font-mono text-[11px] text-[#E7C891]">Goal: {session.content.goal}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowExercise(!showExercise)}
                        className="btn-secondary-obsidian px-3 py-2 text-xs"
                        title="View Exercise"
                    >
                        <BookOpen className="h-4 w-4 text-[#D9A760]" />
                        <span className="hidden sm:inline">Exercise</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleComplete}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-[#07080B] transition-colors hover:bg-emerald-400"
                    >
                        <CheckCircle className="h-3.5 w-3.5" />
                        <span>Complete</span>
                    </button>
                </div>
            </header>

            <AnimatePresence>
                {showExercise && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-b border-[#D9A760]/25 bg-[#12100B]"
                    >
                        <div className="mx-auto max-w-4xl p-5">
                            <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                                Guided Protocol
                            </div>
                            <p className="mt-1.5 text-sm leading-relaxed text-neutral-200">
                                {session.content.exercise_instructions}
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
                <div className="mx-auto max-w-4xl space-y-4">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                                    msg.role === 'user'
                                        ? 'border border-[#D9A760]/30 bg-[#181C26] text-[#F4F2EC]'
                                        : 'border border-white/[0.08] bg-[#0D1016] text-neutral-200'
                                }`}
                            >
                                {msg.content}
                            </div>
                        </motion.div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="border-t border-white/[0.08] bg-[#0B0D12] p-4">
                <div className="mx-auto flex max-w-4xl gap-2.5">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Write your reflection..."
                        className="flex-1 rounded-xl border border-white/[0.12] bg-[#07080B] px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="btn-primary-ivory px-4 py-3 disabled:opacity-40"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
