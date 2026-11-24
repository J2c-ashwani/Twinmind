import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Share2, RefreshCw } from 'lucide-react'
import { apiClient } from '@/lib/api/client'

interface MotivationCard {
    id: string
    quote: string
    twin_name: string
    week_start: string
    week_end: string
    is_shared: boolean
}

export default function WeeklyMotivationCard() {
    const [card, setCard] = useState<MotivationCard | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        loadCard()
    }, [])

    const loadCard = async () => {
        try {
            const data = (await apiClient.getWeeklyMotivationCard()) as any
            setCard(data?.card || null)
        } catch (error) {
            console.error('Failed to load card:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const generateCard = async () => {
        setIsGenerating(true)
        try {
            const data = (await apiClient.generateMotivationCard()) as any
            setCard(data?.card || null)
        } catch (error) {
            console.error('Failed to generate card:', error)
        } finally {
            setIsGenerating(false)
        }
    }

    const shareCard = async () => {
        if (!card) return
        try {
            if (navigator.share) {
                await navigator.share({
                    title: 'TwinGenie Weekly Reflection',
                    text: `"${card.quote}" — ${card.twin_name}`,
                    url: window.location.origin,
                })
                await apiClient.markCardShared(card.id, 'native')
            }
        } catch (error) {
            console.error('Share failed:', error)
        }
    }

    if (isLoading) {
        return <div className="enterprise-panel h-48 animate-pulse p-6" />
    }

    if (!card) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="enterprise-panel p-6"
            >
                <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Weekly Reflection Note</span>
                </div>
                <p className="text-xs leading-relaxed text-neutral-400">
                    Continue conversing with your Twin this week to synthesize your weekly takeaway card.
                </p>
                <button
                    type="button"
                    onClick={generateCard}
                    disabled={isGenerating}
                    className="btn-secondary-obsidian mt-4 w-full py-2 text-xs disabled:opacity-45"
                >
                    {isGenerating ? 'Synthesizing...' : 'Generate Weekly Note'}
                </button>
            </motion.div>
        )
    }

    const weekStart = new Date(card.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const weekEnd = new Date(card.week_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="enterprise-panel flex flex-col justify-between border-[#D9A760]/35 bg-[#10131C] p-6"
        >
            <div>
                <div className="mb-4 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                        Weekly Synthesis
                    </span>
                    <span className="font-mono text-[10px] text-neutral-500">
                        {weekStart} – {weekEnd}
                    </span>
                </div>

                <blockquote className="font-serif text-lg italic leading-relaxed text-[#F4F2EC]">
                    &ldquo;{card.quote}&rdquo;
                </blockquote>
                <p className="mt-3 text-right font-mono text-[11px] text-neutral-400">
                    — {card.twin_name}
                </p>
            </div>

            <div className="mt-5 flex gap-2">
                <button
                    type="button"
                    onClick={shareCard}
                    className="btn-secondary-obsidian flex-1 py-2 text-xs"
                >
                    <Share2 className="h-3.5 w-3.5" />
                    <span>Share</span>
                </button>
                <button
                    type="button"
                    onClick={generateCard}
                    disabled={isGenerating}
                    className="btn-secondary-obsidian px-3 py-2 text-xs disabled:opacity-45"
                    title="Refresh quote"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
            </div>
        </motion.div>
    )
}
