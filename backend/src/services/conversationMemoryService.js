import logger from "../config/logger.js";
import { supabaseAdmin } from "../config/supabase.js";
import aiService from "./aiService.js";

/**
 * Conversation Memory Service (Twin-Optimized)
 * - Stores message embeddings
 * - Performs semantic search
 * - Helps SmartContextManager recall relevant past conversations
 */

/* --------------------------------------------------------
   1. Generate Embedding
-------------------------------------------------------- */
export async function generateEmbeddingWithMeta(text, options = {}) {
    try {
        if (typeof aiService.generateEmbeddingWithMeta === 'function') {
            return await aiService.generateEmbeddingWithMeta(text, options);
        }
        const vector = await aiService.generateEmbedding(text, options);
        return { vector, provider: 'unknown', model: 'unknown', dimensions: vector?.length || 1536 };
    } catch (error) {
        logger.error("❌ Error generating embedding:", error.message);
        throw error;
    }
}

export async function generateEmbedding(text, options = {}) {
    const { vector } = await generateEmbeddingWithMeta(text, options);
    return vector;
}

/* --------------------------------------------------------
   2. Store Message With Embedding
-------------------------------------------------------- */
export async function storeMessageWithEmbedding(messageId, userId, content, conversationId = null) {
    try {
        if (!userId || !content || !String(content).trim()) return;
        const emb = await generateEmbeddingWithMeta(content, { taskType: 'RETRIEVAL_DOCUMENT' });

        const basePayload = {
            message_id: messageId,
            user_id: userId,
            conversation_id: conversationId,
            content,
            embedding: emb.vector,
        };

        let { error } = await supabaseAdmin
            .from("message_embeddings")
            .insert({
                ...basePayload,
                embedding_provider: emb.provider,
                embedding_model: emb.model,
                embedding_dimensions: emb.dimensions || emb.vector.length,
            });

        if (error && (error.code === '42703' || error.code === 'PGRST204' || /embedding_(provider|model|dimensions)/i.test(error.message || ''))) {
            ({ error } = await supabaseAdmin.from("message_embeddings").insert(basePayload));
        }

        if (error) throw error;

        logger.info(`✅ Stored embedding for message ${messageId} (${emb.provider}/${emb.model})`);
    } catch (error) {
        logger.error("❌ Error storing message embedding:", error.message);
    }
}

/* --------------------------------------------------------
   3. Semantic Search Across Conversation Memory
-------------------------------------------------------- */
export async function searchSimilarConversations(userId, query, limit = 5) {
    try {
        if (!userId || !query || !String(query).trim()) return [];
        const queryEmb = await generateEmbeddingWithMeta(query, { taskType: 'RETRIEVAL_QUERY' });

        let { data, error } = await supabaseAdmin.rpc("search_conversations", {
            query_embedding: queryEmb.vector,
            match_threshold: 0.70,
            match_count: limit,
            p_user_id: userId,
            p_embedding_provider: queryEmb.provider,
            p_embedding_model: queryEmb.model,
        });

        // Fallback if live database still runs pre-migration 4-arg search_conversations RPC
        if (error && (error.code === 'PGRST202' || /search_conversations/i.test(error.message || ''))) {
            ({ data, error } = await supabaseAdmin.rpc("search_conversations", {
                query_embedding: queryEmb.vector,
                match_threshold: 0.70,
                match_count: limit * 3,
                p_user_id: userId,
            }));
        }

        if (error) throw error;

        return (data || [])
            .filter((row) => {
                if (row?.embedding_provider && queryEmb.provider !== 'unknown' && row.embedding_provider !== queryEmb.provider) {
                    return false;
                }
                if (row?.embedding_model && queryEmb.model !== 'unknown' && row.embedding_model !== queryEmb.model) {
                    return false;
                }
                return true;
            })
            .slice(0, limit);
    } catch (error) {
        logger.error("❌ Error searching conversations:", error.message);
        return [];
    }
}

/* --------------------------------------------------------
   4. Build Context Block for Twin Prompt
-------------------------------------------------------- */
export async function getConversationContext(userId, topic, limit = 3) {
    try {
        const results = await searchSimilarConversations(userId, topic, limit);
        if (!results?.length) return null;

        let context = `\n## RELEVANT PAST CONVERSATIONS ABOUT "${topic}"\n\n`;

        results.forEach((r, i) => {
            const date = new Date(r.created_at).toLocaleString();
            context += `${i + 1}. (${Math.round(r.similarity * 100)}% match | ${date})\n`;
            context += `"${r.content}"\n\n`;
        });

        return {
            context,
            memories: results,
        };
    } catch (error) {
        logger.error("❌ Error building conversation context:", error.message);
        return null;
    }
}

/* --------------------------------------------------------
   5. FAST Recall — triggered when user says "remember when..."
-------------------------------------------------------- */
export async function quickRecall(userId, userMessage) {
    try {
        const recallPatterns = [
            /remember when/i,
            /you said/i,
            /we talked about/i,
            /i told you/i,
            /last time/i,
            /earlier/i,
            /before/i,
            /what did we say/i,
            /do you remember/i,
        ];

        const wantsRecall = recallPatterns.some((p) => p.test(userMessage));
        if (!wantsRecall) return null;

        const topic = extractTopic(userMessage);

        const results = await searchSimilarConversations(
            userId,
            topic || userMessage,
            5
        );

        if (!results.length) {
            return {
                found: false,
                message: "Hmm… I don’t clearly remember that one. Tell me again?",
            };
        }

        const top = results[0];
        const date = new Date(top.created_at).toLocaleDateString();

        return {
            found: true,
            quickResponse: `Yeah, I remember — around ${date} we talked about this: "${top.content.slice(
                0,
                200
            )}..."`,
            memories: results,
        };
    } catch (error) {
        logger.error("❌ Recall error:", error.message);
        return null;
    }
}

/* --------------------------------------------------------
   6. Topic Extraction (Smart, Minimal)
-------------------------------------------------------- */
function extractTopic(message) {
    return message
        .replace(/remember when/i, "")
        .replace(/we talked about/i, "")
        .replace(/you said/i, "")
        .replace(/i told you/i, "")
        .replace(/last time/i, "")
        .replace(/do you remember/i, "")
        .replace(/what did we say/i, "")
        .trim();
}

/* --------------------------------------------------------
   7. Weekly Conversation Summary
-------------------------------------------------------- */
export async function getRecentConversationSummary(userId, days = 7) {
    try {
        const start = new Date();
        start.setDate(start.getDate() - days);

        const { data, error } = await supabaseAdmin
            .from("chat_history")
            .select("message, created_at, sender")
            .eq("user_id", userId)
            .gte("created_at", start.toISOString())
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data?.length)
            return { total_messages: 0, topics: [], date_range: "No data" };

        const topics = {};

        // Extract simple keywords
        data.forEach((msg) => {
            const contentText = msg.message || "";
            const words = contentText.toLowerCase().split(" ");
            const keywords = words.filter((w) => w.length > 5);

            keywords.forEach((word) => {
                if (!topics[word]) topics[word] = [];
                topics[word].push(msg);
            });
        });

        return {
            total_messages: data.length,
            date_range: `${start.toLocaleDateString()} → ${new Date().toLocaleDateString()}`,
            topics: Object.keys(topics).slice(0, 10),
        };
    } catch (error) {
        logger.error("❌ Weekly summary error:", error.message);
        return null;
    }
}

/* --------------------------------------------------------
   8. Build Timeline (conversation history for AI)
-------------------------------------------------------- */
export async function buildConversationHistory(userId, conversationId, limit = 20) {
    try {
        if (!userId || !conversationId) {
            return [];
        }

        const { data, error } = await supabaseAdmin
            .from("chat_history")
            .select("message, sender, created_at")
            .eq("conversation_id", conversationId)
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((msg) => ({
            role: msg.sender === "user" ? "user" : "assistant",
            content: msg.message,
        }));
    } catch (error) {
        logger.error("❌ Error building conversation history:", error.message);
        return [];
    }
}

/* --------------------------------------------------------
   9. Bounded In-Memory Cache (5-minute auto-expire)
-------------------------------------------------------- */
const MAX_CONVERSATION_CACHE = 200;
const conversationCache = new Map();

export async function getCachedConversation(userId, conversationId) {
    if (!userId || !conversationId) {
        return [];
    }

    const cacheKey = `${userId}:${conversationId}`;
    const existing = conversationCache.get(cacheKey);
    if (existing) {
        return existing.history;
    }

    const history = await buildConversationHistory(userId, conversationId);

    if (conversationCache.size >= MAX_CONVERSATION_CACHE) {
        const oldestKey = conversationCache.keys().next().value;
        const oldest = conversationCache.get(oldestKey);
        if (oldest?.timer) clearTimeout(oldest.timer);
        conversationCache.delete(oldestKey);
    }

    const timer = setTimeout(() => {
        conversationCache.delete(cacheKey);
    }, 5 * 60 * 1000);
    if (typeof timer.unref === 'function') timer.unref();

    conversationCache.set(cacheKey, { history, timer });
    return history;
}

/* --------------------------------------------------------
   Export
-------------------------------------------------------- */
export default {
    generateEmbedding,
    storeMessageWithEmbedding,
    searchSimilarConversations,
    getConversationContext,
    quickRecall,
    getRecentConversationSummary,
    buildConversationHistory,
    getCachedConversation,
};
