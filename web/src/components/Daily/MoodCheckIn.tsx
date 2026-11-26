'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useDailyStore } from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface MoodCheckInProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

// 1-5 scale matching Mobile MoodCheckInDialog, YearInPixels, and growthStoryService
const MOODS = [
    { value: 5, emoji: '😊', label: 'Great', color: 'from-green-500 to-emerald-500' },
    { value: 4, emoji: '😌', label: 'Good', color: 'from-blue-500 to-cyan-500' },
    { value: 3, emoji: '😐', label: 'Okay', color: 'from-slate-500 to-gray-600' },
    { value: 2, emoji: '😔', label: 'Down', color: 'from-orange-500 to-amber-500' },
    { value: 1, emoji: '😢', label: 'Struggling', color: 'from-red-500 to-rose-500' },
];

export default function MoodCheckIn({ isOpen, onClose, onSuccess }: MoodCheckInProps) {
    const supabase = createClientComponentClient();
    const [selectedMood, setSelectedMood] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { addMoodEntry } = useDailyStore();

    const handleSubmit = async () => {
        if (selectedMood === null) return;

        try {
            setSubmitting(true);
            setError('');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setError('Please sign in again to save your check-in.');
                return;
            }
            apiClient.setToken(session.access_token);

            const data = await apiClient.submitMoodCheckIn(selectedMood, note || undefined) as any;
            const entry = data?.event
                ? { id: data.event.id, mood: selectedMood, note: note || undefined, created_at: data.event.created_at }
                : { id: Date.now().toString(), mood: selectedMood, note: note || undefined, created_at: new Date().toISOString() };
            addMoodEntry(entry);
            onSuccess?.();
            onClose();
            setSelectedMood(null);
            setNote('');
        } catch (err: any) {
            console.error('Failed to submit mood:', err);
            setError(err?.message || 'Failed to save your mood check-in. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
                    />

                    {/* Modal */}
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.94, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.94, y: 12 }}
                            className="pointer-events-auto w-full max-w-md max-h-[90vh] overflow-y-auto bg-[#161224] border border-white/15 text-white rounded-2xl shadow-2xl p-6"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold text-white">How are you feeling?</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-300"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Mood selector */}
                            <div className="space-y-3 mb-6">
                                {MOODS.map((mood) => (
                                    <button
                                        key={mood.value}
                                        onClick={() => setSelectedMood(mood.value)}
                                        className={`w-full p-4 rounded-xl border transition-all ${selectedMood === mood.value
                                            ? `border-transparent bg-gradient-to-r ${mood.color} text-white shadow-lg`
                                            : 'border-white/10 hover:border-white/25 bg-white/5 text-white'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-4xl">{mood.emoji}</span>
                                            <div className="flex-1 text-left">
                                                <div className="font-semibold text-white">
                                                    {mood.label}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Optional note */}
                            {selectedMood !== null && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mb-6"
                                >
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Want to share more? (optional)
                                    </label>
                                    <textarea
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="What's on your mind?"
                                        className="w-full p-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none outline-none"
                                        rows={3}
                                    />
                                </motion.div>
                            )}

                            {error && (
                                <div className="mb-4 rounded-xl bg-red-500/20 border border-red-500/40 px-3 py-2 text-sm text-red-200">
                                    {error}
                                </div>
                            )}

                            {/* Submit button */}
                            <button
                                onClick={handleSubmit}
                                disabled={selectedMood === null || submitting}
                                className={`w-full py-3 rounded-xl font-semibold transition-all ${selectedMood === null || submitting
                                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                                    }`}
                            >
                                {submitting ? 'Submitting...' : 'Submit Check-In'}
                            </button>

                            {/* Streak info */}
                            <p className="text-center text-sm text-gray-400 mt-4">
                                ✨ Daily check-ins help track your emotional journey
                            </p>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
