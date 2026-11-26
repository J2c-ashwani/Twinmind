'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import api from '@/lib/api'
import { apiClient } from '@/lib/api/client'
import { flushPendingAttribution } from '@/lib/attribution'
import { Send, Loader2, Menu, User as UserIcon, Crown, Smile, LayoutDashboard, Mic, Bot } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ChatMessage, TwinMode } from '@/lib/types'
import dynamic from 'next/dynamic'
import VoiceRecorder from '@/components/Voice/VoiceRecorder'
import { Theme } from 'emoji-picker-react'
import ChatSidebar from '@/components/Chat/ChatSidebar'
import ReactMarkdown from 'react-markdown'

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

function normalizeMessageText(raw: any): string {
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (parsed?.message || parsed?.text || parsed?.content || parsed?.response) {
                    return normalizeMessageText(
                        parsed.message ?? parsed.text ?? parsed.content ?? parsed.response
                    );
                }
            } catch {
                // Return raw string when not valid JSON
            }
        }
        return raw;
    }
    if (!raw) return '';
    if (raw.text) return normalizeMessageText(raw.text);
    if (raw.content) return normalizeMessageText(raw.content);
    if (raw.response) return normalizeMessageText(raw.response);
    if (raw.message) return normalizeMessageText(raw.message);
    if (raw.reply) return normalizeMessageText(raw.reply);
    const str = String(raw);
    return str === '[object Object]' ? JSON.stringify(raw) : str;
}

function normalizeHistoryList(history: ChatMessage[] = []): ChatMessage[] {
    return history.map((msg) => ({
        ...msg,
        message: normalizeMessageText(msg.message),
    }));
}

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
    const hasInitializedRef = useRef(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, loading])

    useEffect(() => {
        loadData()
    }, [])

    // Sync URL with conversation ID only after initial load resolves URL / latest mobile conversation
    useEffect(() => {
        if (!hasInitializedRef.current) return
        const currentUrlId = searchParams.get('id')
        if (currentConversationId) {
            if (currentUrlId === currentConversationId) return
            const params = new URLSearchParams(searchParams.toString())
            params.set('id', currentConversationId)
            router.replace(`/chat?${params.toString()}`)
        } else if (currentUrlId) {
            router.replace('/chat')
        }
    }, [currentConversationId, router, searchParams])

    async function loadData() {
        try {
            let token = '';
            const { data: { session } } = await supabase.auth.getSession()

            if (session) {
                token = session.access_token
                apiClient.setToken(token) // Set token for Sidebar and other widgets
                flushPendingAttribution({
                    accessToken: token,
                    userId: session.user.id,
                    email: session.user.email,
                    fullName: session.user.user_metadata?.full_name,
                    userMetadata: session.user.user_metadata,
                }).catch(() => {})
            }

            if (!token) {
                router.push('/login')
                return
            }

            // Apply user's saved default AI mode preference if present before history overrides it
            if (typeof window !== 'undefined') {
                const savedMode = localStorage.getItem('twingenie_pref_ai_mode')
                if (savedMode && ['normal', 'future', 'dark', 'therapist'].includes(savedMode)) {
                    setCurrentMode(savedMode)
                }
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

            // Check URL for conversation ID; otherwise auto-load latest conversation (mobile parity)
            const urlId = searchParams.get('id')
            let targetConversationId: string | null = urlId

            if (!targetConversationId) {
                try {
                    const convData = await apiClient.getConversations() as { conversations?: Array<{ id: string }> }
                    if (convData?.conversations && convData.conversations.length > 0) {
                        targetConversationId = convData.conversations[0].id
                    }
                } catch (convErr) {
                    console.log('Could not auto-select latest conversation:', convErr)
                }
            }

            if (targetConversationId) {
                setCurrentConversationId(targetConversationId)
                try {
                    const { history } = await api.getChatHistory(token, undefined, targetConversationId)
                    const normalized = normalizeHistoryList(history)
                    setMessages(normalized)

                    // Auto-detect mode from last message to restore context
                    if (normalized.length > 0) {
                        const lastMsg = normalized[normalized.length - 1];
                        if (lastMsg.mode && ['normal', 'future', 'dark', 'therapist'].includes(lastMsg.mode)) {
                            setCurrentMode(lastMsg.mode);
                        }
                    }
                } catch (error) {
                    console.log('Failed to load conversation from URL')
                    setMessages([])
                    if (urlId) setCurrentConversationId(null)
                }
            } else {
                // Fallback for legacy pre-conversation messages without conversation_id
                try {
                    const { history } = await api.getChatHistory(token)
                    const normalized = normalizeHistoryList(history)
                    setMessages(normalized)
                    if (normalized.length > 0) {
                        const lastMsg = normalized[normalized.length - 1];
                        if (lastMsg.mode && ['normal', 'future', 'dark', 'therapist'].includes(lastMsg.mode)) {
                            setCurrentMode(lastMsg.mode);
                        }
                    }
                } catch {
                    setMessages([])
                }
                setCurrentConversationId(null)
            }

        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            hasInitializedRef.current = true
        }
    }

    const ensureConversationId = async (token: string, titleHint: string): Promise<string | null> => {
        if (currentConversationId) return currentConversationId;
        try {
            apiClient.setToken(token);
            const convTitle = titleHint.replace(/\s+/g, ' ').trim().slice(0, 48) || 'New Conversation';
            const convRes = await apiClient.createConversation(convTitle) as { conversation?: { id: string } };
            if (convRes?.conversation?.id) {
                setCurrentConversationId(convRes.conversation.id);
                return convRes.conversation.id;
            }
        } catch (convErr) {
            console.warn('Could not pre-create conversation, falling back to server default:', convErr);
        }
        return null;
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

            const targetConversationId = await ensureConversationId(token, userMessage.message);
            const response = await api.sendMessage(userMessage.message, currentMode, token, targetConversationId || undefined)

            if (response.conversation_id) {
                setCurrentConversationId(response.conversation_id)
            }

            // Normalize potentially nested/JSON-encoded response text
            const messageText = normalizeMessageText(response);

            const aiMessage: ChatMessage = {
                id: Date.now().toString(),
                user_id: '',
                message: messageText,
                sender: 'ai',
                mode: currentMode,
                created_at: new Date().toISOString()
            }

            setMessages(prev => [...prev, aiMessage])
        } catch (error: any) {
            console.error('Failed to send message:', error);

            // Check if it's a limit error
            const errorMessage = error?.message || String(error);
            const isLimitError = errorMessage.includes('limit reached') || errorMessage.includes('429');

            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            const hoursLeft = Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
            const resetTimeMessage = `\n\n⏰ Limit resets in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} at midnight`;

            const errorAiMessage: ChatMessage = {
                id: Date.now().toString(),
                user_id: '',
                message: isLimitError
                    ? `🚫 **Daily message limit reached!**\n\nYou've used all 10 free messages today. Come back tomorrow or upgrade to Pro for unlimited messages!${resetTimeMessage}\n\n[Upgrade to Pro →](/subscription)`
                    : "Sorry, I couldn't process that message. Please try again.",
                sender: 'ai',
                mode: currentMode,
                created_at: new Date().toISOString()
            };

            setMessages(prev => [...prev, errorAiMessage]);
        } finally {
            setLoading(false);
        }
    }

    const onEmojiClick = (emojiData: any) => {
        setInput(prev => prev + emojiData.emoji);
    };

    const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
        setIsProcessingVoice(true);
        setShowVoiceRecorder(false);

        const optimisticId = Date.now().toString();
        const voiceMessage: ChatMessage = {
            id: optimisticId,
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
                router.push('/login');
                return;
            }

            const targetConversationId = await ensureConversationId(token, 'Voice Chat');
            const response = await api.sendVoiceMessage(
                targetConversationId,
                audioBlob,
                currentMode,
                token
            );

            if (response.conversationId || response.conversation_id) {
                setCurrentConversationId(response.conversationId || response.conversation_id);
            }

            // Update user message with transcription and audio URL
            if (response.userMessage || response.userAudioUrl) {
                setMessages(prev => prev.map(msg =>
                    msg.id === optimisticId
                        ? { ...msg, message: response.userMessage || msg.message, audio_url: response.userAudioUrl }
                        : msg
                ));
            }

            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                user_id: '',
                message: response.aiResponse,
                sender: 'ai',
                mode: currentMode,
                created_at: new Date().toISOString(),
                audio_url: response.audioUrl
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error: any) {
            console.error('Failed to send voice message:', error);

            const errorMessage = error?.message || String(error);
            const isLimitError = errorMessage.includes('limit reached') || errorMessage.includes('429');

            // Calculate reset time
            const now = new Date();
            const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
            const hoursLeft = Math.ceil((midnight.getTime() - now.getTime()) / (1000 * 60 * 60));
            const resetTimeMessage = `\n\n⏰ Limit resets in ${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''} at midnight`;

            const errorAiMessage: ChatMessage = {
                id: Date.now().toString(),
                user_id: '',
                message: isLimitError
                    ? `🚫 **Daily message limit reached!**\n\nYou've used all 10 free messages today. Come back tomorrow or upgrade to Pro for unlimited messages!${resetTimeMessage}\n\n[Upgrade to Pro →](/subscription)`
                    : "Sorry, I couldn't process that voice message.",
                sender: 'ai',
                mode: currentMode,
                created_at: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorAiMessage]);
        } finally {
            setLoading(false);
            setIsProcessingVoice(false);
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
                const normalized = normalizeHistoryList(history);
                setMessages(normalized);

                if (normalized.length > 0) {
                    const lastMsg = normalized[normalized.length - 1];
                    if (lastMsg.mode && ['normal', 'future', 'dark', 'therapist'].includes(lastMsg.mode)) {
                        setCurrentMode(lastMsg.mode);
                    }
                }
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
                            <option value="normal" className="bg-slate-900 text-white">Normal Twin</option>
                            <option value="future" className="bg-slate-900 text-white">Future Twin</option>
                            <option value="therapist" className="bg-slate-900 text-white">Therapist Twin</option>
                            <option value="dark" className="bg-slate-900 text-white">Dark Twin</option>
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
                                    {msg.audio_url && (
                                        <div className="mt-2 mb-2">
                                            <audio controls src={msg.audio_url} className="w-full h-8" />
                                        </div>
                                    )}
                                    <div className="text-[10px] opacity-50 mt-2">
                                        {new Date(msg.created_at).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {/* Voice Processing Indicator */}
                    {isProcessingVoice && (
                        <div className="flex items-center gap-3 p-4 bg-white/5 border border-white/10 rounded-2xl w-fit mb-4">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute w-3 h-3 bg-red-500 rounded-full animate-ping opacity-75"></div>
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            </div>
                            <span className="text-sm text-purple-200">Processing voice message...</span>
                        </div>
                    )}

                    {/* Text Typing Indicator */}
                    {!isProcessingVoice && loading && (
                        <div className="flex items-center gap-1 p-4 bg-white/5 border border-white/10 rounded-2xl w-fit mb-4">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-white/10 p-4 bg-gray-900/50 backdrop-blur-md">
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
