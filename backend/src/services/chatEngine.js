import aiService from './aiService.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';
import { getPersonality } from './personalityEngine.js';
import { buildModePrompt } from './modeManager.js';
import { retrieveMemories, formatMemoriesForContext, storeChatMemory } from './memoryEngine.js';

/**
 * Chat Engine - Generates AI twin responses based on personality and memories
 */

/**
 * Generate a chat response from the AI twin
 * @param {string} userId - User ID
 * @param {string} userMessage - User's message
 * @param {string} mode - Twin mode (normal, future, dark, therapist)
 * @param {string} behavioralModifiers - Optional behavioral engagement modifiers
 * @returns {Promise<string>} - AI response
 */
export async function generateChatResponse(userId, userMessage, mode = 'normal', behavioralModifiers = '', conversationId = null) {
    try {
        logger.info(`Generating chat response for user ${userId} in ${mode} mode`);

        // 1. Get user's personality profile
        const personality = await getPersonality(userId);
        if (!personality) {
            throw new Error('Personality profile not found. Please complete the personality assessment first.');
        }

        // 2. Get user info for personalization
        const { data: user } = await supabaseAdmin
            .from('users')
            .select('full_name')
            .eq('id', userId)
            .single();

        const userName = user?.full_name || 'User';

        // 3. Retrieve relevant memories (OPTIONAL - gracefully handle failure)
        let memories = [];
        try {
            memories = await retrieveMemories(userId, userMessage, {
                limit: 5, // Reduced from 20 to avoid context flooding
                threshold: 0.75, // Increased threshold for higher relevance
                conversationId: conversationId // CRITICAL: Scope memories to current conversation only
            });
        } catch (memoryError) {
            logger.warn('Memory retrieval failed, continuing without memories:', memoryError.message);
            // Continue without memories - chat will still work
        }

        // 4. Build system prompt with personality, mode, and behavioral modifiers
        const baseSystemPrompt = buildModePrompt(
            personality.personality_json,
            mode,
            userName,
            behavioralModifiers // Add behavioral engagement layer
        );

        // 5. Format memories for context (if available)
        let fullSystemPrompt = baseSystemPrompt;
        if (memories.length > 0) {
            const memoryContext = formatMemoriesForContext(memories);
            fullSystemPrompt = `${baseSystemPrompt}\n\nRELEVANT MEMORIES (Use only if directly relevant):\n${memoryContext}\n\nNote: Prioritize the current conversation context over these memories if they conflict.`;
        }

        // 6. Get recent chat history for continuity
        let historyQuery = supabaseAdmin
            .from('chat_history')
            .select('message, sender, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

        if (conversationId) {
            historyQuery = historyQuery.eq('conversation_id', conversationId);
        }

        const { data: recentChats } = await historyQuery;

        // DEBUG: Log what history is being retrieved
        logger.info(`Retrieved ${recentChats?.length || 0} chat history messages for conversation ${conversationId || 'none'}`);

        const conversationHistory = recentChats
            ?.reverse()
            .map(chat => ({
                sender_type: chat.sender,
                content: chat.message
            })) || [];

        // DEBUG: Log conversation history details
        logger.info(`Conversation history has ${conversationHistory.length} messages`);
        if (conversationHistory.length > 0) {
            logger.info(`First history message: ${JSON.stringify(conversationHistory[0])}`);
        }
        logger.info(`Memories retrieved: ${memories.length}`);

        // 7. Determine Task Type based on Mode
        let taskType = 'default';
        switch (mode) {
            case 'normal': taskType = 'personality_core'; break;
            case 'future': taskType = 'deep_reasoning'; break;
            case 'therapist': taskType = 'emotional_support'; break;
            case 'dark': taskType = 'creative_writing'; break;
            default: taskType = 'default';
        }

        // 8. Generate AI response using AI Service (Zero Cost)
        const aiMessage = await aiService.generateChatResponse(
            userMessage,
            conversationHistory,
            fullSystemPrompt,
            taskType // Pass task type for smart routing
        );

        // 8. Store chat messages in history (Moved below to include conversation_id)

        // 9. Store as memory for future context (OPTIONAL - gracefully handle failure)
        try {
            await storeChatMemory(userId, userMessage, 'user', mode);
            await storeChatMemory(userId, aiMessage, 'ai', mode);
        } catch (storageError) {
            logger.warn('Memory storage failed, skipping:', storageError.message);
            // Continue - chat works even if memory storage fails
        }

        logger.info(`Chat response generated successfully for user ${userId}`);

        return {
            message: aiMessage,
            mode: mode,
            timestamp: new Date().toISOString(),
            memoriesUsed: memories.length
        };

    } catch (error) {
        logger.error('Error generating chat response:', error);
        throw new Error(`Chat generation failed: ${error.message}`);
    }
}

/**
 * Get chat history
 */
export async function getChatHistory(userId, options = {}) {
    try {
        const { limit = 50, mode = null } = options;

        let query = supabaseAdmin
            .from('chat_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (mode) {
            query = query.eq('mode', mode);
        }

        if (options.conversationId) {
            query = query.eq('conversation_id', options.conversationId);
        }

        const { data, error } = await query;

        if (error) throw error;

        return data?.reverse() || [];

    } catch (error) {
        logger.error('Error fetching chat history:', error);
        throw error;
    }
}

/**
 * Clear chat history
 */
export async function clearChatHistory(userId, mode = null) {
    try {
        let query = supabaseAdmin
            .from('chat_history')
            .delete()
            .eq('user_id', userId);

        if (mode) {
            query = query.eq('mode', mode);
        }

        const { error } = await query;
        if (error) throw error;

        logger.info(`Chat history cleared for user ${userId}${mode ? ` in ${mode} mode` : ''}`);
        return { success: true };

    } catch (error) {
        logger.error('Error clearing chat history:', error);
        throw error;
    }
}

export default {
    generateChatResponse,
    getChatHistory,
    clearChatHistory
};
