'use client';

import { useState } from 'react';
import { useDailyStore } from '@/store/useStore';
import { apiClient } from '@/lib/api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface MoodCheckInProps {
    isOpen: boolean;
    onClose: () => void;
}

const MOODS = [
    { value: 2, emoji: '😊', label: 'Great', color: 'from-green-400 to-emerald-500' },
    { value: 1, emoji: '😌', label: 'Good', color: 'from-blue-400 to-cyan-500' },
    { value: 0, emoji: '😐', label: 'Okay', color: 'from-gray-400 to-slate-500' },
    { value: -1, emoji: '😔', label: 'Down', color: 'from-orange-400 to-amber-500' },
    { value: -2, emoji: '😢', label: 'Struggling', color: 'from-red-400 to-rose-500' },
];

export default function MoodCheckIn({ isOpen, onClose }: MoodCheckInProps) {
    const [selectedMood, setSelectedMood] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { addMoodEntry } = useDailyStore();
    const [lastEntry, setLastEntry] = useState<any>(null); // Added this state based on the instruction's usage

    const handleSubmit = async () => {
        if (selectedMood === null) return;

        try {
            setSubmitting(true);
            const data = await apiClient.submitMoodCheckIn(selectedMood, note || undefined) as any; // Changed variable name and added type assertion
            setLastEntry(data || { id: Date.now().toString(), mood: selectedMood, created_at: new Date().toISOString() }); // Added this line, using selectedMood for mood
            addMoodEntry(data); // Changed 'entry' to 'data'
            onClose();
            setSelectedMood(null);
            setNote('');
        } catch (error) {
            console.error('Failed to submit mood:', error);
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
                        className="fixed inset-0 bg-black/50 z-40"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-2xl z-50 p-6"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">How are you feeling?</h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
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
                                    className={`w-full p-4 rounded-xl border-2 transition-all ${selectedMood === mood.value
                                        ? `border-transparent bg-gradient-to-r ${mood.color} text-white shadow-lg`
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-4xl">{mood.emoji}</span>
                                        <div className="flex-1 text-left">
                                            <div className={`font-semibold ${selectedMood === mood.value ? 'text-white' : 'text-gray-900'}`}>
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
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Want to share more? (optional)
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="What's on your mind?"
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                    rows={3}
                                />
                            </motion.div>
                        )}

                        {/* Submit button */}
                        <button
                            onClick={handleSubmit}
                            disabled={selectedMood === null || submitting}
                            className={`w-full py-3 rounded-xl font-semibold transition-all ${selectedMood === null
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg'
                                }`}
                        >
                            {submitting ? 'Submitting...' : 'Submit Check-In'}
                        </button>

                        {/* Streak info */}
                        <p className="text-center text-sm text-gray-500 mt-4">
                            ✨ Daily check-ins help track your emotional journey
                        </p>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
