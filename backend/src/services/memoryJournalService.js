import logger from "../config/logger.js";
import { supabaseAdmin } from "../config/supabase.js";

/**
 * TWIN MEMORY ENGINE V3
 * Creates emotional, meaningful, non-repetitive memories shared between user & Twin.
 *
 * Memories should feel like:
 * “This was an important moment between us.”
 * Not random database logs.
 */

/* --------------------------------------------------------
   MEMORY TYPE DEFINITIONS
-------------------------------------------------------- */
export const MEMORY_TYPES = {
    emotion: {
        threshold: 7,
        auto: true,
        tags: ["emotion", "vulnerability", "trust"],
    },
    achievement: {
        threshold: 8,
        auto: true,
        tags: ["achievement", "growth"],
    },
    breakthrough: {
        threshold: 9,
        auto: true,
        tags: ["insight", "realization"],
    },
    milestone: {
        threshold: 6,
        auto: true,
        tags: ["milestone", "moment"],
    },
    funny: {
        threshold: 4,
        auto: false,
        tags: ["funny", "lighthearted"],
    },
    conversation: {
        threshold: 6,
        auto: true,
        tags: ["conversation", "deep"],
    }
};

/* --------------------------------------------------------
   UTILITY — Prevent duplicate memories
-------------------------------------------------------- */
async function memoryExists(userId, title) {
    const { data } = await supabaseAdmin
        .from("shared_memories")
        .select("id")
        .eq("user_id", userId)
        .ilike("title", title)
        .limit(1);

    return data?.length > 0;
}

/* --------------------------------------------------------
   CREATE MEMORY
-------------------------------------------------------- */
export async function createMemory(userId, mem) {
    try {
        // Prevent duplicates
        if (await memoryExists(userId, mem.title)) {
            logger.info(`⚠️ Memory already exists for user ${userId}: ${mem.title}`);
            return null;
        }

        const { data, error } = await supabaseAdmin
            .from("shared_memories")
            .insert({
                user_id: userId,
                memory_type: mem.type,
                title: mem.title,
                description: mem.description,
                emotional_significance: mem.significance || 5,
                conversation_id: mem.conversationId,
                message_id: mem.messageId,
                tags: mem.tags || [],
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        await createAnniversaries(data.id);

        logger.info(`✨ Created memory: ${mem.title}`);
        return data;

    } catch (error) {
        logger.error("❌ Error creating memory:", error);
        return null;
    }
}

/* --------------------------------------------------------
   AUTO-DETECT IMPORTANT MOMENTS
-------------------------------------------------------- */
export async function detectAndCreateMemory(
    userId,
    conversationId,
    messageId,
    messageText,
    emotional
) {
    try {
        const text = messageText.toLowerCase();

        /* -------------------------------
           1. Emotion / Vulnerability
        -------------------------------- */
        if (emotional.vulnerability >= 70) {
            return await createMemory(userId, {
                type: "emotion",
                title: "A Moment of Vulnerability",
                description: `You opened up deeply: "${messageText.slice(0, 120)}..."`,
                conversationId,
                messageId,
                significance: 8,
                tags: ["vulnerability", "emotion"]
            });
        }

        /* -------------------------------
           2. Achievement
        -------------------------------- */
        if (
            text.includes("achieved") ||
            text.includes("accomplished") ||
            text.includes("finally did") ||
            text.includes("completed")
        ) {
            return await createMemory(userId, {
                type: "achievement",
                title: "Achievement Unlocked",
                description: messageText.slice(0, 200),
                conversationId,
                messageId,
                significance: 8,
                tags: ["achievement"]
            });
        }

        /* -------------------------------
           3. Breakthrough / Realization
        -------------------------------- */
        if (
            text.includes("realized") ||
            text.includes("makes sense now") ||
            text.includes("i understand") ||
            text.includes("i see it clearly")
        ) {
            return await createMemory(userId, {
                type: "breakthrough",
                title: "Breakthrough Moment",
                description: messageText.slice(0, 200),
                conversationId,
                messageId,
                significance: 9,
                tags: ["insight"]
            });
        }

        /* -------------------------------
           4. Funny Moment
        -------------------------------- */
        if (
            text.includes("😂") ||
            text.includes("lol") ||
            text.includes("lmao") ||
            text.includes("dead 💀")
        ) {
            return await createMemory(userId, {
                type: "funny",
                title: "Funny Moment",
                description: messageText.slice(0, 200),
                conversationId,
                messageId,
                significance: 5,
                tags: ["funny"]
            });
        }

    } catch (error) {
        logger.error("❌ Error during memory detection:", error);
    }
}

/* --------------------------------------------------------
   MEMORY TIMELINE
-------------------------------------------------------- */
export async function getMemoryTimeline(userId, options = {}) {
    try {
        let query = supabaseAdmin
            .from("shared_memories")
            .select("*")
            .eq("user_id", userId);

        if (options.type) query = query.eq("memory_type", options.type);
        if (options.minSignificance)
            query = query.gte("emotional_significance", options.minSignificance);
        if (options.limit) query = query.limit(options.limit);

        query = query.order("created_at", { ascending: false });

        const { data, error } = await query;
        if (error) throw error;

        return data || [];

    } catch (error) {
        logger.error("❌ Error fetching timeline:", error);
        return [];
    }
}

/* --------------------------------------------------------
   TOP MEMORIES
-------------------------------------------------------- */
export async function getMemoryHighlights(userId, count = 5) {
    try {
        const { data, error } = await supabaseAdmin
            .from("shared_memories")
            .select("*")
            .eq("user_id", userId)
            .order("emotional_significance", { ascending: false })
            .limit(count);

        if (error) throw error;

        return data || [];

    } catch (error) {
        logger.error("❌ Error getting memory highlights:", error);
        return [];
    }
}

/* --------------------------------------------------------
   REFERENCE MEMORY (Twin recalls it)
-------------------------------------------------------- */
export async function referenceMemory(memoryId) {
    try {
        await supabaseAdmin
            .from("shared_memories")
            .update({
                referenced_count: supabaseAdmin.raw("referenced_count + 1"),
                last_referenced: new Date()
            })
            .eq("id", memoryId);
    } catch (error) {
        logger.error("❌ Error referencing memory:", error);
    }
}

/* --------------------------------------------------------
   ANNIVERSARIES
-------------------------------------------------------- */
async function createAnniversaries(memoryId) {
    try {
        const { data } = await supabaseAdmin
            .from("shared_memories")
            .select("created_at")
            .eq("id", memoryId)
            .single();

        if (!data) return;

        const created = new Date(data.created_at);

        const ranges = [
            { days: 7, type: "week" },
            { days: 30, type: "month" },
            { days: 90, type: "quarter" },
            { days: 180, type: "half-year" },
            { days: 365, type: "year" }
        ];

        for (const r of ranges) {
            const d = new Date(created);
            d.setDate(d.getDate() + r.days);

            await supabaseAdmin.from("memory_anniversaries").insert({
                memory_id: memoryId,
                anniversary_type: r.type,
                anniversary_date: d.toISOString().split("T")[0]
            });
        }
    } catch (error) {
        logger.error("❌ Error creating anniversaries:", error);
    }
}

export async function getUpcomingAnniversaries(userId, daysAhead = 7) {
    try {
        const today = new Date();
        const future = new Date();
        future.setDate(future.getDate() + daysAhead);

        const { data, error } = await supabaseAdmin
            .from("memory_anniversaries")
            .select("*, shared_memories!inner(*)")
            .eq("shared_memories.user_id", userId)
            .gte("anniversary_date", today.toISOString().split("T")[0])
            .lte("anniversary_date", future.toISOString().split("T")[0])
            .eq("notified", false);

        if (error) throw error;

        return data || [];

    } catch (error) {
        logger.error("❌ Error getting anniversaries:", error);
        return [];
    }
}

/* --------------------------------------------------------
   FAVORITES
-------------------------------------------------------- */
export async function toggleMemoryFavorite(memoryId) {
    try {
        const { data } = await supabaseAdmin
            .from("shared_memories")
            .select("is_favorite")
            .eq("id", memoryId)
            .single();

        const current = data?.is_favorite || false;

        await supabaseAdmin
            .from("shared_memories")
            .update({ is_favorite: !current })
            .eq("id", memoryId);

    } catch (error) {
        logger.error("❌ Error toggling favorite:", error);
    }
}

export default {
    createMemory,
    detectAndCreateMemory,
    getMemoryTimeline,
    getMemoryHighlights,
    referenceMemory,
    getUpcomingAnniversaries,
    toggleMemoryFavorite,
    MEMORY_TYPES
};
