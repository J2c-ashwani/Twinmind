'use client'

import { useState, useEffect, useRef } from 'react'
import { useChatStore } from '@/store/useStore'
import { apiClient } from '@/lib/api/client'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, Paperclip, MoreVertical } from 'lucide-react'
import VoiceRecorder from '../Voice/VoiceRecorder'

export default function EnhancedChatInterface() {
    const { messages, addMessage, setTyping, isTyping, currentConversationId } = useChatStore()
    const [input, setInput] = useState('')
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    const handleSend = async () => {
        if (!input.trim() || !currentConversationId) return

        const userMessage = {
            id: Date.now().toString(),
            content: input,
            sender_type: 'user' as const,
            created_at: new Date().toISOString(),
            conversation_id: currentConversationId,
        }

        addMessage(userMessage)
        setInput('')
        setTyping(true)

        try {
            const response = (await apiClient.sendMessage(currentConversationId, input, undefined)) as any
            addMessage({
                id: response?.id || Date.now().toString(),
                content: response?.content || response?.message || '',
                sender_type: 'ai',
                created_at: response?.created_at || new Date().toISOString(),
                conversation_id: currentConversationId,
            })
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setTyping(false)
        }
    }

    const handleVoiceSend = async (audioBlob: Blob) => {
        if (!currentConversationId) return
        setShowVoiceRecorder(false)

        const tempId = Date.now().toString()
        addMessage({
            id: tempId,
            content: 'Voice reflection recorded',
            sender_type: 'user',
            created_at: new Date().toISOString(),
            conversation_id: currentConversationId,
        })
        setTyping(true)

        try {
            const response = (await apiClient.sendVoiceMessage(
                currentConversationId,
                audioBlob,
                'normal'
            )) as any

            addMessage({
                id: response?.id || Date.now().toString(),
                content: response?.content || response?.message || '',
                sender_type: 'ai',
                created_at: response?.created_at || new Date().toISOString(),
                conversation_id: currentConversationId,
            })
        } catch (error) {
            console.error('Failed to send voice message:', error)
        } finally {
            setTyping(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="flex h-screen flex-col bg-[#07080B] text-[#F4F2EC]">
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#0B0D12] px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D9A760]/40 bg-[#141822] font-mono text-xs font-bold text-[#E7C891]">
                        TG
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold text-white">TwinGenie AI</h2>
                        <p className="font-mono text-[11px] text-neutral-400">
                            {isTyping ? 'Synthesizing...' : 'Active Session'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setShowVoiceRecorder(true)}
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                        <Mic className="h-5 w-5" />
                    </button>
                    <button
                        type="button"
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                        <MoreVertical className="h-5 w-5" />
                    </button>
                </div>
            </div>

            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-6">
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                                    message.sender_type === 'user'
                                        ? 'border border-[#D9A760]/30 bg-[#181C26] text-[#F4F2EC]'
                                        : 'border border-white/[0.08] bg-[#0D1016] text-neutral-200'
                                }`}
                            >
                                <p className="whitespace-pre-wrap">{message.content}</p>
                                <p className="mt-1 font-mono text-[10px] text-neutral-500">
                                    {new Date(message.created_at).toLocaleTimeString([], {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    })}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {isTyping && (
                    <div className="enterprise-panel flex w-fit gap-1.5 px-4 py-3">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D9A760]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D9A760] [animation-delay:0.1s]" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#D9A760] [animation-delay:0.2s]" />
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <AnimatePresence>
                {showVoiceRecorder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
                    >
                        <VoiceRecorder
                            onSend={handleVoiceSend}
                            onCancel={() => setShowVoiceRecorder(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="border-t border-white/[0.08] bg-[#0B0D12] px-6 py-4">
                <div className="flex items-end gap-3">
                    <button
                        type="button"
                        className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                        <Paperclip className="h-5 w-5" />
                    </button>

                    <div className="flex-1">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Type a reflection..."
                            className="w-full resize-none rounded-xl border border-white/[0.12] bg-[#07080B] px-4 py-3 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                            rows={1}
                            style={{ minHeight: '46px', maxHeight: '120px' }}
                        />
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                        className="rounded-lg p-3 text-neutral-400 transition-colors hover:bg-white/[0.06] hover:text-white"
                    >
                        <Mic className="h-5 w-5" />
                    </button>

                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="btn-primary-ivory p-3 disabled:opacity-40"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
