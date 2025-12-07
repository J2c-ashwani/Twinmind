// chatEngine.js — BEST OPTIMIZED VERSION FOR FREE AI APIs

import aiService from './aiService.js';
import promptOptimizer from './promptOptimizer.js';
import { supabaseAdmin } from '../config/supabase.js';
import logger from '../config/logger.js';

import { getPersonality } from './personalityEngine.js';
import { buildModePrompt } from './modeManager.js';

import { retrieveMemories, storeChatMemory } from './memoryEngine.js';
import { extractLifeContext, getContextForPrompt } from './lifeContextService.js';

import { detectGenZUsage, mirrorUserStyle } from './genZLanguageService.js';

import smartContextManager from './smartContextManager.js';
import { detectAndCreateMemory } from './memoryJournalService.js';
import { recordDailyMetrics, getEvolutionSummaryForPrompt } from './relationshipEvolutionService.js';

/* ---------------------------------------
   INTERNAL HELPERS
--------------------------------------- */

function withTimeout(promise, ms = 10000) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("TIMEOUT")), ms))
    ]);
}

function sanitize(text = "") {
    // Handle non-string inputs
    if (typeof text !== 'string') {
        if (text && typeof text === 'object' && text.message) {
            text = String(text.message);
        } else {
            text = String(text || "");
        }
    }
    return text
        .replace(/As an AI[^.]+/gi, "")
        .replace(/I cannot[^.]+/gi, "")
        .replace(/I am an AI[^.]+/gi, "")
        .replace(/^(Sure|Certainly|Of course)[.,\s]*/gi, "")
        .trim();
}

function detectEmotion(message = "") {
    const s = message.toLowerCase();
    if (s.includes("sad") || s.includes("cry") || s.includes("hurt")) return "sad";
    if (s.includes("angry") || s.includes("fight") || s.includes("annoyed")) return "angry";
    if (s.includes("excited") || s.includes("hyped") || s.includes("omg")) return "excited";
    return "neutral";
}

/* ---------------------------------------
   MAIN CHAT ENGINE
--------------------------------------- */

export async function generateChatResponse(
    userId,
    userMessage,
    mode = "normal",
    behavioralModifiers = "",
    conversationId = null
) {
    try {
        logger.info(`➡️ Chat request from ${userId} [mode=${mode}]`);

        /* 1. LOAD DATA IN PARALLEL (faster!) */
        const [personality, userData, recentChats] = await Promise.all([
            getPersonality(userId),
            supabaseAdmin.from("users").select("full_name").eq("id", userId).single(),
            supabaseAdmin.from("chat_history").select("message, sender").eq("user_id", userId).order("created_at", { ascending: false }).limit(6)
        ]);

        if (!personality) throw new Error("Personality not found");
        const userName = userData?.data?.full_name || "User";

        const conversationHistory = (recentChats?.data || [])
            .reverse()
            .map(m => ({ sender_type: m.sender, content: m.message }));

        /* 2. GEN Z DETECTION */
        const genZ = detectGenZUsage(userMessage);

        /* 3. CONDITIONAL MEMORY RETRIEVAL (only if needed) */
        const memoryTriggers = [/remember/i, /last time/i, /we talked/i, /you said/i];
        const shouldFetchMemory = memoryTriggers.some(p => p.test(userMessage));

        let memoryContent = [];
        if (shouldFetchMemory) {
            try {
                const memories = await retrieveMemories(userId, userMessage, { limit: 5, threshold: 0.72, conversationId });
                memoryContent = memories?.map(m => m.content) || [];
            } catch (err) {
                logger.warn("Memory retrieval failed:", err?.message);
            }
        }

        /* 5. SYSTEM PROMPT BUILDING */
        let systemPrompt = buildModePrompt(
            personality.personality_json,
            mode,
            userName,
            memoryContent
        );

        if (behavioralModifiers?.trim()?.length > 3) {
            systemPrompt += `\n\n## BEHAVIOR MODIFIERS\n${behavioralModifiers}`;
        }

        try {
            systemPrompt += await getContextForPrompt(userId, 10);
        } catch { }

        try {
            systemPrompt += await getEvolutionSummaryForPrompt(userId);
        } catch { }

        if (genZ.isGenZ) {
            systemPrompt += `
\n## GEN-Z STYLE
Mirror lightly: "bro", "fr", "ngl", emojis — but avoid slang if user is sad/angry.
`;
        }

        /* 6. SMART CONTEXT (PAST-CONVERSATION) */
        try {
            if (smartContextManager.detectPastReference(userMessage)) {
                const smart = await smartContextManager.buildSmartContext(userId, userMessage, conversationHistory);
                if (smart?.contextSummary) {
                    systemPrompt += `\n## PAST CONVERSATION CONTEXT\n${smart.contextSummary}`;
                }
            }
        } catch (err) {
            logger.warn("smartContextManager failed:", err?.message);
        }

        /* 7. PROMPT OPTIMIZATION (BIG TOKEN SAVINGS) */
        const compressed = promptOptimizer.compressSystemPrompt(systemPrompt);
        const optimized = promptOptimizer.optimizePrompt(compressed, userMessage, conversationHistory);

        /* SHORTCUT: INSTANT GREETINGS */
        const cleanMsg = userMessage.toLowerCase().trim().replace(/[^a-z]/g, '');
        const greetings = ['hey', 'hello', 'hi', 'sup', 'yo', 'greetings', 'hiya'];

        let aiMessage;

        if (greetings.includes(cleanMsg)) {
            let replies = ["Hey, what's up?", "Hey.", "Yo, what's good?", "Hi there.", "Sup?", "Hey!"];

            // Mode-specific greetings
            if (mode === 'therapist') {
                replies = ["Hello.", "Hi there.", "I'm listening.", "Hi. How are you feeling?", "I'm here."];
            } else if (mode === 'dark') {
                replies = ["What?", "You're back.", "Speak.", "What now?", "I'm listening."];
            } else if (mode === 'future') {
                replies = ["Greetings.", "Hello.", "I'm here.", "Let's focus.", "Hi."];
            }

            aiMessage = replies[Math.floor(Math.random() * replies.length)];
        } else {
            /* 8. AI CALL (Only if not a simple greeting) */
            try {
                const aiResponse = await withTimeout(
                    aiService.generateChatResponse(
                        userMessage,
                        optimized.history,
                        compressed, // Use clean system prompt, NOT the mashed one
                        mode
                    ),
                    12000
                );
                // aiService returns { provider, text, raw } - extract the text
                aiMessage = typeof aiResponse === 'string' ? aiResponse : (aiResponse?.text || aiResponse?.message || '');
                logger.info(`AI Provider: ${aiResponse?.provider}, Response length: ${aiMessage?.length}`);
            } catch (err) {
                logger.warn("AI Timeout/Fallback:", err?.message);
                aiMessage = mode === "therapist"
                    ? "Let's slow down. Tell me the one thing bothering you the most."
                    : mode === "dark"
                        ? "You know your patterns bro. What triggered it?"
                        : mode === "future"
                            ? "You'll laugh at this later bro. What started it?"
                            : "Bro, tell me quickly — what happened?";
            }
        }

        /* 9. SANITIZE */
        aiMessage = sanitize(aiMessage);

        /* 10. GEN-Z MIRRORING */
        const emotion = detectEmotion(userMessage);

        if (genZ.isGenZ && (emotion === "neutral" || emotion === "excited")) {
            aiMessage = mirrorUserStyle(userMessage, aiMessage);
        }

        /* 11. BACKGROUND TASKS (fire-and-forget, don't await) */
        // Store memories in background
        storeChatMemory(userId, userMessage, "user", mode).catch(() => { });
        storeChatMemory(userId, aiMessage, "ai", mode).catch(() => { });
        detectAndCreateMemory(userId, conversationId, null, userMessage, { mode }).catch(() => { });
        recordDailyMetrics(userId).catch(() => { });

        /* 12. RETURN RESPONSE IMMEDIATELY */
        return {
            message: aiMessage,
            mode,
            timestamp: new Date().toISOString(),
            genZ: genZ.isGenZ,
            tokensSaved: optimized.tokensSaved
        };

    } catch (error) {
        logger.error("❌ Chat Engine Fatal:", error);
        throw new Error("Chat generation failed: " + error.message);
    }
}

/* ---------------------------------------
   UTILS
--------------------------------------- */

export async function getChatHistory(userId, options = {}) {
    const { limit = 50, conversationId, mode } = options;

    let query = supabaseAdmin
        .from("chat_history")
        .select("*")
        .eq("user_id", userId);

    // Filter by conversation_id if provided
    if (conversationId) {
        query = query.eq("conversation_id", conversationId);
    }

    // Filter by mode if provided
    if (mode) {
        query = query.eq("mode", mode);
    }

    const { data } = await query
        .order("created_at", { ascending: false })
        .limit(limit);

    return data ? data.reverse() : [];
}

export async function clearChatHistory(userId) {
    await supabaseAdmin.from("chat_history").delete().eq("user_id", userId);
    return { success: true };
}

export default {
    generateChatResponse,
    getChatHistory,
    clearChatHistory
};
