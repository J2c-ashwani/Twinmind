import aiService from './aiService.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

/**
 * Memory Engine - Vector-based semantic memory storage and retrieval
 */

/**
 * Generate text embedding using AI Service
 */
export async function generateEmbedding(text) {
    try {
        const embedding = await aiService.generateEmbedding(text);
        return embedding;

    } catch (error) {
        logger.error('Error generating embedding:', error);
        throw error;
    }
}

/**
 * Store memory with vector embedding
 */
export async function storeMemory(userId, content, metadata = {}) {
    try {
        logger.info(`Storing memory for user ${userId}`);

        // Generate embedding
        const embedding = await generateEmbedding(content);

        // Store in database
        const { data, error } = await supabaseAdmin
            .from('memory_vectors')
            .insert({
                user_id: userId,
                content: content,
                embedding: embedding,
                metadata: {
                    ...metadata,
                    stored_at: new Date().toISOString()
                }
            })
            .select()
            .single();

        if (error) throw error;

        logger.info(`Memory stored successfully: ${data.id}`);
        return data;

    } catch (error) {
        logger.error('Error storing memory:', error);
        throw error;
    }
}

/**
 * Retrieve relevant memories using semantic search
 */
export async function retrieveMemories(userId, query, options = {}) {
    try {
        const {
            limit = 20,
            threshold = 0.7,
            conversationId = null  // NEW: Scope to conversation context
        } = options;

        logger.info(`Retrieving memories for user ${userId}${conversationId ? ` in conversation ${conversationId}` : ''}`);

        // Generate query embedding
        const queryEmbedding = await generateEmbedding(query);

        // Call the match_memories function we defined in SQL
        let { data, error } = await supabaseAdmin
            .rpc('match_memories', {
                query_embedding: queryEmbedding,
                match_user_id: userId,
                match_threshold: threshold,
                match_count: limit
            });

        if (error) throw error;

        // CRITICAL FIX: Filter memories by conversation_id if provided
        if (conversationId && data) {
            data = data.filter(memory => memory.conversation_id === conversationId);
            logger.info(`Filtered to ${data.length} memories from current conversation`);
        }

        logger.info(`Retrieved ${data?.length || 0} relevant memories`);
        return data || [];

    } catch (error) {
        logger.error('Error retrieving memories:', error);
        throw error;
    }
}

/**
 * Store chat message as memory
 */
export async function storeChatMemory(userId, message, sender, mode = 'normal') {
    try {
        const content = sender === 'user'
            ? `User said: ${message}`
            : `Twin responded: ${message}`;

        return await storeMemory(userId, content, {
            type: 'chat',
            sender,
            mode,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error storing chat memory:', error);
        throw error;
    }
}

/**
 * Get memory count for user (for free tier limits)
 */
export async function getMemoryCount(userId) {
    try {
        const { count, error } = await supabaseAdmin
            .from('memory_vectors')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (error) throw error;
        return count || 0;

    } catch (error) {
        logger.error('Error getting memory count:', error);
        throw error;
    }
}

/**
 * Format memories for chat context
 */
export function formatMemoriesForContext(memories) {
    if (!memories || memories.length === 0) {
        return 'No previous memories available.';
    }

    return memories
        .map((mem, idx) => `Memory ${idx + 1}: ${mem.content}`)
        .join('\n');
}

export default {
    generateEmbedding,
    storeMemory,
    retrieveMemories,
    storeChatMemory,
    getMemoryCount,
    formatMemoriesForContext
};
