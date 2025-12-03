import logger from '../config/logger.js';
import { supabaseAdmin } from '../config/supabase.js';
import aiService from './aiService.js';

/**
 * Conversation Memory Service
 * Fast semantic search and retrieval of past conversations
 */

/**
 * Generate embedding for a text
 */
export async function generateEmbedding(text) {
    try {
        // Use Gemini embeddings via aiService (Free!)
        const embedding = await aiService.generateEmbedding(text);
        return embedding;
    } catch (error) {
        logger.error('Error generating embedding:', error);
        throw error;
    }
}

/**
 * Store message with embedding for semantic search
 */
export async function storeMessageWithEmbedding(messageId, userId, content, conversationId) {
    try {
        // Generate embedding
        const embedding = await generateEmbedding(content);

        // Store in message_embeddings table
        const { error } = await supabaseAdmin
            .from('message_embeddings')
            .insert({
                message_id: messageId,
                user_id: userId,
                conversation_id: conversationId,
                content: content,
                embedding: embedding
            });

        if (error) throw error;

        logger.info(`Stored embedding for message ${messageId}`);

    } catch (error) {
        logger.error('Error storing message embedding:', error);
    }
}

/**
 * Search past conversations semantically
 */
export async function searchConversations(userId, query, limit = 5) {
    try {
        // Generate embedding for query
        const queryEmbedding = await generateEmbedding(query);

        // Perform vector similarity search using pgvector
        const { data, error } = await supabaseAdmin.rpc('search_conversations', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: limit,
            p_user_id: userId
        });

        if (error) throw error;

        return data || [];

    } catch (error) {
        logger.error('Error searching conversations:', error);
        return [];
    }
}

/**
 * Get conversation context for a specific topic
 */
export async function getConversationContext(userId, topic, limit = 3) {
    try {
        const results = await searchConversations(userId, topic, limit);

        if (results.length === 0) {
            return null;
        }

        // Format context for AI
        let context = `\n## RELEVANT PAST CONVERSATIONS\n`;
        context += `User asked about: "${topic}"\n\n`;

        results.forEach((result, index) => {
            const date = new Date(result.created_at).toLocaleDateString();
            context += `### Memory ${index + 1} (${date}, similarity: ${Math.round(result.similarity * 100)}%)\n`;
            context += `${result.content}\n\n`;
        });

        context += `⚠️ Reference these past conversations naturally to show you remember.\n`;

        return {
            context: context,
            memories: results
        };

    } catch (error) {
        logger.error('Error getting conversation context:', error);
        return null;
    }
}

/**
 * Quick memory recall for user queries
 */
export async function quickRecall(userId, userMessage) {
    try {
        // Check if user is asking about past conversations
        const recallPatterns = [
            /remember when/i,
            /we talked about/i,
            /you said/i,
            /i told you/i,
            /last time/i,
            /earlier/i,
            /before/i,
            /what did (i|we) say about/i,
            /do you remember/i
        ];

        const isRecallQuery = recallPatterns.some(pattern => pattern.test(userMessage));

        if (!isRecallQuery) {
            return null;
        }

        // Extract topic from query
        const topic = extractTopicFromQuery(userMessage);

        // Search for relevant conversations
        const results = await searchConversations(userId, topic || userMessage, 5);

        if (results.length === 0) {
            return {
                found: false,
                message: "I don't have a clear memory of that conversation. Could you tell me more?"
            };
        }

        // Format quick response
        const topResult = results[0];
        const date = new Date(topResult.created_at).toLocaleDateString();

        return {
            found: true,
            memories: results,
            quickResponse: `Yes, I remember! On ${date}, we talked about this. ${topResult.content.substring(0, 200)}...`,
            fullContext: results.map(r => ({
                date: new Date(r.created_at).toLocaleDateString(),
                content: r.content,
                similarity: r.similarity
            }))
        };

    } catch (error) {
        logger.error('Error in quick recall:', error);
        return null;
    }
}

/**
 * Extract topic from recall query
 */
function extractTopicFromQuery(query) {
    // Remove recall phrases to get topic
    let topic = query
        .replace(/remember when/i, '')
        .replace(/we talked about/i, '')
        .replace(/you said/i, '')
        .replace(/i told you/i, '')
        .replace(/last time/i, '')
        .replace(/do you remember/i, '')
        .replace(/what did (i|we) say about/i, '')
        .trim();

    return topic;
}

/**
 * Get recent conversation summary
 */
export async function getRecentConversationSummary(userId, days = 7) {
    try {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const { data, error } = await supabaseAdmin
            .from('messages')
            .select('content, created_at, sender_type')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString())
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Group by topic using simple keyword extraction
        const topics = {};

        data.forEach(msg => {
            // Extract key phrases (simple implementation)
            const words = msg.content.toLowerCase().split(' ');
            const keywords = words.filter(w => w.length > 5);

            keywords.forEach(keyword => {
                if (!topics[keyword]) {
                    topics[keyword] = [];
                }
                topics[keyword].push(msg);
            });
        });

        return {
            total_messages: data.length,
            date_range: `${startDate.toLocaleDateString()} - ${new Date().toLocaleDateString()}`,
            topics: Object.keys(topics).slice(0, 10) // Top 10 topics
        };

    } catch (error) {
        logger.error('Error getting conversation summary:', error);
        return null;
    }
}

/**
 * Build conversation history for AI context
 */
export async function buildConversationHistory(userId, conversationId, messageLimit = 20) {
    try {
        const { data, error } = await supabaseAdmin
            .from('messages')
            .select('content, sender_type, created_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(messageLimit);

        if (error) throw error;

        // Reverse to chronological order
        const messages = (data || []).reverse();

        // Format for AI
        return messages.map(msg => ({
            role: msg.sender_type === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));

    } catch (error) {
        logger.error('Error building conversation history:', error);
        return [];
    }
}

/**
 * Cache frequently accessed conversations
 */
const conversationCache = new Map();

export async function getCachedConversation(conversationId) {
    if (conversationCache.has(conversationId)) {
        return conversationCache.get(conversationId);
    }

    const history = await buildConversationHistory(null, conversationId);
    conversationCache.set(conversationId, history);

    // Clear cache after 5 minutes
    setTimeout(() => {
        conversationCache.delete(conversationId);
    }, 5 * 60 * 1000);

    return history;
}

export default {
    generateEmbedding,
    storeMessageWithEmbedding,
    searchConversations,
    getConversationContext,
    quickRecall,
    getRecentConversationSummary,
    buildConversationHistory,
    getCachedConversation
};
