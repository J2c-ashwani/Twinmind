'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import api from '@/lib/api'
import { Send, Loader2, Menu, User as UserIcon, Crown, Smile, LayoutDashboard, Mic, Bot } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatMessage, TwinMode } from '@/lib/types'
import dynamic from 'next/dynamic'
import VoiceRecorder from '@/components/Voice/VoiceRecorder'
import { Theme } from 'emoji-picker-react'
import ChatSidebar from '@/components/Chat/ChatSidebar'
import ReactMarkdown from 'react-markdown'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

function ChatContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [currentMode, setCurrentMode] = useState('normal')
    const [modes, setModes] = useState<TwinMode[]>([])
    const [twinName, setTwinName] = useState('Your Twin')
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        loadData()
    }, [])

    // Sync URL with conversation ID
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
            let token = '';
            const { data: { session } } = await supabase.auth.getSession()

            if (session) {
                token = session.access_token
            }

            if (!token) {
                router.push('/login')
                return
            }

            // Load personality profile
            try {
                const { personality } = await api.getPersonalityProfile(token)
                setTwinName(personality.twin_name || 'Your Twin')
            } catch (error) {
                console.log('Using default twin name')
                setTwinName('Your Twin')
            }

            // Load available modes
            try {
                const { modes: availableModes } = await api.getModes(token)
                setModes(availableModes)
            } catch (error) {
                console.log('Using fallback modes')
                const fallbackModes = [
                    { id: 'normal', name: 'Normal Twin', description: 'Your authentic digital twin', available: true },
                    { id: 'future', name: 'Future Twin', description: '5 years wiser', available: true, requiresPro: true },
                    { id: 'dark', name: 'Dark Twin', description: 'Brutally honest', available: true, requiresPro: true },
                    { id: 'therapist', name: 'Therapist Twin', description: 'Compassionate healing', available: true }
                ]
                setModes(fallbackModes)
            }

            // Check URL for conversation ID
            const urlId = searchParams.get('id')
            if (urlId) {
                setCurrentConversationId(urlId)
                try {
                    const { history } = await api.getChatHistory(token, undefined, urlId)
                    setMessages(history)
                } catch (error) {
                    console.log('Failed to load conversation from URL')
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
            user_id: '', // Will be set by backend
            message: input,
            sender: 'user',
            mode: currentMode,
            created_at: new Date().toISOString()
        }

        setMessages(prev => [...prev, userMessage])
        setInput('')
        setLoading(true)
        setShowEmojiPicker(false)

        try {
            let token = '';
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                token = session.access_token;
            } else {
                // No valid session, redirect to login
                router.push('/login');
                return;
            }

            const response = await api.sendMessage(userMessage.message, currentMode, token, currentConversationId || undefined)

            if (response.conversation_id) {
                setCurrentConversationId(response.conversation_id)
            }

            // Extract the actual message text from nested response
            let messageText = '';
            if (typeof response === 'string') {
                messageText = response;
            } else if (response.message) {
                // Check if message.message exists (nested)
                messageText = typeof response.message === 'string'
                    ? response.message
                    : (response.message.message || JSON.stringify(response));
            } else {
                messageText = JSON.stringify(response);
            }

            const aiMessage: ChatMessage = {
                id: Date.now().toString(),
                user_id: '',
                message: messageText,
                sender: 'ai',
                mode: currentMode,
                created_at: new Date().toISOString()
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setLoading(false)
        }
    }

    const onEmojiClick = (emojiData: any) => {
        setInput(prev => prev + emojiData.emoji);
    };

    const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
        setShowVoiceRecorder(false);

        const voiceMessage: ChatMessage = {
            id: Date.now().toString(),
            user_id: '',
            message: `🎤 Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
            sender: 'user',
            mode: currentMode,
            created_at: new Date().toISOString()
        };

        setMessages(prev => [...prev, voiceMessage]);
        setLoading(true);

        try {
            let token = '';
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                token = session.access_token;
            } else {
                // No valid session, redirect to login
                router.push('/login');
                return;
            }

            const response = await api.sendMessage(
                "[User sent a voice message]",
                currentMode,
                token,
                currentConversationId || undefined
            );

            if (response.conversation_id) {
                setCurrentConversationId(response.conversation_id)
            }

            const aiMessage: ChatMessage = {
                id: Date.now().toString(),
                user_id: '',
                message: response.message,
                sender: 'ai',
                mode: currentMode,
                created_at: new Date().toISOString()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Failed to send voice message:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setCurrentConversationId(null);
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const selectConversation = async (id: string) => {
        setCurrentConversationId(id);
        if (window.innerWidth < 768) setIsSidebarOpen(false);

        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { history } = await api.getChatHistory(session.access_token, undefined, id);
                setMessages(history);
            }
        } catch (error) {
            console.error('Failed to load conversation history:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#0F0F1E] overflow-hidden">
            {/* Sidebar */}
            <ChatSidebar
                currentConversationId={currentConversationId}
                onSelectConversation={selectConversation}
                onNewChat={handleNewChat}
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
            />

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Header */}
                <div className="h-16 border-b border-white/10 bg-black/20 backdrop-blur-md flex items-center justify-between px-6 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                            title="Toggle History"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${currentMode === 'normal' ? 'bg-green-500' :
                                currentMode === 'future' ? 'bg-blue-500' :
                                    currentMode === 'therapist' ? 'bg-purple-500' : 'bg-red-500'
                                }`} />
                            <span className="text-white font-medium capitalize">{currentMode} Twin</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <select
                            value={currentMode}
                            onChange={(e) => setCurrentMode(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-white focus:outline-none focus:border-purple-500"
                        >
                            <option value="normal">Normal Twin</option>
                            <option value="future">Future Twin</option>
                            <option value="therapist">Therapist Twin</option>
                            <option value="dark">Dark Twin</option>
                        </select>

                        <button
                            onClick={() => router.push('/dashboard')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                            title="Dashboard"
                        >
                            <LayoutDashboard className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => router.push('/profile')}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                            title="Profile"
                        >
                            <UserIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {messages.length === 0 && !loading && (
                        <div className="flex flex-col items-center justify-center h-full text-white/30">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Bot className="w-8 h-8 opacity-50" />
                            </div>
                            <p>Start a conversation with your AI Twin</p>
                        </div>
                    )}

                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex gap-3 max-w-[80%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-purple-600' : 'bg-blue-600'
                                    }`}>
                                    {msg.sender === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
                                </div>
                                <div className={`p-4 rounded-2xl ${msg.sender === 'user'
                                    ? 'bg-purple-600/20 border border-purple-500/30 text-white'
                                    : 'bg-white/5 border border-white/10 text-gray-200'
                                    }`}>
                                    <div className="prose prose-invert max-w-none text-sm">
                                        <ReactMarkdown>
                                            {(() => {
                                                try {
                                                    if (msg.message.trim().startsWith('{') && msg.message.trim().endsWith('}')) {
                                                        const parsed = JSON.parse(msg.message);
                                                        return parsed.message || msg.message;
                                                    }
                                                } catch (e) { }
                                                return msg.message;
                                            })()}
                                        </ReactMarkdown>
                                    </div>
                                    <div className="text-[10px] opacity-50 mt-2">
                                        {new Date(msg.created_at).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {loading && (
                        <div className="flex justify-start">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100" />
                                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-200" />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-black/20 backdrop-blur-md border-t border-white/10">
                    <div className="max-w-4xl mx-auto relative">
                        {showEmojiPicker && (
                            <div className="absolute bottom-20 left-0 z-50">
                                <EmojiPicker
                                    onEmojiClick={onEmojiClick}
                                    theme={Theme.DARK}
                                    width={300}
                                    height={400}
                                />
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-2">
                            <button
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
                            >
                                <Smile className="w-5 h-5" />
                            </button>

                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Type a message..."
                                className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-white/30"
                                disabled={loading}
                            />

                            <button
                                onClick={() => setShowVoiceRecorder(true)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
                            >
                                <Mic className="w-5 h-5" />
                            </button>

                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || loading}
                                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Voice Recorder Modal */}
                {showVoiceRecorder && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="max-w-md w-full">
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
        <Suspense fallback={<div className="flex items-center justify-center h-screen bg-black text-white">Loading chat...</div>}>
            <ChatContent />
        </Suspense>
    )
}
