import logger from "../config/logger.js";
import { supabaseAdmin } from "../config/supabase.js";

/**
 * Life Context Service — TWIN OPTIMIZED
 * Tracks important people, goals, and ongoing situations in user’s life.
 * These contexts help the Twin speak as if it genuinely remembers the user's world.
 */

/* --------------------------------------------------------
   1. Extract Life Context From User Message
-------------------------------------------------------- */
export async function extractLifeContext(userId, message, conversationId = null) {
    try {
        const contexts = [];

        const lower = message.toLowerCase();

        /* -------------------------
           A. Detect People
        -------------------------- */

        // Detect mentions like:
        // "my girlfriend Priya", "my friend Rohan", "my boss Amit"
        const relationshipPatterns = [
            /(my)\s+(sister|brother|mom|dad|mother|father|friend|boss|partner|wife|husband|boyfriend|girlfriend|colleague)\s+([A-Z][a-zA-Z]+)/g,
            /([A-Z][a-zA-Z]+)\s+is\s+my\s+(friend|boss|partner|girlfriend|boyfriend|colleague)/gi
        ];

        for (const pattern of relationshipPatterns) {
            const matches = [...message.matchAll(pattern)];

            for (const m of matches) {
                const name = m[3] || m[1];
                const relationship = m[2] || m[4] || "person";

                contexts.push({
                    type: "person",
                    name,
                    relationship,
                    importance: relationship === "girlfriend" || relationship === "boyfriend" ? 10 : 7,
                    source_message: message
                });
            }
        }

        /* -------------------------
           B. Detect Goals (Ambitions, Plans)
        -------------------------- */
        const goalMatch = message.match(/(i want to|i need to|i'm trying to|my goal is to)\s+([^.!?]+)/i);
        if (goalMatch) {
            contexts.push({
                type: "goal",
                name: goalMatch[2].trim(),
                status: "active",
                importance: 8,
                source_message: message
            });
        }

        /* -------------------------
           C. Detect Situations (stress, problems)
        -------------------------- */
        const situationMatch = message.match(/(dealing with|struggling with|facing|stuck with)\s+([^.!?]+)/i);
        if (situationMatch) {
            contexts.push({
                type: "situation",
                name: situationMatch[2].trim(),
                status: "ongoing",
                importance: 7,
                source_message: message
            });
        }

        /* -------------------------
           Save Extracted Contexts
        -------------------------- */
        for (const ctx of contexts) {
            await createOrUpdateContext(userId, ctx, conversationId);
        }

        return contexts;
    } catch (error) {
        logger.error("❌ Error extracting life context:", error);
        return [];
    }
}

/* --------------------------------------------------------
   2. Create or Update Context
-------------------------------------------------------- */
export async function createOrUpdateContext(userId, ctx, conversationId) {
    try {
        // Check if context already exists
        const { data: existing } = await supabaseAdmin
            .from("life_context")
            .select("*")
            .eq("user_id", userId)
            .eq("context_type", ctx.type)
            .ilike("name", ctx.name)
            .single();

        if (existing) {
            // Update the record: boost importance, increment mentions
            await supabaseAdmin
                .from("life_context")
                .update({
                    last_mentioned: new Date(),
                    mention_count: existing.mention_count + 1,
                    importance: Math.min(10, Math.max(existing.importance, ctx.importance)),
                    relationship: ctx.relationship || existing.relationship,
                    status: ctx.status || existing.status
                })
                .eq("id", existing.id);

            return existing;
        }

        // Insert new context
        const { data, error } = await supabaseAdmin
            .from("life_context")
            .insert({
                user_id: userId,
                context_type: ctx.type,
                name: ctx.name,
                relationship: ctx.relationship || null,
                importance: ctx.importance || 6,
                status: ctx.status || "active",
                mention_count: 1,
                details: ctx.details || {},
                created_at: new Date(),
                last_mentioned: new Date()
            })
            .select()
            .single();

        if (error) throw error;

        return data;
    } catch (error) {
        logger.error("❌ Error creating/updating context:", error.message);
        return null;
    }
}

/* --------------------------------------------------------
   3. User Life Context (raw data)
-------------------------------------------------------- */
export async function getUserLifeContext(userId, options = {}) {
    try {
        let query = supabaseAdmin
            .from("life_context")
            .select("*")
            .eq("user_id", userId);

        if (options.type) query = query.eq("context_type", options.type);
        if (options.status) query = query.eq("status", options.status);
        if (options.minImportance) query = query.gte("importance", options.minImportance);

        const { data, error } = await query.order("importance", { ascending: false });

        if (error) throw error;
        return data || [];
    } catch (error) {
        logger.error("❌ Error getting life context:", error);
        return [];
    }
}

/* --------------------------------------------------------
   4. Build AI Prompt Context Block
-------------------------------------------------------- */
export async function getContextForPrompt(userId, limit = 10) {
    try {
        const { data, error } = await supabaseAdmin
            .from("life_context")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "active")
            .gte("importance", 6)
            .order("last_mentioned", { ascending: false })
            .limit(limit);

        if (error) throw error;
        if (!data?.length) return "";

        let prompt = `\n## USER LIFE CONTEXT\n`;
        prompt += `These are important people, goals, and situations in the user's life. Refer to them naturally.\n\n`;

        const people = data.filter((c) => c.context_type === "person");
        const goals = data.filter((c) => c.context_type === "goal");
        const situations = data.filter((c) => c.context_type === "situation");

        if (people.length) {
            prompt += `### People:\n`;
            people.forEach((p) => {
                prompt += `- **${p.name}** (${p.relationship}) — Mentioned ${p.mention_count} times\n`;
            });
            prompt += `\n`;
        }

        if (goals.length) {
            prompt += `### Goals:\n`;
            goals.forEach((g) => {
                prompt += `- ${g.name} (${g.status})\n`;
            });
            prompt += `\n`;
        }

        if (situations.length) {
            prompt += `### Situations:\n`;
            situations.forEach((s) => {
                prompt += `- ${s.name} (${s.status})\n`;
            });
            prompt += `\n`;
        }

        return prompt;
    } catch (error) {
        logger.error("❌ Error generating prompt context:", error);
        return "";
    }
}

/* --------------------------------------------------------
   5. Update Context Status
-------------------------------------------------------- */
export async function updateContextStatus(contextId, newStatus) {
    try {
        await supabaseAdmin
            .from("life_context")
            .update({ status: newStatus })
            .eq("id", contextId);
    } catch (error) {
        logger.error("❌ Error updating context status:", error);
    }
}

/* --------------------------------------------------------
   6. Emotional Association Tracking
-------------------------------------------------------- */
export async function updateContextEmotions(contextId, emotion, increment = 1) {
    try {
        const { data: context } = await supabaseAdmin
            .from("life_context")
            .select("emotional_associations")
            .eq("id", contextId)
            .single();

        const emo = context?.emotional_associations || {
            positive: 0,
            negative: 0,
            neutral: 0,
        };

        if (emotion === "positive") emo.positive += increment;
        else if (emotion === "negative") emo.negative += increment;
        else emo.neutral += increment;

        await supabaseAdmin
            .from("life_context")
            .update({ emotional_associations: emo })
            .eq("id", contextId);
    } catch (error) {
        logger.error("❌ Error updating context emotions:", error);
    }
}

export default {
    extractLifeContext,
    createOrUpdateContext,
    getUserLifeContext,
    getContextForPrompt,
    updateContextStatus,
    updateContextEmotions,
};
