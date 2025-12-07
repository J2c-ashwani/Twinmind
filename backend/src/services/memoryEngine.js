// memoryEngine.js (Fully rewritten)

import aiService from './aiService.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

/**
 * ======================================================
 * MEMORY ENGINE — VECTOR MEMORY + SEMANTIC RETRIEVAL
 * ======================================================
 */

/**
 * Generate embedding safely through aiService
 */
export async function generateEmbedding(text) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error("Cannot generate embedding for empty text.");
        }

        const embedding = await aiService.generateEmbedding(text);

        if (!embedding || !Array.isArray(embedding)) {
            throw new Error("Invalid embedding returned by provider.");
        }

        return embedding;
    } catch (err) {
        logger.error("❌ Embedding generation error:", err);
        throw err;
    }
}

/**
 * Prevent storing duplicate or meaningless memories
 */
async function isDuplicateMemory(userId, content) {
    const { data, error } = await supabaseAdmin
        .from("memory_vectors")
        .select("content")
        .eq("user_id", userId)
        .order("id", { ascending: false })
        .limit(3);

    if (error) {
        logger.error("Error checking duplicate memory:", error);
        return false;
    }

    if (!data) return false;

    return data.some(m => m.content.trim() === content.trim());
}

/**
 * Store memory (embedding + metadata)
 */
export async function storeMemory(userId, content, metadata = {}) {
    try {
        if (!content || content.trim().length === 0) return null;

        // Prevent duplicate storage
        const isDuplicate = await isDuplicateMemory(userId, content);
        if (isDuplicate) {
            logger.info("⚠️ Skipped duplicate memory.");
            return null;
        }

        logger.info(`🧠 Storing memory for user ${userId}`);

        const embedding = await generateEmbedding(content);

        const { data, error } = await supabaseAdmin
            .from("memory_vectors")
            .insert({
                user_id: userId,
                content,
                embedding,
                metadata: {
                    ...metadata,
                    stored_at: new Date().toISOString(),
                }
            })
            .select()
            .single();

        if (error) throw error;

        logger.info(`✨ Memory stored: ${data.id}`);
        return data;
    } catch (err) {
        logger.error("❌ Error storing memory:", err);
        throw err;
    }
}

/**
 * Retrieve relevant memories using semantic search (Supabase RPC)
 */
export async function retrieveMemories(userId, query, options = {}) {
    try {
        const {
            limit = 15,
            threshold = 0.70,
            conversationId = null,
        } = options;

        if (!query || query.trim().length === 0) return [];

        logger.info(`🔍 Retrieving memories for user ${userId}`);

        const queryEmbedding = await generateEmbedding(query);

        // Call SQL function match_memories
        let { data, error } = await supabaseAdmin.rpc("match_memories", {
            query_embedding: queryEmbedding,
            match_user_id: userId,
            match_threshold: threshold,
            match_count: limit
        });

        if (error) throw error;
        if (!data) data = [];

        // Filter by conversation context
        if (conversationId) {
            data = data.filter(m => m.conversation_id === conversationId);
        }

        logger.info(`📚 Retrieved ${data.length} memories`);
        return data;
    } catch (err) {
        logger.error("❌ Memory retrieval error:", err);
        return []; // Fail safe
    }
}

/**
 * Store chat memory (User or Twin)
 */
export async function storeChatMemory(userId, message, sender, mode = "normal") {
    try {
        if (!message || !sender) return;

        const formatted = sender === "user"
            ? `User said: ${message}`
            : `Twin responded: ${message}`;

        return await storeMemory(userId, formatted, {
            type: "chat",
            sender,
            mode,
            timestamp: new Date().toISOString(),
        });

    } catch (err) {
        logger.error("❌ Error storing chat memory:", err);
    }
}

/**
 * Count user memories (for limits / plans)
 */
export async function getMemoryCount(userId) {
    try {
        const { count, error } = await supabaseAdmin
            .from("memory_vectors")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        if (error) throw error;

        return count || 0;
    } catch (err) {
        logger.error("❌ Error getting memory count:", err);
        return 0;
    }
}

/**
 * Format memories into string for LLM context
 */
export function formatMemoriesForContext(memories = []) {
    if (memories.length === 0) return null;

    return memories
        .map(
            (m, i) =>
                `Memory ${i + 1}: ${m.content}`
        )
        .join("\n");
}

export default {
    generateEmbedding,
    storeMemory,
    retrieveMemories,
    storeChatMemory,
    getMemoryCount,
    formatMemoriesForContext
};
