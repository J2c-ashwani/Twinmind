import React, { useEffect, useState } from 'react';
import api from '@/lib/api';

interface MoodEntry {
    id: string;
    mood: number;
    note: string;
    created_at: string;
}

export default function MoodHistory() {
    const [history, setHistory] = useState<MoodEntry[]>([]);
    const [loading, setLoading] = useState(true);

    // Assuming 'days' is meant to be a constant or prop,
    // and the user intends to introduce it.
    // For now, we'll define it as a constant to make the code syntactically correct.
    // If 'days' was meant to be a prop, it would need to be added to the function signature.
    // If 'days' was meant to be state, it would need useState.
    // Given the original code used '7', we'll assume 'days' is intended to be '7'.
    const days = 7;

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            const data = await api.getMoodHistory(days.toString()) as any; // Get last 7 days
            setHistory(data.reverse()); // Show oldest to newest
        } catch (error) {
            console.error('Failed to load mood history:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="glass-card p-6 animate-pulse h-48"></div>;

    return (
        <div className="glass-card p-6">
            <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Mood History
            </h3>

            <div className="h-32 flex items-end justify-between gap-2">
                {history.map((entry, index) => (
                    <div key={entry.id} className="flex flex-col items-center flex-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-xs p-2 rounded whitespace-nowrap z-10 pointer-events-none">
                            <p>{new Date(entry.created_at).toLocaleDateString()}</p>
                            <p>Mood: {entry.mood}/5</p>
                            {entry.note && <p className="italic">"{entry.note}"</p>}
                        </div>

                        {/* Bar */}
                        <div
                            className="w-full max-w-[20px] rounded-t-lg transition-all duration-500 hover:brightness-110 cursor-pointer"
                            style={{
                                height: `${(entry.mood / 5) * 100}%`,
                                backgroundColor: getMoodColor(entry.mood)
                            }}
                        />

                        {/* Label */}
                        <span className="text-xs text-gray-400 mt-2">
                            {new Date(entry.created_at).toLocaleDateString(undefined, { weekday: 'narrow' })}
                        </span>
                    </div>
                ))}

                {history.length === 0 && (
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                        No mood data yet
                    </div>
                )}
            </div>
        </div>
    );
}

function getMoodColor(mood: number): string {
    switch (mood) {
        case 1: return '#ef4444'; // Red
        case 2: return '#f97316'; // Orange
        case 3: return '#eab308'; // Yellow
        case 4: return '#84cc16'; // Lime
        case 5: return '#22c55e'; // Green
        default: return '#6b7280';
    }
}
