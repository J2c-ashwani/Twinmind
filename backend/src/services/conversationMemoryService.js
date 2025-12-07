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
export async function generateEmbedding(text) {
    try {
        return await aiService.generateEmbedding(text);
    } catch (error) {
        logger.error("❌ Error generating embedding:", error.message);
        throw error;
    }
}

/* --------------------------------------------------------
   2. Store Message With Embedding
-------------------------------------------------------- */
export async function storeMessageWithEmbedding(messageId, userId, content, conversationId = null) {
    try {
        const embedding = await generateEmbedding(content);

        const { error } = await supabaseAdmin
            .from("message_embeddings")
            .insert({
                message_id: messageId,
                user_id: userId,
                conversation_id: conversationId,
                content,
                embedding,
            });

        if (error) throw error;

        logger.info(`✅ Stored embedding for message ${messageId}`);
    } catch (error) {
        logger.error("❌ Error storing message embedding:", error.message);
    }
}

/* --------------------------------------------------------
   3. Semantic Search Across Conversation Memory
-------------------------------------------------------- */
export async function searchSimilarConversations(userId, query, limit = 5) {
    try {
        const queryEmbedding = await generateEmbedding(query);

        const { data, error } = await supabaseAdmin.rpc("search_conversations", {
            query_embedding: queryEmbedding,
            match_threshold: 0.70,
            match_count: limit,
            p_user_id: userId,
        });

        if (error) throw error;

        return data || [];
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
            .from("messages")
            .select("content, created_at, sender_type")
            .eq("user_id", userId)
            .gte("created_at", start.toISOString())
            .order("created_at", { ascending: false });

        if (error) throw error;

        if (!data?.length)
            return { total_messages: 0, topics: [], date_range: "No data" };

        const topics = {};

        // Extract simple keywords
        data.forEach((msg) => {
            const words = msg.content.toLowerCase().split(" ");
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
        const { data, error } = await supabaseAdmin
            .from("messages")
            .select("content, sender_type, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((msg) => ({
            role: msg.sender_type === "user" ? "user" : "assistant",
            content: msg.content,
        }));
    } catch (error) {
        logger.error("❌ Error building conversation history:", error.message);
        return [];
    }
}

/* --------------------------------------------------------
   9. In-Memory Cache (5-minute auto-expire)
-------------------------------------------------------- */
const conversationCache = new Map();

export async function getCachedConversation(conversationId) {
    if (conversationCache.has(conversationId)) {
        return conversationCache.get(conversationId);
    }

    const history = await buildConversationHistory(null, conversationId);
    conversationCache.set(conversationId, history);

    setTimeout(() => conversationCache.delete(conversationId), 5 * 60 * 1000);

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
