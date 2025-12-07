
import NodeCache from "node-cache";

/**
 * PromptOptimizer
 * Reduces token usage while preserving:
 * - Twin personality blueprint
 * - Mode rules
 * - Memory context
 * - Emotional cues
 * - User tone & slang
 * Designed for multi-provider routing (Gemini, Mistral, OpenAI, etc.)
 */

class PromptOptimizer {
    constructor() {
        // Cache: 1 hour for responses, 24h for embeddings
        this.responseCache = new NodeCache({ stdTTL: 3600 });
        this.embeddingCache = new NodeCache({ stdTTL: 86400 });

        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            tokensSaved: 0,
        };
    }

    // ============================================================
    // 1. SMART PROMPT OPTIMIZATION FOR CHAT
    // ============================================================

    optimizePrompt(systemPrompt, userMessage, conversationHistory = []) {
        // Keep last 6 messages for continuity
        const history = this.reduceHistory(conversationHistory);

        // Compress system prompt safely
        const compressedSystem = this.compressTwinSystem(systemPrompt);

        // Build final optimized prompt
        let optimized = `${compressedSystem}\n\n`;

        if (history.length > 0) {
            optimized += "## RECENT CONVERSATION\n";
            history.forEach(msg => {
                optimized += `${msg.sender_type === "user" ? "U" : "A"}: ${msg.content}\n`;
            });
            optimized += "\n";
        }

        optimized += `U: ${userMessage}\nA:`;

        return {
            prompt: optimized,
            history,
            tokensSaved: this.estimateTokensSaved(systemPrompt, compressedSystem),
        };
    }

    // ============================================================
    // 2. SMART HISTORY REDUCTION
    // ============================================================

    reduceHistory(history) {
        if (!history || !history.length) return [];

        // Remove messages like "okay", "hmm", "yes", "bro?"
        const uselessPatterns = /^(ok|okay|hmm|bro|dude|yes|no|huh|hmmmmm?)$/i;

        const cleaned = history.filter(msg => {
            const content = msg.content.trim().toLowerCase();
            return content.length > 2 && !uselessPatterns.test(content);
        });

        // Keep last 6 meaningful messages
        return cleaned.slice(-6);
    }

    // ============================================================
    // 3. SMART SYSTEM-PROMPT COMPRESSION (Critical!)
    // ============================================================

    // Alias for backward compatibility
    compressSystemPrompt(systemPrompt) {
        return this.compressTwinSystem(systemPrompt);
    }

    compressTwinSystem(systemPrompt) {
        if (!systemPrompt) return "";

        return systemPrompt
            .replace(/\s+/g, " ") // remove excess spaces
            .replace(/You must/g, "Do")
            .replace(/Important:/gi, "")
            .replace(/Follow these rules strictly:/gi, "Rules:")
            .replace(/Please avoid/gi, "Avoid")
            .replace(/You should not/gi, "Don't")
            .replace(/Do not/gi, "Never")
            // Remove verbose filler with no semantic meaning:
            .replace(/This is crucial/gi, "")
            .replace(/It is important to note/gi, "")
            .replace(/keep in mind that/gi, "")
            // But **DO NOT REMOVE** patterns describing:
            // - personality blueprint
            // - mode rules
            // - memory context
            .trim();
    }

    // ============================================================
    // 4. RESPONSE CACHING
    // ============================================================

    getCachedResponse(cacheKey) {
        const cached = this.responseCache.get(cacheKey);
        if (cached) {
            this.stats.cacheHits++;
            this.stats.tokensSaved += this.estimateTokens(cached);
            return cached;
        }
        this.stats.cacheMisses++;
        return null;
    }

    cacheResponse(cacheKey, response) {
        this.responseCache.set(cacheKey, response);
    }

    generateCacheKey(userId, message, mode = "normal") {
        // Cache must be mode-specific & semantic
        const normalized = message.toLowerCase().trim();
        return `${userId}:${mode}:${this.hashString(normalized)}`;
    }

    // ============================================================
    // 5. EMBEDDING CACHE
    // ============================================================

    getCachedEmbedding(text) {
        const key = this.hashString(text);
        return this.embeddingCache.get(key);
    }

    cacheEmbedding(text, embedding) {
        const key = this.hashString(text);
        this.embeddingCache.set(key, embedding);
    }

    // ============================================================
    // 6. UTILS
    // ============================================================

    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return hash.toString(36);
    }

    estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 4); // average 4 chars per token
    }

    estimateTokensSaved(original, compressed) {
        return this.estimateTokens(original) - this.estimateTokens(compressed);
    }

    getStats() {
        const total = this.stats.cacheHits + this.stats.cacheMisses;
        const hitRate = total
            ? ((this.stats.cacheHits / total) * 100).toFixed(2)
            : "0.00";

        return {
            cacheHits: this.stats.cacheHits,
            cacheMisses: this.stats.cacheMisses,
            hitRate: hitRate + "%",
            tokensSaved: this.stats.tokensSaved,
            estimatedCostSaved: (this.stats.tokensSaved * 0.00003).toFixed(4) + " USD"
        };
    }

    // ============================================================
    // 7. Lightweight Predefined Templates
    // ============================================================

    getTemplate(type) {
        const templates = {
            emotion: `
Return JSON only:
{
  "valence": -100 to +100,
  "emotions": ["sad", "angry"],
  "intensity": 1-10
}
Text: "{text}"
`,

            entities: `
Extract entities. Return JSON only:
{
  "people": [],
  "goals": [],
  "topics": []
}
Text: "{text}"
`,

            memory: `
Is this a memorable moment? Return JSON:
{
  "is_memorable": true/false,
  "category": "milestone|emotion|achievement",
  "significance": 1-10
}
Text: "{text}"
`
        };

        return templates[type] || "";
    }

    fillTemplate(template, vars) {
        let temp = template;
        for (const [k, v] of Object.entries(vars)) {
            temp = temp.replace(`{${k}}`, v);
        }
        return temp;
    }
}

export default new PromptOptimizer();
