import React, { useEffect, useState } from 'react'
import api from '@/lib/api'

interface MoodEntry {
    id: string
    mood: number
    note: string
    created_at: string
}

export default function MoodHistory() {
    const [history, setHistory] = useState<MoodEntry[]>([])
    const [loading, setLoading] = useState(true)
    const days = 7

    useEffect(() => {
        loadHistory()
    }, [])

    const loadHistory = async () => {
        try {
            const data = (await api.getMoodHistory(days.toString())) as any
            setHistory(Array.isArray(data) ? data.reverse() : [])
        } catch (error) {
            console.error('Failed to load mood history:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="enterprise-panel h-48 animate-pulse p-6" />

    return (
        <div className="enterprise-panel p-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#D9A760]">
                7-Day Telemetry
            </div>
            <h3 className="mt-1 mb-5 text-lg font-semibold text-[#F4F2EC]">Mood Cadence</h3>

            <div className="flex h-32 items-end justify-between gap-2">
                {history.map((entry) => (
                    <div key={entry.id} className="group relative flex flex-1 flex-col items-center">
                        <div className="pointer-events-none absolute bottom-full z-10 mb-2 whitespace-nowrap rounded-lg border border-white/10 bg-[#0B0D12] p-2 text-[11px] text-neutral-200 opacity-0 transition-opacity group-hover:opacity-100">
                            <p>{new Date(entry.created_at).toLocaleDateString()}</p>
                            <p>Mood: {entry.mood}/5</p>
                            {entry.note && <p className="italic text-neutral-400">&ldquo;{entry.note}&rdquo;</p>}
                        </div>

                        <div
                            className="w-full max-w-[20px] cursor-pointer rounded-t-md transition-all duration-300 hover:brightness-110"
                            style={{
                                height: `${Math.max(12, (entry.mood / 5) * 100)}%`,
                                backgroundColor: getMoodColor(entry.mood),
                            }}
                        />

                        <span className="mt-2 font-mono text-[10px] text-neutral-500">
                            {new Date(entry.created_at).toLocaleDateString(undefined, { weekday: 'narrow' })}
                        </span>
                    </div>
                ))}

                {history.length === 0 && (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-500">
                        No mood entries logged yet
                    </div>
                )}
            </div>
        </div>
    )
}

function getMoodColor(mood: number): string {
    switch (mood) {
        case 1:
            return '#F7768E'
        case 2:
            return '#E0AF68'
        case 3:
            return '#D9A760'
        case 4:
            return '#7AA2F7'
        case 5:
            return '#56B886'
        default:
            return '#6B7280'
    }
}
