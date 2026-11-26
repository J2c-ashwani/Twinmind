import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { apiClient } from '@/lib/api/client';

interface MoodEntry {
    id: string;
    mood: number;
    note: string;
    created_at: string;
}

export default function MoodHistory({ refreshKey = 0 }: { refreshKey?: number }) {
    const [history, setHistory] = useState<MoodEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const days = 7;

    useEffect(() => {
        loadHistory();
    }, [refreshKey]);

    const loadHistory = async () => {
        try {
            const supabase = createClientComponentClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            apiClient.setToken(session.access_token);
            const data = await apiClient.getMoodHistory(days) as any[];
            const list = Array.isArray(data) ? data : [];
            const normalized = list.map((entry) => ({
                ...entry,
                mood: entry.mood <= 0 ? Math.min(5, Math.max(1, entry.mood + 3)) : Math.min(5, Math.max(1, entry.mood)),
            }));
            setHistory(normalized.reverse()); // Show oldest to newest
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
                    <div key={entry.id} className="flex flex-col items-center justify-end h-full flex-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-xs p-2 rounded whitespace-nowrap z-10 pointer-events-none">
                            <p>{new Date(entry.created_at).toLocaleDateString()}</p>
                            <p>Mood: {entry.mood}/5</p>
                            {entry.note && <p className="italic">"{entry.note}"</p>}
                        </div>

                        {/* Bar */}
                        <div className="w-full flex-1 flex items-end justify-center">
                            <div
                                className="w-full max-w-[20px] rounded-t-lg transition-all duration-500 hover:brightness-110 cursor-pointer"
                                style={{
                                    height: `${(entry.mood / 5) * 100}%`,
                                    minHeight: '8px',
                                    backgroundColor: getMoodColor(entry.mood)
                                }}
                            />
                        </div>

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
