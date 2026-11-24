'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import api from '@/lib/api'
import { apiClient } from '@/lib/api/client'
import { Send, Menu, User as UserIcon, Smile, LayoutDashboard, Mic } from 'lucide-react'
import { motion } from 'framer-motion'
import type { ChatMessage, TwinMode } from '@/lib/types'
import dynamic from 'next/dynamic'
import VoiceRecorder from '@/components/Voice/VoiceRecorder'
import { Theme } from 'emoji-picker-react'
import ChatSidebar from '@/components/Chat/ChatSidebar'
import ReactMarkdown from 'react-markdown'
import { BrandEmblem } from '@/components/Layout/BrandMark'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

function ChatContent() {
    const router = useRouter()
    const supabase = createClientComponentClient()
    const searchParams = useSearchParams()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [currentMode, setCurrentMode] = useState('normal')
    const [modes, setModes] = useState<TwinMode[]>([])
    const [twinName, setTwinName] = useState('Your Twin')
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
    const [isProcessingVoice, setIsProcessingVoice] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        if (currentConversationId) {
            const params = new URLSearchParams(searchParams.toString())
            params.set('id', currentConversationId)
            router.replace(`/chat?${params.toString()}`)
        } else {
            router.replace('/chat')
        }
    }, [currentConversationId, router, searchParams])

    async function loadData() {
        try {
            let token = ''
            const {
                data: { session },
            } = await supabase.auth.getSession()

            if (session) {
                token = session.access_token
                apiClient.setToken(token)
            }

            if (!token) {
                router.push('/login')
                return
            }

            try {
                const { personality } = await api.getPersonalityProfile(token)
                setTwinName(personality.twin_name || 'Your Twin')
            } catch {
                setTwinName('Your Twin')
            }

            try {
                const { modes: availableModes } = await api.getModes(token)
                setModes(availableModes)
            } catch {
                setModes([
                    { id: 'normal', name: 'Normal Twin', description: 'Your authentic digital twin', available: true },
                    { id: 'future', name: 'Future Twin', description: '5 years wiser', available: true, requiresPro: true },
                    { id: 'dark', name: 'Honest Twin', description: 'Zero sycophancy', available: true, requiresPro: true },
                    { id: 'therapist', name: 'Reflective Coach', description: 'Socratic emotional clarity', available: true },
                ])
            }

            const urlId = searchParams.get('id')
            if (urlId) {
                setCurrentConversationId(urlId)
                try {
                    const { history } = await api.getChatHistory(token, undefined, urlId)
                    setMessages(history)
                    if (history && history.length > 0) {
                        const lastMsg = history[history.length - 1]
                        if (lastMsg.mode && ['normal', 'future', 'dark', 'therapist'].includes(lastMsg.mode)) {
                            setCurrentMode(lastMsg.mode)
                        }
                    }
                } catch {
                    setMessages([])
                    setCurrentConversationId(null)
                }
            } else {
                setMessages([])
                setCurrentConversationId(null)
            }
        } catch (error) {
            console.error('Error loading data:', error)
        }
    }

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            user_id: '',
            message: input,
            sender: 'user',
            mode: currentMode,
            created_at: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, userMessage])
        setInput('')
        setLoading(true)
        setShowEmojiPicker(false)

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            const token = session?.access_token || ''
            if (!token) {
                router.push('/login')
                return
            }

            const response = await api.sendMessage(
                userMessage.message,
                currentMode,
                token,
                currentConversationId || undefined
            )

            if (response.conversation_id) {
                setCurrentConversationId(response.conversation_id)
            }

            const extractMessage = (obj: any): string => {
                if (typeof obj === 'string') return obj
                if (!obj) return ''
                if (obj.text) return extractMessage(obj.text)
                if (obj.content) return extractMessage(obj.content)
                if (obj.response) return extractMessage(obj.response)
                if (obj.message) return extractMessage(obj.message)
                if (obj.reply) return extractMessage(obj.reply)
                const str = String(obj)
                return str === '[object Object]' ? JSON.stringify(obj) : str
            }

            const aiMessage: ChatMessage = {
                id: Date.now().toString(),
                user_id: '',
                message: extractMessage(response),
                sender: 'ai',
                mode: currentMode,
                created_at: new Date().toISOString(),
            }

            setMessages((prev) => [...prev, aiMessage])
        } catch (error: any) {
            console.error('Failed to send message:', error)
            const errorMessage = error?.message || String(error)
            const isLimitError = errorMessage.includes('limit reached') || errorMessage.includes('429')

            let resetTimeMessage = ''
            try {
                const res = await fetch(error?.config?.url || '')
                const data = await res.json().catch(() => ({}))
                if (data.resetTime) {
                    const hoursLeft = Math.ceil((new Date(data.resetTime).getTime() - Date.now()) / 3600000)
                    resetTimeMessage = `\n\nLimit resets in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.`
                }
            } catch {
                resetTimeMessage = '\n\nLimit resets at midnight.'
            }

            const errorAiMessage: ChatMessage = {
                id: Date.now().toString(),
                user_id: '',
                message: isLimitError
                    ? `**Daily message limit reached.**\n\nYou have used your free daily allowance.${resetTimeMessage}\n\n[View Upgrade Options →](/subscription)`
                    : "Sorry, I couldn't process that message. Please try again.",
                sender: 'ai',
                mode: currentMode,
                created_at: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, errorAiMessage])
        } finally {
            setLoading(false)
        }
    }

    const onEmojiClick = (emojiData: any) => {
        setInput((prev) => prev + emojiData.emoji)
    }

    const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
        setIsProcessingVoice(true)
        setShowVoiceRecorder(false)

        const optimisticId = Date.now().toString()
        const voiceMessage: ChatMessage = {
            id: optimisticId,
            user_id: '',
            message: `Voice reflection (${Math.floor(duration / 60)}:${(duration % 60)
                .toString()
                .padStart(2, '0')})`,
            sender: 'user',
            mode: currentMode,
            created_at: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, voiceMessage])
        setLoading(true)

        try {
            const {
                data: { session },
            } = await supabase.auth.getSession()
            const token = session?.access_token || ''
            if (!token) {
                router.push('/login')
                return
            }

            const response = await api.sendVoiceMessage(currentConversationId, audioBlob, currentMode, token)

            if (response.conversationId || response.conversation_id) {
                setCurrentConversationId(response.conversationId || response.conversation_id)
            }

            if (response.userMessage || response.userAudioUrl) {
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === optimisticId
                            ? {
                                  ...msg,
                                  message: response.userMessage || msg.message,
                                  audio_url: response.userAudioUrl,
                              }
                            : msg
                    )
                )
            }

            setMessages((prev) => [
                ...prev,
                {
                    id: (Date.now() + 1).toString(),
                    user_id: '',
                    message: response.aiResponse,
                    sender: 'ai',
                    mode: currentMode,
                    created_at: new Date().toISOString(),
                    audio_url: response.audioUrl,
                },
            ])
        } catch (error: any) {
            console.error('Failed to send voice message:', error)
            const errorMessage = error?.message || String(error)
            const isLimitError = errorMessage.includes('limit reached') || errorMessage.includes('429')
            setMessages((prev) => [
                ...prev,
                {
                    id: Date.now().toString(),
                    user_id: '',
                    message: isLimitError
                        ? '**Daily voice limit reached.** Upgrade for unlimited voice sessions.\n\n[View Plans →](/subscription)'
                        : "Sorry, I couldn't process that voice message.",
                    sender: 'ai',
                    mode: currentMode,
                    created_at: new Date().toISOString(),
                },
            ])
        } finally {
            setLoading(false)
            setIsProcessingVoice(false)
        }
    }

    const handleNewChat = () => {
        setMessages([])
        setCurrentConversationId(null)
        if (window.innerWidth < 768) setIsSidebarOpen(false)
    }

    const selectConversation = async (id: string) => {
        setCurrentConversationId(id)
        if (window.innerWidth < 768) setIsSidebarOpen(false)

        try {
            setLoading(true)
            const {
                data: { session },
            } = await supabase.auth.getSession()
            if (session) {
                const { history } = await api.getChatHistory(session.access_token, undefined, id)
                setMessages(history)
                if (history && history.length > 0) {
                    const lastMsg = history[history.length - 1]
                    if (lastMsg.mode && ['normal', 'future', 'dark', 'therapist'].includes(lastMsg.mode)) {
                        setCurrentMode(lastMsg.mode)
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load conversation history:', error)
        } finally {
            setLoading(false)
        }
    }

    const modeBadgeColor =
        currentMode === 'normal'
            ? 'bg-sky-400'
            : currentMode === 'future'
            ? 'bg-[#D9A760]'
            : currentMode === 'therapist'
            ? 'bg-emerald-400'
            : 'bg-rose-400'

    return (
        <div className="flex h-screen overflow-hidden bg-[#07080B] text-[#F4F2EC]">
            <ChatSidebar
                currentConversationId={currentConversationId}
                onSelectConversation={selectConversation}
                onNewChat={handleNewChat}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            <div className="relative flex h-full flex-1 flex-col">
                <header className="z-10 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#0B0D12]/90 px-4 backdrop-blur-xl sm:px-6">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                            title="Toggle History"
                        >
                            <Menu className="h-4 w-4" />
                        </button>
                        <div className="flex items-center gap-2.5">
                            <span className={`h-2.5 w-2.5 rounded-full ${modeBadgeColor}`} />
                            <span className="text-sm font-semibold text-[#F4F2EC]">
                                {twinName}
                            </span>
                            <span className="hidden rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase text-neutral-400 sm:inline">
                                {currentMode} mode
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <select
                            value={currentMode}
                            onChange={(e) => setCurrentMode(e.target.value)}
                            className="rounded-lg border border-white/[0.12] bg-[#10131A] px-3 py-1.5 text-xs font-medium text-[#F4F2EC] focus:border-[#D9A760]/60 focus:outline-none"
                        >
                            {modes.length > 0 ? (
                                modes.map((m) => (
                                    <option key={m.id} value={m.id}>
                                        {m.name}
                                    </option>
                                ))
                            ) : (
                                <>
                                    <option value="normal">Normal Twin</option>
                                    <option value="future">Future Twin</option>
                                    <option value="therapist">Reflective Coach</option>
                                    <option value="dark">Honest Twin</option>
                                </>
                            )}
                        </select>

                        <button
                            type="button"
                            onClick={() => router.push('/dashboard')}
                            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-neutral-400 transition-colors hover:text-white"
                            title="Dashboard"
                        >
                            <LayoutDashboard className="h-4 w-4" />
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push('/profile')}
                            className="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-neutral-400 transition-colors hover:text-white"
                            title="Profile"
                        >
                            <UserIcon className="h-4 w-4" />
                        </button>
                    </div>
                </header>

                <div className="custom-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-6 sm:px-6">
                    {messages.length === 0 && !loading && (
                        <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center text-center">
                            <BrandEmblem size="lg" />
                            <h2 className="mt-5 text-lg font-semibold text-[#F4F2EC]">
                                Calibrated Reflection Console
                            </h2>
                            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                                Select one of your four perspectives above—Normal, Future, Honest, or Reflective
                                Coach—and begin your session.
                            </p>
                        </div>
                    )}

                    <div className="mx-auto max-w-4xl space-y-5">
                        {messages.map((msg) => (
                            <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`flex max-w-[84%] gap-3 ${
                                        msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                                    }`}
                                >
                                    <div
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                            msg.sender === 'user'
                                                ? 'border-[#D9A760]/40 bg-[#D9A760]/15 text-[#E7C891]'
                                                : 'border-white/10 bg-[#10131A] text-neutral-300'
                                        }`}
                                    >
                                        {msg.sender === 'user' ? (
                                            <UserIcon className="h-3.5 w-3.5" />
                                        ) : (
                                            <span className="font-mono text-[10px] font-bold">TG</span>
                                        )}
                                    </div>
                                    <div
                                        className={`rounded-2xl px-4 py-3 text-sm ${
                                            msg.sender === 'user'
                                                ? 'border border-[#D9A760]/30 bg-[#181C26] text-[#F4F2EC]'
                                                : 'border border-white/[0.08] bg-[#0D1016] text-neutral-200'
                                        }`}
                                    >
                                        <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                                            <ReactMarkdown>
                                                {(() => {
                                                    try {
                                                        if (
                                                            msg.message.trim().startsWith('{') &&
                                                            msg.message.trim().endsWith('}')
                                                        ) {
                                                            const parsed = JSON.parse(msg.message)
                                                            return parsed.message || msg.message
                                                        }
                                                    } catch {}
                                                    return msg.message
                                                })()}
                                            </ReactMarkdown>
                                        </div>
                                        {msg.audio_url && (
                                            <div className="my-2">
                                                <audio controls src={msg.audio_url} className="h-8 w-full" />
                                            </div>
                                        )}
                                        <div className="mt-2 font-mono text-[10px] text-neutral-500">
                                            {new Date(msg.created_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}

                        {isProcessingVoice && (
                            <div className="enterprise-panel flex w-fit items-center gap-3 px-4 py-3 text-xs text-neutral-300">
                                <span className="h-2 w-2 animate-ping rounded-full bg-rose-400" />
                                <span>Transcribing and processing voice reflection...</span>
                            </div>
                        )}

                        {!isProcessingVoice && loading && (
                            <div className="enterprise-panel flex w-fit items-center gap-1.5 px-4 py-3">
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D9A760] [animation-delay:-0.3s]" />
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D9A760] [animation-delay:-0.15s]" />
                                <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D9A760]" />
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                </div>

                <div className="border-t border-white/[0.08] bg-[#0B0D12]/90 p-4 backdrop-blur-xl">
                    <div className="relative mx-auto max-w-4xl">
                        {showEmojiPicker && (
                            <div className="absolute bottom-16 left-0 z-50">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    theme={Theme.DARK}
                                    width={300}
                                    height={380}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#07080B] p-2">
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-white"
                            >
                                <Smile className="h-4 w-4" />
                            </button>

                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Reflect on a decision, pattern, or thought..."
                                className="flex-1 border-none bg-transparent px-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-0"
                                disabled={loading}
                            />

                            <button
                                type="button"
                                onClick={() => setShowVoiceRecorder(true)}
                                className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-white/[0.06] hover:text-white"
                            >
                                <Mic className="h-4 w-4" />
                            </button>

                            <button
                                type="button"
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="btn-primary-ivory rounded-lg px-3.5 py-2 text-xs disabled:opacity-40"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {showVoiceRecorder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md">
                            <VoiceRecorder
                                onSend={handleVoiceSend}
                                onCancel={() => setShowVoiceRecorder(false)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default function ChatPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-[#07080B] font-mono text-xs text-neutral-400">
                    Loading Twin Console...
                </div>
            }
        >
            <ChatContent />
        </Suspense>
    )
}
