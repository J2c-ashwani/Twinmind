import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import aiService from './aiService.js';

/**
 * Growth Story Service
 * Generates Year in Pixels mood calendar and AI insights
 */

/**
 * Get mood data for year in pixels calendar
 */
export async function getYearInPixels(userId, year = new Date().getFullYear()) {
    try {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31);

        // Get all mood check-ins for the year
        const { data: moodEvents } = await supabaseAdmin
            .from('metric_events')
            .select('created_at, metadata, event_value')
            .eq('user_id', userId)
            .eq('metric_type', 'mood')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });

        if (!moodEvents || moodEvents.length === 0) {
            return { year, days: [], totalDays: 0 };
        }

        // Transform into daily mood map
        const moodByDay = {};
        moodEvents.forEach(event => {
            const date = new Date(event.created_at).toISOString().split('T')[0];
            const mood = event.event_value || event.metadata?.mood || 3;

            // If multiple check-ins same day, use average
            if (moodByDay[date]) {
                moodByDay[date] = Math.round((moodByDay[date] + mood) / 2);
            } else {
                moodByDay[date] = mood;
            }
        });

        // Create array of all days with moods
        const days = [];
        const currentDate = new Date(startDate);

        while (currentDate <= endDate && currentDate <= new Date()) {
            const dateStr = currentDate.toISOString().split('T')[0];
            days.push({
                date: dateStr,
                mood: moodByDay[dateStr] || null,
                dayOfWeek: currentDate.getDay(),
                month: currentDate.getMonth(),
                day: currentDate.getDate()
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return {
            year,
            days,
            totalDays: Object.keys(moodByDay).length,
            averageMood: calculateAverageMood(moodByDay)
        };
    } catch (error) {
        logger.error('Error getting year in pixels:', error);
        throw error;
    }
}

/**
 * Generate AI insights from mood data
 */
export async function generateInsights(userId, period = 'year') {
    try {
        let startDate, endDate;
        const now = new Date();

        if (period === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = now;
        } else if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = now;
        } else {
            // Last 90 days
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 90);
            endDate = now;
        }

        // Get mood and conversation data
        const [moodData, chatData] = await Promise.all([
            supabaseAdmin
                .from('metric_events')
                .select('created_at, metadata, event_value')
                .eq('user_id', userId)
                .eq('metric_type', 'mood')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString()),
            supabaseAdmin
                .from('chat_history')
                .select('created_at, message')
                .eq('user_id', userId)
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .limit(100)
        ]);

        if (!moodData.data || moodData.data.length === 0) {
            return null;
        }

        // Calculate patterns
        const patterns = analyzeMoodPatterns(moodData.data);

        // Get chat themes
        const chatMessages = chatData.data?.map(c => c.message).join(' ') || '';

        // Generate AI insights
        const prompt = `Analyze this user's emotional journey data and create 3-4 uplifting, personalized insights:

Mood Statistics:
- Total check-ins: ${moodData.data.length}
- Average mood: ${patterns.averageMood.toFixed(1)}/5
- Happiest day of week: ${patterns.happiestDay}
- Most active time: ${patterns.mostActiveHour}:00
- Mood trend: ${patterns.trend}

Sample topics discussed: ${chatMessages.substring(0, 500)}

Create insights that are:
1. Positive and encouraging
2. Data-driven (reference the numbers)
3. Actionable or reflective
4. Under 30 words each

Format as JSON array: ["insight1", "insight2", "insight3"]`;

        const aiResponse = await aiService.generateResponse(prompt, 'flash');

        let insights;
        try {
            insights = JSON.parse(aiResponse);
        } catch {
            // Fallback insights
            insights = [
                `You checked in ${moodData.data.length} times - that's serious dedication to self-awareness! 🌟`,
                `${patterns.happiestDay}s seem to be your best days. What makes them special?`,
                `Your average mood of ${patterns.averageMood.toFixed(1)}/5 shows steady emotional health.`
            ];
        }

        return {
            period,
            totalCheckIns: moodData.data.length,
            averageMood: patterns.averageMood,
            happiestDay: patterns.happiestDay,
            mostActiveTime: `${patterns.mostActiveHour}:00`,
            trend: patterns.trend,
            insights,
            generatedAt: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Error generating insights:', error);
        throw error;
    }
}

/**
 * Analyze mood patterns
 */
function analyzeMoodPatterns(moodData) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const moodByDay = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    const moodByHour = {};
    let totalMood = 0;

    moodData.forEach(event => {
        const date = new Date(event.created_at);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        const mood = event.event_value || event.metadata?.mood || 3;

        moodByDay[dayOfWeek].push(mood);
        moodByHour[hour] = moodByHour[hour] || [];
        moodByHour[hour].push(mood);
        totalMood += mood;
    });

    // Find happiest day
    let happiestDay = 'Sunday';
    let highestAvg = 0;
    Object.keys(moodByDay).forEach(day => {
        if (moodByDay[day].length > 0) {
            const avg = moodByDay[day].reduce((a, b) => a + b, 0) / moodByDay[day].length;
            if (avg > highestAvg) {
                highestAvg = avg;
                happiestDay = dayNames[day];
            }
        }
    });

    // Find most active hour
    let mostActiveHour = 12;
    let maxCount = 0;
    Object.keys(moodByHour).forEach(hour => {
        if (moodByHour[hour].length > maxCount) {
            maxCount = moodByHour[hour].length;
            mostActiveHour = parseInt(hour);
        }
    });

    // Calculate trend (simple: compare first half to second half)
    const midpoint = Math.floor(moodData.length / 2);
    const firstHalf = moodData.slice(0, midpoint);
    const secondHalf = moodData.slice(midpoint);

    const firstAvg = firstHalf.reduce((sum, e) => sum + (e.metadata?.mood || 3), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, e) => sum + (e.metadata?.mood || 3), 0) / secondHalf.length;

    let trend = 'stable';
    if (secondAvg > firstAvg + 0.3) trend = 'improving';
    if (secondAvg < firstAvg - 0.3) trend = 'declining';

    return {
        averageMood: totalMood / moodData.length,
        happiestDay,
        mostActiveHour,
        trend
    };
}

/**
 * Helper: Calculate average mood
 */
function calculateAverageMood(moodByDay) {
    const moods = Object.values(moodByDay);
    if (moods.length === 0) return 0;
    return moods.reduce((a, b) => a + b, 0) / moods.length;
}

export default {
    getYearInPixels,
    generateInsights
};
