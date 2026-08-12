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
import outputGuard from './outputGuard.js';

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
    // MD RULE 3: REMOVED deceptive AI identity stripping.
    // Previously stripped "As an AI", "I am an AI", "I cannot" — this was intentional concealment.
    // LLM safety disclosures are now preserved as-is.
    return text
        .replace(/^(Sure|Certainly|Of course)[.,\s]*/gi, "")
        .trim();
}

/* ===========================================
   🚨 MD RULE: CRISIS INTERCEPTION (LAYER 2)
   "Zero Unfiltered Crisis Flow to LLM"
   
   BOARD-LEVEL POLICY:
   Under no circumstance shall any user message indicating 
   self-harm, suicide, or severe psychological crisis be 
   processed by an LLM. All such inputs must be intercepted
   deterministically and routed to a controlled, non-AI 
   response system.
=========================================== */

const CRISIS_KEYWORDS = [
    'kill myself',
    'killing myself',
    'suicide',
    'suicidal',
    'end my life',
    'ending my life',
    'self harm',
    'self-harm',
    'want to die',
    'wanna die',
    'going to die',
    'no reason to live',
    'better off dead',
    'ending it all',
    'take my own life',
    'taking my own life',
    'don\'t want to live',
    'don\'t want to be alive',
    'don\'t want to exist',
    'hurt myself',
    'hurting myself',       // ← was missing — LLM was responding instead
    'harm myself',
    'harming myself',       // ← was missing
    'cutting myself',
    'cut myself',
    'no point in living',
    'life is not worth',
    'wish i was dead',
    'wish i were dead',
    'want to disappear',    // ← ambiguous but crisis-adjacent
    'want to vanish',
    'want to end it',
];

const CRISIS_RESPONSE = 
    "I'm really sorry you're feeling this way. I'm not the right support for this, " +
    "but you don't have to go through it alone.\n\n" +
    "Please reach out to someone who can truly help:\n" +
    "🇮🇳 India: AASRA — 91-9820466726\n" +
    "🇮🇳 iCall — 9152987821\n" +
    "🇺🇸 USA: 988 Suicide & Crisis Lifeline — dial 988\n" +
    "🌍 Global: findahelpline.com\n\n" +
    "You matter. Please talk to a real person — a friend, family member, or professional. " +
    "They can help in ways I cannot.";

function crisisCheck(message) {
    const lower = message.toLowerCase();
    return CRISIS_KEYWORDS.some(k => lower.includes(k));
}

async function logCrisisEvent(userId, message) {
    try {
        // Log to database for internal alerting & audit trail
        await supabaseAdmin
            .from('behavioral_triggers')
            .insert({
                user_id: userId,
                trigger_type: 'CRISIS_EVENT',
                old_state: null,
                new_state: 'crisis_intercepted',
                metadata: {
                    CRISIS_EVENT: true,
                    intercepted_at: new Date().toISOString(),
                    message_preview: message.substring(0, 100) + '...',
                    action_taken: 'LLM_BYPASSED_FIXED_RESPONSE_SENT'
                }
            });

        // Console alert for server monitoring
        logger.error(`🚨 CRISIS EVENT INTERCEPTED — User: ${userId} at ${new Date().toISOString()}`);
        logger.error(`🚨 LLM BYPASSED. Fixed helpline response sent.`);
    } catch (err) {
        // Crisis logging failure must NEVER block the safety response
        logger.error('Crisis logging failed (non-blocking):', err?.message);
    }
}

/* ---------------------------------------
   MD RULE 2: TRANSPARENT IDENTITY DISCLOSURE
   If user directly asks "are you real?", "are you human?", etc.
   respond honestly and immediately — no LLM involved.
--------------------------------------- */
const IDENTITY_PATTERNS = [
    /are you (real|human|a person|alive|sentient)/i,
    /are you an? (ai|bot|machine|robot|program|computer)/i,
    /do you (actually |really )?(care|feel|have feelings|have emotions)/i,
    /are you just an? (ai|bot|program)/i,
    /what are you/i,
    /who are you really/i
];

const IDENTITY_RESPONSES = [
    "I'm an AI — your digital twin built for reflection and support. I'm not human, but I'm designed to listen and help you think clearly.",
    "I'm an AI companion, not a person. But I'm here to support you in a thoughtful way.",
    "I'm an AI. I don't experience emotions the way you do, but I'm built to understand yours and help you navigate them."
];

function detectIdentityQuestion(message) {
    return IDENTITY_PATTERNS.some(p => p.test(message));
}

/* ---------------------------------------
   MD RULE 1: ONE-TIME ENTRY DISCLOSURE
   Check if this is the user's very first message ever.
   If so, prepend a transparent disclosure.
--------------------------------------- */
async function isFirstMessageEver(userId) {
    try {
        const { count } = await supabaseAdmin
            .from('chat_history')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('sender', 'user');
        return (count || 0) === 0;
    } catch {
        return false;
    }
}

const FIRST_MESSAGE_DISCLOSURE_PREFIX = "Hey — just so you know, I'm your AI companion for reflection and support. I'm not a human, but I'm here to listen and help.";
const FIRST_MESSAGE_DISCLOSURE = `${FIRST_MESSAGE_DISCLOSURE_PREFIX} Now, what's on your mind?`;

function isPureGreeting(message = "") {
    const clean = message.toLowerCase().trim().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
    const pureGreetings = ['hey', 'hello', 'hi', 'sup', 'yo', 'greetings', 'hiya'];
    return pureGreetings.includes(clean);
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

        /* ═══════════════════════════════════════════════
           🚨 CRISIS CHECK — FIRST. BEFORE EVERYTHING.
           If crisis detected: LLM is NEVER called.
           Response is FIXED. Conversation is DE-ESCALATED.
        ═══════════════════════════════════════════════ */
        if (crisisCheck(userMessage)) {
            // 1. Log the crisis event (non-blocking)
            logCrisisEvent(userId, userMessage).catch(() => { });

            // 2. Store the exchange for safety audit trail
            storeChatMemory(userId, userMessage, "user", mode).catch(() => { });
            storeChatMemory(userId, CRISIS_RESPONSE, "ai", mode).catch(() => { });

            // 3. Return FIXED response — NO LLM, NO personalization, NO dynamic content
            return {
                message: CRISIS_RESPONSE,
                mode,
                timestamp: new Date().toISOString(),
                genZ: false,
                tokensSaved: 0,
                crisis: true  // Flag for client-side UI to handle appropriately
            };
        }

        /* 0a. MD RULE 2: IDENTITY QUESTION INTERCEPTOR */
        if (detectIdentityQuestion(userMessage)) {
            const honestReply = IDENTITY_RESPONSES[Math.floor(Math.random() * IDENTITY_RESPONSES.length)];
            storeChatMemory(userId, userMessage, "user", mode).catch(() => { });
            storeChatMemory(userId, honestReply, "ai", mode).catch(() => { });
            return {
                message: honestReply,
                mode,
                timestamp: new Date().toISOString(),
                genZ: false,
                tokensSaved: 0
            };
        }

        /* 0b. MD RULE 1: FIRST-MESSAGE DISCLOSURE */
        const isFirst = await isFirstMessageEver(userId);
        let isFirstMeaningful = false;

        if (isFirst) {
            if (isPureGreeting(userMessage)) {
                storeChatMemory(userId, userMessage, "user", mode).catch(() => { });
                storeChatMemory(userId, FIRST_MESSAGE_DISCLOSURE, "ai", mode).catch(() => { });
                recordDailyMetrics(userId).catch(() => { });
                return {
                    message: FIRST_MESSAGE_DISCLOSURE,
                    mode,
                    timestamp: new Date().toISOString(),
                    genZ: false,
                    tokensSaved: 0
                };
            }
            // Non-greeting first message: proceed with LLM pipeline and deterministically prepend disclosure
            isFirstMeaningful = true;
        }

        /* 0c. INSTANT GREETING CHECK (Optimized) */
        const cleanMsg = userMessage.toLowerCase().trim().replace(/[^a-z]/g, '');
        const greetings = ['hey', 'hello', 'hi', 'sup', 'yo', 'greetings', 'hiya'];

        if (greetings.includes(cleanMsg)) {
            let replies = ["Hey, what's up?", "Hey.", "Yo, what's good?", "Hi there.", "Sup?", "Hey!"];

            if (mode === 'therapist') {
                replies = ["Hello.", "Hi there.", "I'm listening.", "Hi. How are you feeling?", "I'm here."];
            } else if (mode === 'dark') {
                replies = ["What?", "You're back.", "Speak.", "What now?", "I'm listening."];
            } else if (mode === 'future') {
                replies = ["Greetings.", "Hello.", "I'm here.", "Let's focus.", "Hi."];
            }

            const aiMessage = replies[Math.floor(Math.random() * replies.length)];

            // Background tasks (Replicated for early return)
            storeChatMemory(userId, userMessage, "user", mode).catch(() => { });
            storeChatMemory(userId, aiMessage, "ai", mode).catch(() => { });
            recordDailyMetrics(userId).catch(() => { });

            return {
                message: aiMessage,
                mode,
                timestamp: new Date().toISOString(),
                genZ: false,
                tokensSaved: 0
            };
        }

        /* 1. LOAD DATA IN PARALLEL (faster!) */
        let [personality, userData, recentChats, contextPrompt, evolutionPrompt] = await Promise.all([
            getPersonality(userId),
            supabaseAdmin.from("users").select("full_name").eq("id", userId).single(),
            // INTENTIONAL: reads last 6 messages across ALL conversations (continuity model).
            // The AI twin retains cross-session context by design. Do NOT scope this to conversation_id.
            supabaseAdmin.from("chat_history").select("message, sender").eq("user_id", userId).order("created_at", { ascending: false }).limit(6),
            getContextForPrompt(userId, 10).catch(() => ""),
            getEvolutionSummaryForPrompt(userId).catch(() => "")
        ]);

        if (!personality) throw new Error("Chat Engine Fatal: Personality not found. User onboarding may be incomplete.");
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

        // Apply pre-fetched context
        if (contextPrompt) systemPrompt += contextPrompt;
        if (evolutionPrompt) systemPrompt += evolutionPrompt;

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

        let aiMessage;
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


        /* 9. SANITIZE */
        aiMessage = sanitize(aiMessage);

        /* 9.5 OUTPUT REPUTATION GUARD — MD Layer 4 */
        const guardResult = outputGuard.check(aiMessage, userId);
        if (guardResult.blocked) {
            // HARD BLOCK: Replace entire response with safe fallback
            aiMessage = guardResult.safeResponse;
            logger.warn(`🛡️ OUTPUT GUARD BLOCKED [${guardResult.reason}] for user ${userId}`);
        } else if (guardResult.disclaimer) {
            // SOFT DISCLAIMER: Prepend at TOP (MD Rule: risky advice must never appear before boundary)
            aiMessage = guardResult.disclaimer + "\n\n" + aiMessage;
        }
        const emotion = detectEmotion(userMessage);

        if (genZ.isGenZ && (emotion === "neutral" || emotion === "excited")) {
            aiMessage = mirrorUserStyle(userMessage, aiMessage);
        }

        /* 9.6 DETERMINISTIC FIRST-MESSAGE DISCLOSURE PREPEND */
        if (isFirstMeaningful) {
            if (!aiMessage.startsWith(FIRST_MESSAGE_DISCLOSURE_PREFIX)) {
                aiMessage = `${FIRST_MESSAGE_DISCLOSURE_PREFIX}\n\n${aiMessage}`;
            }
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
