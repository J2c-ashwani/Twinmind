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
 * Generate embedding + provider metadata safely through aiService
 */
export async function generateEmbeddingWithMeta(text) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error("Cannot generate embedding for empty text.");
        }

        const result = typeof aiService.generateEmbeddingWithMeta === 'function'
            ? await aiService.generateEmbeddingWithMeta(text)
            : { vector: await aiService.generateEmbedding(text), provider: 'unknown', model: 'unknown' };

        if (!result?.vector || !Array.isArray(result.vector) || !result.vector.some((v) => v !== 0)) {
            throw new Error("Invalid or zero embedding returned by provider.");
        }

        return result;
    } catch (err) {
        logger.error("❌ Embedding generation error:", err.message);
        throw err;
    }
}

/**
 * Generate embedding safely through aiService
 */
export async function generateEmbedding(text) {
    const { vector } = await generateEmbeddingWithMeta(text);
    return vector;
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

        let embeddingResult;
        try {
            embeddingResult = await generateEmbeddingWithMeta(content);
        } catch (embErr) {
            logger.warn(`⚠️ Skipping vector memory insert due to embedding failure: ${embErr.message}`);
            return null;
        }

        const { data, error } = await supabaseAdmin
            .from("memory_vectors")
            .insert({
                user_id: userId,
                content,
                embedding: embeddingResult.vector,
                metadata: {
                    ...metadata,
                    embedding_provider: embeddingResult.provider,
                    embedding_model: embeddingResult.model,
                    stored_at: new Date().toISOString(),
                }
            })
            .select()
            .single();

        if (error) {
            if (error.code === "23503") {
                logger.warn(`⚠️ Skipped memory storage for user ${userId}: user not found or deleted.`);
                return null;
            }
            throw error;
        }

        logger.info(`✨ Memory stored: ${data.id}`);
        return data;
    } catch (err) {
        if (err.code === "23503") return null;
        logger.error("❌ Error storing memory:", err);
        throw err;
    }
}

/**
 * Filter matched vector results for matching embedding space & optional conversation metadata
 */
export function filterRetrievedMemories(results = [], { queryProvider = null, scopeConversationId = null } = {}) {
    return (results || []).filter((m) => {
        const storedProvider = m?.metadata?.embedding_provider;
        if (queryProvider && queryProvider !== 'unknown' && storedProvider && storedProvider !== queryProvider) {
            return false;
        }
        if (scopeConversationId) {
            const rowConvId = m?.conversation_id || m?.metadata?.conversation_id;
            return rowConvId === scopeConversationId;
        }
        return true;
    });
}

/**
 * Retrieve relevant memories using semantic search (Supabase RPC)
 * Note: Long-term memory is intentionally cross-session (per user), not discarded per conversationId.
 */
export async function retrieveMemories(userId, query, options = {}) {
    try {
        const {
            limit = 15,
            threshold = 0.70,
            scopeConversationId = null,
        } = options;

        if (!query || query.trim().length === 0) return [];

        logger.info(`🔍 Retrieving memories for user ${userId}`);

        const { vector: queryEmbedding, provider: queryProvider } = await generateEmbeddingWithMeta(query);

        // Call SQL function match_memories (over-fetch slightly to allow provider-space filtering)
        let { data, error } = await supabaseAdmin.rpc("match_memories", {
            query_embedding: queryEmbedding,
            match_user_id: userId,
            match_threshold: threshold,
            match_count: limit * 2
        });

        if (error) throw error;
        if (!data) data = [];

        const filtered = filterRetrievedMemories(data, {
            queryProvider,
            scopeConversationId,
        }).slice(0, limit);

        logger.info(`📚 Retrieved ${filtered.length} memories`);
        return filtered;
    } catch (err) {
        logger.error("❌ Memory retrieval error:", err);
        return []; // Fail safe
    }
}

/**
 * Store chat memory (User or Twin)
 */
export async function storeChatMemory(userId, message, sender, mode = "normal", conversationId = null) {
    try {
        if (!message || !sender) return;

        const formatted = sender === "user"
            ? `User said: ${message}`
            : `Twin responded: ${message}`;

        return await storeMemory(userId, formatted, {
            type: "chat",
            sender,
            mode,
            ...(conversationId ? { conversation_id: conversationId } : {}),
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
