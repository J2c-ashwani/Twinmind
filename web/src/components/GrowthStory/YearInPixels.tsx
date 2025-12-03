import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Calendar, Sparkles } from 'lucide-react';
import { apiClient } from '@/lib/api/client';

interface DayData {
    date: string;
    mood: number | null;
    dayOfWeek: number;
    month: number;
    day: number;
}

interface YearData {
    year: number;
    days: DayData[];
    totalDays: number;
    averageMood: number;
}

export default function YearInPixels() {
    const [yearData, setYearData] = useState<YearData | null>(null);
    const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadYearData();
    }, []);

    const loadYearData = async () => {
        try {
            const data = await apiClient.getYearCalendar();
            setYearData(data);
        } catch (error) {
            console.error('Failed to load year data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getMoodColor = (mood: number | null) => {
        if (mood === null) return 'bg-gray-800/30';
        if (mood === 1) return 'bg-red-500';
        if (mood === 2) return 'bg-orange-500';
        if (mood === 3) return 'bg-yellow-500';
        if (mood === 4) return 'bg-green-500';
        return 'bg-blue-500'; // 5
    };

    const getMoodLabel = (mood: number) => {
        const labels = ['', 'Very Bad', 'Bad', 'Okay', 'Good', 'Great'];
        return labels[mood] || 'Unknown';
    };

    if (isLoading) {
        return (
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-white/10 rounded w-48"></div>
                    <div className="grid grid-cols-53 gap-1">
                        {[...Array(365)].map((_, i) => (
                            <div key={i} className="w-3 h-3 bg-white/5 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (!yearData || yearData.totalDays === 0) {
        return (
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20">
                <div className="flex items-center gap-3 mb-4">
                    <Calendar className="w-6 h-6 text-blue-400" />
                    <span className="text-sm text-white/70">Year in Pixels</span>
                </div>
                <p className="text-white/60">Start tracking your mood to see your year in pixels!</p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-blue-400" />
                    <div>
                        <h3 className="text-lg font-bold text-white">{yearData.year} in Pixels</h3>
                        <p className="text-xs text-white/50">{yearData.totalDays} days tracked</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-white/50">Average Mood</p>
                    <p className="text-2xl font-bold text-white">{yearData.averageMood.toFixed(1)}</p>
                </div>
            </div>

            {/* Mood Grid */}
            <div className="mb-4 overflow-x-auto">
                <div className="inline-grid grid-cols-53 gap-0.5 min-w-max">
                    {yearData.days.map((day, index) => (
                        <motion.div
                            key={day.date}
                            whileHover={{ scale: 1.5, zIndex: 10 }}
                            onHoverStart={() => setSelectedDay(day)}
                            onHoverEnd={() => setSelectedDay(null)}
                            className={`w-2 h-2 rounded-sm cursor-pointer ${getMoodColor(day.mood)} transition-all`}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.001 }}
                        />
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-white/50 mb-4">
                <span>Less</span>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(mood => (
                        <div key={mood} className={`w-3 h-3 rounded-sm ${getMoodColor(mood)}`} />
                    ))}
                </div>
                <span>More</span>
            </div>

            {/* Hover Info */}
            {selectedDay && selectedDay.mood && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20"
                >
                    <p className="text-sm text-white font-medium">
                        {new Date(selectedDay.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                    <p className="text-xs text-white/70">
                        Mood: {getMoodLabel(selectedDay.mood)} ({selectedDay.mood}/5)
                    </p>
                </motion.div>
            )}
        </motion.div>
    );
}
