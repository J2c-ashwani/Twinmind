'use client'

import { useState } from 'react'
import { useDailyStore } from '@/store/useStore'
import { apiClient } from '@/lib/api/client'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface MoodCheckInProps {
    isOpen: boolean
    onClose: () => void
}

const MOODS = [
    { value: 2, label: 'Energized & Clear', dot: 'bg-emerald-400' },
    { value: 1, label: 'Calm & Steady', dot: 'bg-sky-400' },
    { value: 0, label: 'Neutral', dot: 'bg-neutral-400' },
    { value: -1, label: 'Heavy or Tense', dot: 'bg-amber-400' },
    { value: -2, label: 'Overwhelmed', dot: 'bg-rose-400' },
]

export default function MoodCheckIn({ isOpen, onClose }: MoodCheckInProps) {
    const [selectedMood, setSelectedMood] = useState<number | null>(null)
    const [note, setNote] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const { addMoodEntry } = useDailyStore()

    const handleSubmit = async () => {
        if (selectedMood === null) return

        try {
            setSubmitting(true)
            const data = (await apiClient.submitMoodCheckIn(selectedMood, note || undefined)) as any
            addMoodEntry(data)
            onClose()
            setSelectedMood(null)
            setNote('')
        } catch (error) {
            console.error('Failed to submit mood:', error)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        className="enterprise-panel fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-6"
                    >
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                                    Emotional Baseline
                                </div>
                                <h2 className="mt-1 text-xl font-semibold text-[#F4F2EC]">
                                    How are you feeling right now?
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-lg border border-white/10 p-1.5 text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="mb-5 space-y-2">
                            {MOODS.map((mood) => (
                                <button
                                    key={mood.value}
                                    type="button"
                                    onClick={() => setSelectedMood(mood.value)}
                                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                                        selectedMood === mood.value
                                            ? 'border-[#D9A760]/70 bg-[#D9A760]/10 text-white'
                                            : 'border-white/[0.08] bg-white/[0.02] text-neutral-300 hover:border-white/20'
                                    }`}
                                >
                                    <span className={`h-2.5 w-2.5 rounded-full ${mood.dot}`} />
                                    <span className="text-sm font-medium">{mood.label}</span>
                                </button>
                            ))}
                        </div>

                        {selectedMood !== null && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="mb-5"
                            >
                                <label className="mb-1.5 block text-xs font-medium text-neutral-300">
                                    Context note (optional)
                                </label>
                                <textarea
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="What is influencing your state right now?"
                                    className="w-full resize-none rounded-xl border border-white/[0.12] bg-[#07080B] p-3 text-sm text-white placeholder-neutral-500 focus:border-[#D9A760]/60 focus:outline-none"
                                    rows={3}
                                />
                            </motion.div>
                        )}

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={selectedMood === null || submitting}
                            className="btn-primary-ivory w-full py-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                            {submitting ? 'Logging Check-In...' : 'Log Check-In'}
                        </button>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
