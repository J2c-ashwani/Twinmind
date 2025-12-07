import { supabaseAdmin } from '../config/supabase.js';
import aiService from './aiService.js';
import logger from '../config/logger.js';

/**
 * Insights Service - Generates AI-powered daily summaries and analytics
 */

/**
 * Generate daily insight for a user based on today's activity
 */
export async function generateDailyInsight(userId) {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Check if insight already exists
        const { data: existing } = await supabaseAdmin
            .from('daily_insights')
            .select('*')
            .eq('user_id', userId)
            .eq('date', today.toISOString().split('T')[0])
            .single();

        if (existing) return existing;

        // 2. Fetch today's chat history
        const { data: chats } = await supabaseAdmin
            .from('chat_history')
            .select('message, sender, created_at')
            .eq('user_id', userId)
            .gte('created_at', today.toISOString())
            .lt('created_at', tomorrow.toISOString())
            .order('created_at', { ascending: true });

        if (!chats || chats.length < 5) {
            logger.info(`Not enough activity for user ${userId} to generate insight`);
            return null;
        }

        // 3. Analyze with AI
        const chatText = chats.map(c => `${c.sender}: ${c.message}`).join('\n');

        const systemPrompt = `
Analyze the following chat history for today and generate a daily insight summary.
Output JSON format:
{
  "summary": "2-3 sentences summarizing the user's day, key events, and emotional state.",
  "mood_score": 1-10 (1=very sad, 10=very happy),
  "dominant_emotion": "one word (e.g., happy, stressed, productive)",
  "key_topics": ["topic1", "topic2", "topic3"],
  "actionable_tip": "One specific, helpful tip for tomorrow based on today."
}
`;

        const analysis = await aiService.generateResponse(
            chatText,
            systemPrompt,
            [],
            'gpt-3.5-turbo',
            0.7,
            true // JSON mode
        );

        let insightData;
        try {
            insightData = JSON.parse(analysis);
        } catch (e) {
            // Fallback if JSON parsing fails
            insightData = {
                summary: "You had a busy day today!",
                mood_score: 7,
                dominant_emotion: "neutral",
                key_topics: [],
                actionable_tip: "Take a moment to breathe."
            };
        }

        // 4. Save to database
        const { data: newInsight, error } = await supabaseAdmin
            .from('daily_insights')
            .insert({
                user_id: userId,
                date: today.toISOString().split('T')[0],
                summary: insightData.summary,
                mood_score: insightData.mood_score,
                dominant_emotion: insightData.dominant_emotion,
                key_topics: insightData.key_topics,
                actionable_tip: insightData.actionable_tip
            })
            .select()
            .single();

        if (error) throw error;

        // 5. Create notification
        await supabaseAdmin.from('notifications').insert({
            user_id: userId,
            title: 'Daily Insight Ready 📊',
            body: `Your daily summary is ready! Mood: ${insightData.dominant_emotion}`,
            type: 'insight',
            data: { action: 'view_insight', date: today.toISOString().split('T')[0] }
        });

        return newInsight;

    } catch (error) {
        logger.error(`Error generating insight for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Get weekly insights aggregation
 */
export async function getWeeklyInsights(userId) {
    try {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const { data: insights } = await supabaseAdmin
            .from('daily_insights')
            .select('*')
            .eq('user_id', userId)
            .gte('date', weekAgo.toISOString().split('T')[0])
            .order('date', { ascending: true });

        if (!insights || insights.length === 0) {
            return { summary: "No insights yet this week.", mood_trend: "neutral", top_emotions: [], topics: [] };
        }

        // Aggregate data
        const emotions = {};
        const topics = new Set();
        let totalMood = 0;

        insights.forEach(i => {
            emotions[i.dominant_emotion] = (emotions[i.dominant_emotion] || 0) + 1;
            i.key_topics?.forEach(t => topics.add(t));
            totalMood += i.mood_score || 5;
        });

        const sortedEmotions = Object.entries(emotions)
            .sort((a, b) => b[1] - a[1])
            .map(e => e[0])
            .slice(0, 3);

        const avgMood = totalMood / insights.length;
        let moodTrend = "stable";
        if (insights.length > 1) {
            const firstHalf = insights.slice(0, Math.floor(insights.length / 2));
            const secondHalf = insights.slice(Math.floor(insights.length / 2));
            const avg1 = firstHalf.reduce((acc, curr) => acc + (curr.mood_score || 5), 0) / firstHalf.length;
            const avg2 = secondHalf.reduce((acc, curr) => acc + (curr.mood_score || 5), 0) / secondHalf.length;
            if (avg2 > avg1 + 1) moodTrend = "improving";
            else if (avg2 < avg1 - 1) moodTrend = "declining";
        }

        return {
            summary: `You've tracked ${insights.length} days this week. Your mood is generally ${moodTrend}.`,
            mood_trend: moodTrend,
            average_mood: avgMood,
            top_emotions: sortedEmotions,
            topics: Array.from(topics).slice(0, 5),
            daily_data: insights
        };
    } catch (error) {
        logger.error('Error fetching weekly insights:', error);
        throw error;
    }
}

export default {
    generateDailyInsight,
    getWeeklyInsights
};
