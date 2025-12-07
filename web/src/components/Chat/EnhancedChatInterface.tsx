'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatStore, useUserStore } from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Paperclip, MoreVertical } from 'lucide-react';
import VoiceRecorder from '../Voice/VoiceRecorder';

export default function EnhancedChatInterface() {
    const { messages, addMessage, setTyping, isTyping, currentConversationId } = useChatStore();
    const { user } = useUserStore();
    const [input, setInput] = useState('');
    const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSend = async () => {
        if (!input.trim() || !currentConversationId) return;

        const userMessage = {
            id: Date.now().toString(),
            content: input,
            sender_type: 'user' as const,
            created_at: new Date().toISOString(),
            conversation_id: currentConversationId,
        };

        addMessage(userMessage);
        setInput('');
        setTyping(true);

        try {
            const response = await apiClient.sendMessage(
                currentConversationId,
                input,
                undefined
            ) as any;

            addMessage({
                id: response?.id || Date.now().toString(),
                content: response?.content || response?.message || '',
                sender_type: 'ai',
                created_at: response?.created_at || new Date().toISOString(),
                conversation_id: currentConversationId,
            });
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setTyping(false);
        }
    };

    const handleVoiceSend = async (audioBlob: Blob, duration: number) => {
        if (!currentConversationId) return;

        setShowVoiceRecorder(false);

        // Optimistic update
        const tempId = Date.now().toString();
        addMessage({
            id: tempId,
            content: '🎤 Voice Message',
            sender_type: 'user',
            created_at: new Date().toISOString(),
            conversation_id: currentConversationId,
        });
        setTyping(true);

        try {
            const response = await apiClient.sendVoiceMessage(
                audioBlob,
                duration,
                currentConversationId
            ) as any;

            // Update with real response
            addMessage({
                id: response?.id || Date.now().toString(),
                content: response?.content || response?.message || '',
                sender_type: 'ai',
                created_at: response?.created_at || new Date().toISOString(),
                conversation_id: currentConversationId,
            });
        } catch (error) {
            console.error('Failed to send voice message:', error);
            // Optionally remove optimistic message or show error
        } finally {
            setTyping(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                        AI
                    </div>
                    <div>
                        <h2 className="font-semibold">TwinMind AI</h2>
                        <p className="text-sm text-gray-500">
                            {isTyping ? 'Typing...' : 'Online'}
                        </p>
                    </div>
                </div>
                <button className="p-2 hover:bg-gray-100 rounded-full">
                    <MoreVertical className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setShowVoiceRecorder(true)}
                    className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <Mic className="w-6 h-6" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.sender_type === 'user'
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                    : 'bg-white text-gray-900 shadow-md'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap">{message.content}</p>
                                <p
                                    className={`text-xs mt-1 ${message.sender_type === 'user'
                                        ? 'text-white/70'
                                        : 'text-gray-500'
                                        }`}
                                >
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
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-start"
                    >
                        <div className="bg-white rounded-2xl px-4 py-3 shadow-md">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                            </div>
                        </div>
                    </motion.div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Voice Recorder Modal */}
            <AnimatePresence>
                {showVoiceRecorder && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    >
                        <VoiceRecorder
                            onSend={handleVoiceSend}
                            onCancel={() => setShowVoiceRecorder(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="bg-white border-t px-6 py-4">
                <div className="flex items-end gap-3">
                    <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <Paperclip className="w-5 h-5 text-gray-600" />
                    </button>

                    <div className="flex-1 relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type a message..."
                            className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                            rows={1}
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                        />
                    </div>

                    <button
                        onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                        className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Mic className="w-5 h-5 text-gray-600" />
                    </button>

                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className={`p-3 rounded-full transition-all ${input.trim()
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                            : 'bg-gray-200 text-gray-400'
                            }`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

