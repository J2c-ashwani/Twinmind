'use client';

import { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, CheckCircle, ChevronLeft, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

export default function CoachingSessionPage() {
    const params = useParams();
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [showExercise, setShowExercise] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (params.id) {
            startSession();
        }
    }, [params.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const startSession = async () => {
        try {
            // Ensure program is started
            await apiClient.startProgram(params.id as string);

            // Get session content
            const data = await apiClient.getSession(params.id as string);
            setSession(data);

            // Add initial AI message
            setMessages([
                {
                    role: 'ai',
                    content: data.content.initial_prompt,
                    id: 'init'
                }
            ]);
        } catch (error) {
            console.error('Failed to start session:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || sending) return;

        const userMsg = input;
        setInput('');
        setSending(true);

        // Optimistic update
        const newMessages = [
            ...messages,
            { role: 'user', content: userMsg, id: Date.now().toString() }
        ];
        setMessages(newMessages);

        try {
            const response = await apiClient.sendSessionMessage(
                params.id as string,
                userMsg,
                newMessages.map(m => ({ role: m.role, content: m.content }))
            ) as any;

            setMessages(prev => [
                ...prev,
                { role: 'ai', content: response.response, id: Date.now().toString() }
            ]);
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const handleComplete = async () => {
        const notes = prompt('Any notes for today? (Optional)');
        if (notes === null) return;

        try {
            await apiClient.completeSession(params.id as string, notes);
            router.push('/life-coach');
        } catch (error) {
            console.error('Failed to complete session:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!session) return null;

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Link href="/life-coach" className="p-2 hover:bg-gray-100 rounded-full">
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg text-gray-900">Day {session.progress.current_day}: {session.content.title}</h1>
                        <p className="text-sm text-purple-600 font-medium">Goal: {session.content.goal}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowExercise(!showExercise)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                        title="View Exercise"
                    >
                        <BookOpen className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleComplete}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                        <CheckCircle className="w-4 h-4" /> Complete
                    </button>
                </div>
            </div>

            {/* Exercise Panel */}
            <AnimatePresence>
                {showExercise && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-amber-50 border-b border-amber-100 overflow-hidden"
                    >
                        <div className="p-6">
                            <h3 className="font-bold text-amber-900 mb-2">📝 Today's Exercise</h3>
                            <p className="text-amber-800">{session.content.exercise_instructions}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {messages.map((msg) => (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] p-4 rounded-2xl ${msg.role === 'user'
                                    ? 'bg-purple-600 text-white rounded-br-none'
                                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </motion.div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t p-4">
                <div className="max-w-4xl mx-auto flex gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your response..."
                        className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
