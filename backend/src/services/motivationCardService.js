import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import aiService from './aiService.js';

/**
 * Motivation Card Service
 * Generates weekly motivational quotes from user conversations
 */

/**
 * Extract insights from user's chat history for the week
 */
async function extractWeeklyInsights(userId, weekStart, weekEnd) {
    try {
        // 1. Try to get chat messages from this week first
        let { data: messages } = await supabaseAdmin
            .from('chat_history')
            .select('message, sender, created_at')
            .eq('user_id', userId)
            .gte('created_at', weekStart)
            .lte('created_at', weekEnd)
            .order('created_at', { ascending: true })
            .limit(50);

        // 2. Fallback: If no messages this week, get the latest chat history overall
        if (!messages || messages.length === 0) {
            const { data: recentMessages } = await supabaseAdmin
                .from('chat_history')
                .select('message, sender, created_at')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            messages = recentMessages;
        }

        if (!messages || messages.length === 0) {
            return null;
        }

        // Build conversation context from sender-based rows
        const conversationContext = messages
            .map(m => `${m.sender === 'ai' ? 'Twin' : 'User'}: ${m.message}`)
            .join('\n');

        return {
            messages,
            context: conversationContext
        };
    } catch (error) {
        logger.error('Error extracting weekly insights:', error);
        return null;
    }
}

/**
 * Use AI to select the most motivational quote
 */
async function selectMotivationalQuote(conversationContext) {
    try {
        const prompt = `Based on the following conversation between a user and their AI companion, extract ONE powerful, motivational quote that the AI said. 

The quote should be:
- Encouraging and uplifting
- Personally relevant to the user
- Under 100 characters
- Standalone (makes sense without context)

Conversation:
${conversationContext}

Return ONLY the quote, nothing else. No quotation marks, no attribution, just the quote text.`;

        const response = await aiService.generateChatResponse(prompt, [], '', 'motivation');
        const quote = (typeof response === 'string' ? response : response?.text);
        return quote ? quote.trim() : "Every step you take towards self-awareness shapes your journey.";
    } catch (error) {
        logger.error('Error selecting quote:', error);
        return "Keep growing. Your journey matters."; // Fallback
    }
}

/**
 * Generate motivation card for user
 */
export async function generateMotivationCard(userId, weekStart = null) {
    try {
        // Calculate week start/end
        const start = weekStart || getMonday(new Date());
        const end = new Date(start);
        end.setDate(end.getDate() + 6);

        // Check if card already exists
        const { data: existing } = await supabaseAdmin
            .from('motivation_cards')
            .select('*')
            .eq('user_id', userId)
            .eq('week_start', start.toISOString().split('T')[0])
            .maybeSingle();

        if (existing) {
            return existing;
        }

        // Get user's twin name
        const { data: profile } = await supabaseAdmin
            .from('personality_profiles')
            .select('twin_name')
            .eq('user_id', userId)
            .maybeSingle();

        const twinName = profile?.twin_name || 'Your Twin';

        // Extract insights
        const insights = await extractWeeklyInsights(
            userId,
            start.toISOString(),
            end.toISOString()
        );

        let quote;
        if (!insights) {
            logger.info('No conversation data for motivation card, using personalized default');
            quote = "Every step you take towards self-awareness shapes the person you are becoming.";
        } else {
            // Select best quote
            quote = await selectMotivationalQuote(insights.context);
        }

        // Create card record with fallback resilience if table does not exist
        let card = null;
        try {
            const { data: newCard, error: insertError } = await supabaseAdmin
                .from('motivation_cards')
                .insert({
                    user_id: userId,
                    week_start: start.toISOString().split('T')[0],
                    week_end: end.toISOString().split('T')[0],
                    quote,
                    twin_name: twinName
                })
                .select()
                .single();

            if (!insertError) {
                card = newCard;
            }
        } catch (dbErr) {
            logger.warn('motivation_cards table insert warning:', dbErr.message);
        }

        if (!card) {
            // Save event fallback to metric_events
            try {
                await supabaseAdmin.from('metric_events').insert({
                    user_id: userId,
                    event_type: 'motivation_card_created',
                    event_value: 1,
                    metric_type: 'motivation',
                    metadata: {
                        week_start: start.toISOString().split('T')[0],
                        week_end: end.toISOString().split('T')[0],
                        quote,
                        twin_name: twinName
                    }
                });
            } catch (fallbackErr) {
                logger.warn('metric_events fallback insert warning:', fallbackErr.message);
            }

            card = {
                id: 'card_' + Date.now(),
                user_id: userId,
                week_start: start.toISOString().split('T')[0],
                week_end: end.toISOString().split('T')[0],
                quote,
                twin_name: twinName
            };
        }

        return card;
    } catch (error) {
        logger.error('Error generating motivation card:', error);
        throw error;
    }
}

/**
 * Get user's current week card
 */
export async function getWeeklyCard(userId) {
    try {
        const weekStart = getMonday(new Date());
        const weekStartStr = weekStart.toISOString().split('T')[0];

        try {
            const { data: card } = await supabaseAdmin
                .from('motivation_cards')
                .select('*')
                .eq('user_id', userId)
                .eq('week_start', weekStartStr)
                .maybeSingle();

            if (card) return card;
        } catch (dbErr) {
            logger.warn('motivation_cards query warning:', dbErr.message);
        }

        // Fallback: Query metric_events
        const { data: fallbackEvent } = await supabaseAdmin
            .from('metric_events')
            .select('*')
            .eq('user_id', userId)
            .eq('event_type', 'motivation_card_created')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (fallbackEvent && fallbackEvent.metadata) {
            return {
                id: fallbackEvent.id,
                user_id: fallbackEvent.user_id,
                week_start: fallbackEvent.metadata.week_start || weekStartStr,
                week_end: fallbackEvent.metadata.week_end || weekStartStr,
                quote: fallbackEvent.metadata.quote,
                twin_name: fallbackEvent.metadata.twin_name
            };
        }

        // If no card exists, try to generate one
        return await generateMotivationCard(userId, weekStart);
    } catch (error) {
        logger.error('Error getting weekly card:', error);
        return null;
    }
}

/**
 * Get all cards for user
 */
export async function getCardHistory(userId, limit = 10) {
    try {
        const { data: cards } = await supabaseAdmin
            .from('motivation_cards')
            .select('*')
            .eq('user_id', userId)
            .order('week_start', { ascending: false })
            .limit(limit);

        return cards || [];
    } catch (error) {
        logger.error('Error getting card history:', error);
        return [];
    }
}

/**
 * Mark card as shared
 */
export async function markCardShared(cardId, platform = 'native') {
    try {
        await supabaseAdmin
            .from('motivation_cards')
            .update({
                is_shared: true,
                shared_at: new Date().toISOString()
            })
            .eq('id', cardId);

        // Log the share
        await supabaseAdmin
            .from('motivation_card_shares')
            .insert({
                card_id: cardId,
                platform
            });

        return { success: true };
    } catch (error) {
        logger.error('Error marking card shared:', error);
        throw error;
    }
}

/**
 * Generate cards for all active users (cron job)
 */
export async function generateWeeklyCardsForAllUsers() {
    try {
        // Get users active in last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const { data: activeUsers } = await supabaseAdmin
            .from('chat_history')
            .select('user_id')
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: false });

        if (!activeUsers) return;

        // Get unique user IDs
        const uniqueUserIds = [...new Set(activeUsers.map(u => u.user_id))];

        logger.info(`Generating motivation cards for ${uniqueUserIds.length} users`);

        let generated = 0;
        let failed = 0;

        for (const userId of uniqueUserIds) {
            try {
                await generateMotivationCard(userId);
                generated++;
            } catch (error) {
                failed++;
                logger.error(`Failed to generate card for user ${userId}:`, error);
            }
        }

        logger.info(`Card generation complete: ${generated} success, ${failed} failed`);

        return { generated, failed };
    } catch (error) {
        logger.error('Error in weekly card generation job:', error);
        throw error;
    }
}

/**
 * Helper: Get Monday of current week
 */
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

export default {
    generateMotivationCard,
    getWeeklyCard,
    getCardHistory,
    markCardShared,
    generateWeeklyCardsForAllUsers
};
