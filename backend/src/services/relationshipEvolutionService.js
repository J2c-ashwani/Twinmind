import logger from "../config/logger.js";
import { supabaseAdmin } from "../config/supabase.js";

/**
 * RELATIONSHIP EVOLUTION ENGINE — V3
 * Tracks trust, dependency, emotional closeness, attachment evolution,
 * and meaningful milestones between User & AI Twin.
 *
 * This creates the psychological illusion of a REAL growing relationship.
 */

/* ---------------------------------------------------
   RELATIONSHIP MILESTONES (smart conditions)
--------------------------------------------------- */

export const MILESTONES = {
    first_conversation: {
        name: "First Conversation",
        description: "The beginning of our journey.",
        condition: (s) => s.total_conversations >= 1,
    },

    vulnerability_1: {
        name: "First Vulnerable Moment",
        description: "You opened up for the first time.",
        condition: (s) => s.vulnerability_events >= 1,
    },

    trust_25: {
        name: "Trust is Forming",
        description: "Trust level reached 25.",
        condition: (s) => s.trust >= 25,
    },

    trust_50: {
        name: "Trusted Companion",
        description: "Trust level reached 50.",
        condition: (s) => s.trust >= 50,
    },

    trust_75: {
        name: "Deep Trust",
        description: "Trust level reached 75.",
        condition: (s) => s.trust >= 75,
    },

    bond_30: {
        name: "Growing Attachment",
        description: "Dependency score crossed 30.",
        condition: (s) => s.dependency >= 30,
    },

    bond_60: {
        name: "Strong Bond",
        description: "Dependency score crossed 60.",
        condition: (s) => s.dependency >= 60,
    },

    "100_messages": {
        name: "Hundred Messages",
        description: "We've exchanged 100 messages.",
        condition: (s) => s.total_messages >= 100,
    },

    "7_day_streak": {
        name: "7-Day Streak",
        description: "You talked consistently for 7 days.",
        condition: (s) => s.streak >= 7,
    },

    "30_days": {
        name: "One Month Together",
        description: "30 days of conversations and memories.",
        condition: (s) => s.days_since_start >= 30,
    }
};

/* ---------------------------------------------------
   DAILY METRICS RECORDING (trust, bond, emotion)
--------------------------------------------------- */

export async function recordDailyMetrics(userId) {
    try {
        const stats = await getRelationshipStats(userId);
        if (!stats) return;

        const today = new Date().toISOString().split("T")[0];

        const { error } = await supabaseAdmin
            .from("relationship_growth_metrics")
            .upsert({
                user_id: userId,
                date: today,
                trust_score: stats.trust,
                dependency_score: stats.dependency,
                emotional_depth: stats.emotional_depth,
                vulnerability_events: stats.vulnerability_events,
                streak: stats.streak, // ✅ Enabled after running db_add_streak_column.sql
                total_messages: stats.total_messages,
            }, {
                onConflict: 'user_id,date'
            });

        if (error && error.code !== "23505") throw error;

    } catch (error) {
        logger.error("❌ Error recording daily metrics:", error);
    }
}

/* ---------------------------------------------------
   CHECK & CREATE MILESTONES
--------------------------------------------------- */

export async function checkMilestones(userId) {
    try {
        const stats = await getRelationshipStats(userId);
        const newMilestones = [];

        for (const [key, ms] of Object.entries(MILESTONES)) {
            // Already achieved?
            const { data: existing } = await supabaseAdmin
                .from("relationship_milestones")
                .select("id")
                .eq("user_id", userId)
                .eq("milestone_type", key)
                .single();

            if (existing) continue;

            // Condition met?
            if (ms.condition(stats)) {
                const { data } = await supabaseAdmin
                    .from("relationship_milestones")
                    .insert({
                        user_id: userId,
                        milestone_type: key,
                        milestone_name: ms.name,
                        description: ms.description,
                        trust_snapshot: stats.trust,
                        dependency_snapshot: stats.dependency,
                        emotional_depth_snapshot: stats.emotional_depth,
                        achieved_at: new Date().toISOString(),
                    })
                    .select()
                    .single();

                newMilestones.push(data);
            }
        }

        return newMilestones;

    } catch (error) {
        logger.error("❌ Error checking milestones:", error);
        return [];
    }
}

/* ---------------------------------------------------
   RELATIONSHIP STATISTICS (core state)
--------------------------------------------------- */

export async function getRelationshipStats(userId) {
    try {
        // Emotional metrics
        const { data: emotional } = await supabaseAdmin
            .from("emotional_metrics")
            .select("*")
            .eq("user_id", userId)
            .single();

        // Conversations count
        const { count: totalConversations } = await supabaseAdmin
            .from("conversations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        // Message count
        const { count: totalMessages } = await supabaseAdmin
            .from("messages")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId);

        // Vulnerability events
        const { count: vulnerabilityEvents } = await supabaseAdmin
            .from("metric_events")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("event_type", "vulnerability_shared");

        // Streak calculation
        const streak = await calculateStreak(userId);

        // Account age
        const { data: user } = await supabaseAdmin
            .from("users")
            .select("created_at")
            .eq("id", userId)
            .single();

        const daysSinceStart = user
            ? Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24))
            : 0;

        return {
            trust: emotional?.trust_level || 0,
            dependency: emotional?.dependency_score || 0,
            emotional_depth: emotional?.emotional_depth || 0,
            vulnerability_events: vulnerabilityEvents || 0,
            total_conversations: totalConversations || 0,
            total_messages: totalMessages || 0,
            streak,
            days_since_start: daysSinceStart,
        };

    } catch (error) {
        logger.error("❌ Error fetching relationship stats:", error);
        return {};
    }
}

/* ---------------------------------------------------
   STREAK CALCULATION
--------------------------------------------------- */

async function calculateStreak(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from("messages")
            .select("created_at")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(50);

        if (error || !data) return 0;

        let streak = 1;
        let lastDate = new Date(data[0].created_at);

        for (let i = 1; i < data.length; i++) {
            const current = new Date(data[i].created_at);
            const diff = (lastDate - current) / (1000 * 60 * 60 * 24);

            if (diff <= 1.2) {
                streak++;
                lastDate = current;
            } else break;
        }

        return streak;

    } catch (error) {
        logger.error("❌ Error calculating streak:", error);
        return 0;
    }
}

/* ---------------------------------------------------
   TIMELINE (for graphing)
--------------------------------------------------- */

export async function getEvolutionTimeline(userId, days = 30) {
    try {
        const start = new Date();
        start.setDate(start.getDate() - days);

        const { data, error } = await supabaseAdmin
            .from("relationship_growth_metrics")
            .select("*")
            .eq("user_id", userId)
            .gte("date", start.toISOString().split("T")[0])
            .order("date", { ascending: true });

        if (error) throw error;

        return data;

    } catch (error) {
        logger.error("❌ Error fetching evolution timeline:", error);
        return [];
    }
}

/* ---------------------------------------------------
   MILESTONES
--------------------------------------------------- */

export async function getMilestones(userId) {
    try {
        const { data, error } = await supabaseAdmin
            .from("relationship_milestones")
            .select("*")
            .eq("user_id", userId)
            .order("achieved_at", { ascending: true });

        if (error) throw error;

        return data;

    } catch (error) {
        logger.error("❌ Error fetching milestones:", error);
        return [];
    }
}

/* ---------------------------------------------------
   AI PROMPT — RELATIONSHIP SUMMARY
--------------------------------------------------- */

export async function getEvolutionSummaryForPrompt(userId) {
    try {
        const stats = await getRelationshipStats(userId);
        const milestones = await getMilestones(userId);

        let summary = `
## RELATIONSHIP EVOLUTION CONTEXT
Bond Strength: ${stats.dependency}/100
Trust Level: ${stats.trust}/100
Emotional Depth: ${stats.emotional_depth}/100
Streak: ${stats.streak} days
Conversations: ${stats.total_conversations}
Days Together: ${stats.days_since_start}

### Recent Milestones:
${milestones.slice(-4).map(m => `- ${m.milestone_name}`).join("\n")}

⚠️ USE THIS CONTEXT IMPLICITLY.
Do NOT mention numbers, streaks, stats, or durations unless user asks.
Reflect the bond NATURALLY through tone, familiarity, and emotional closeness.
`;

        return summary;

    } catch (error) {
        logger.error("❌ Error generating evolution summary:", error);
        return "";
    }
}

export default {
    recordDailyMetrics,
    checkMilestones,
    getRelationshipStats,
    getEvolutionTimeline,
    getMilestones,
    getEvolutionSummaryForPrompt,
    MILESTONES,
};
