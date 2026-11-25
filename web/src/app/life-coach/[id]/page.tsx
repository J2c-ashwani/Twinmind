'use client';

import { useEffect, useState, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
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
    const [error, setError] = useState('');
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
            setError('');
            const supabase = createClientComponentClient();
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession?.access_token) {
                router.push('/login');
                return;
            }
            apiClient.setToken(authSession.access_token);

            // Ensure program is started
            await apiClient.startProgram(params.id as string);

            // Get session content
            const data = await apiClient.getSession(params.id as string);
            setSession(data);

            // Populate session history if available, otherwise start with initial AI prompt
            if ((data as any)?.session_history && (data as any).session_history.length > 0) {
                setMessages(
                    (data as any).session_history.map((m: any, idx: number) => ({
                        role: m.sender_type === 'user' ? 'user' : 'ai',
                        content: m.content,
                        id: `hist-${idx}-${m.created_at || Date.now()}`,
                    }))
                );
            } else {
                setMessages([
                    {
                        role: 'ai',
                        content: (data as any).content?.initial_prompt || 'Welcome to your coaching session!',
                        id: 'init',
                    },
                ]);
            }
        } catch (error) {
            console.error('Failed to start session:', error);
            setError(error instanceof Error ? error.message : 'Failed to start Life Coach session.');
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || sending) return;

        const userMsg = input;
        setInput('');
        setError('');
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
            setError(error instanceof Error ? error.message : 'Failed to send response. Please try again.');
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
            <div className="flex justify-center items-center min-h-screen bg-[#0F0F1E]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#0F0F1E] p-6 text-white">
                <div className="max-w-md rounded-xl border border-red-500/30 bg-white/5 p-6 text-center shadow-lg backdrop-blur-md">
                    <h1 className="mb-2 text-xl font-semibold text-white">Session unavailable</h1>
                    <p className="mb-6 text-gray-300">{error || 'This Life Coach program could not be opened.'}</p>
                    <Link href="/life-coach" className="inline-flex rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 font-semibold text-white transition-colors">
                        Back to programs
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#0F0F1E] text-white">
            {/* Header */}
            <div className="bg-[#16162A]/95 backdrop-blur-xl border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <Link href="/life-coach" className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-lg text-white">Day {session.progress.current_day}: {session.content.title}</h1>
                        <p className="text-sm text-purple-300 font-medium">Goal: {session.content.goal}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowExercise(!showExercise)}
                        className={`p-2 rounded-full transition-colors ${showExercise
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                            }`}
                        title="View Exercise"
                    >
                        <BookOpen className="w-6 h-6" />
                    </button>
                    <button
                        onClick={handleComplete}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors font-medium"
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
                        className="bg-amber-500/10 border-b border-amber-400/25 overflow-hidden"
                    >
                        <div className="p-6">
                            <h3 className="font-bold text-amber-200 mb-2">📝 Today's Exercise</h3>
                            <p className="text-amber-100/90">{session.content.exercise_instructions}</p>
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
                            className={`max-w-[80%] p-4 rounded-2xl whitespace-pre-wrap ${msg.role === 'user'
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-br-none shadow-md'
                                : 'bg-white/10 border border-white/15 text-gray-100 rounded-bl-none backdrop-blur-md'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </motion.div>
                ))}
                {error && (
                    <div className="max-w-4xl mx-auto rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#16162A]/95 backdrop-blur-xl border-t border-white/10 p-4">
                <div className="max-w-4xl mx-auto flex gap-4">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your response..."
                        aria-label="Type your response"
                        className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-gray-400 caret-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sending}
                        className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
}
