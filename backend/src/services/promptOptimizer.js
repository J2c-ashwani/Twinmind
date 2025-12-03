const NodeCache = require('node-cache');

class PromptOptimizer {
    constructor() {
        // Cache responses for 1 hour
        this.responseCache = new NodeCache({ stdTTL: 3600 });
        // Cache embeddings for 24 hours
        this.embeddingCache = new NodeCache({ stdTTL: 86400 });

        this.stats = {
            cacheHits: 0,
            cacheMisses: 0,
            tokensSaved: 0,
        };
    }

    /**
     * Optimize chat prompt by removing redundancy
     */
    optimizePrompt(systemPrompt, userMessage, conversationHistory = []) {
        // Keep only last 5 messages for context (saves tokens)
        const recentHistory = conversationHistory.slice(-5);

        // Compress system prompt (remove verbose instructions)
        const compressedSystem = this.compressSystemPrompt(systemPrompt);

        // Build optimized prompt
        let optimizedPrompt = `${compressedSystem}\n\n`;

        // Add minimal conversation history
        recentHistory.forEach(msg => {
            const role = msg.sender_type === 'user' ? 'U' : 'A'; // Shortened roles
            optimizedPrompt += `${role}: ${msg.content}\n`;
        });

        optimizedPrompt += `U: ${userMessage}\nA:`;

        return {
            prompt: optimizedPrompt,
            history: recentHistory,
            tokensSaved: this.estimateTokensSaved(systemPrompt, compressedSystem),
        };
    }

    /**
     * Compress system prompt by removing verbose text
     */
    compressSystemPrompt(prompt) {
        return prompt
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            // Remove verbose phrases
            .replace(/please note that/gi, '')
            .replace(/it is important to/gi, '')
            .replace(/you should/gi, '')
            // Keep core instructions only
            .trim();
    }

    /**
     * Get cached response if available
     */
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

    /**
     * Cache a response
     */
    cacheResponse(cacheKey, response) {
        this.responseCache.set(cacheKey, response);
    }

    /**
     * Generate cache key from user message
     */
    generateCacheKey(userId, message) {
        // Normalize message for caching
        const normalized = message.toLowerCase().trim();
        return `${userId}:${this.hashString(normalized)}`;
    }

    /**
     * Get cached embedding
     */
    getCachedEmbedding(text) {
        const key = this.hashString(text);
        return this.embeddingCache.get(key);
    }

    /**
     * Cache embedding
     */
    cacheEmbedding(text, embedding) {
        const key = this.hashString(text);
        this.embeddingCache.set(key, embedding);
    }

    /**
     * Simple hash function for cache keys
     */
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    /**
     * Estimate tokens in text (rough approximation)
     */
    estimateTokens(text) {
        // Rough estimate: 1 token ≈ 4 characters
        return Math.ceil(text.length / 4);
    }

    /**
     * Estimate tokens saved
     */
    estimateTokensSaved(original, compressed) {
        return this.estimateTokens(original) - this.estimateTokens(compressed);
    }

    /**
     * Get optimizer stats
     */
    getStats() {
        const totalRequests = this.stats.cacheHits + this.stats.cacheMisses;
        const hitRate = totalRequests > 0
            ? ((this.stats.cacheHits / totalRequests) * 100).toFixed(2)
            : '0.00';

        return {
            cacheHits: this.stats.cacheHits,
            cacheMisses: this.stats.cacheMisses,
            hitRate: hitRate + '%',
            tokensSaved: this.stats.tokensSaved,
            estimatedCostSaved: (this.stats.tokensSaved * 0.00003).toFixed(4) + ' USD',
        };
    }

    /**
     * Template-based prompts (pre-optimized)
     */
    getTemplate(type) {
        const templates = {
            // Concise emotional analysis
            emotion: `Analyze emotion. Return JSON:
{
  "trust": 0-100,
  "dependency": 0-100,
  "vulnerability": 0-100,
  "openness": 0-100,
  "engagement": 0-100,
  "valence": -100 to 100,
  "emotions": ["emotion1"]
}

Text: "{text}"`,

            // Concise entity extraction
            entities: `Extract entities. Return JSON:
{
  "people": ["name1"],
  "goals": ["goal1"],
  "situations": ["situation1"]
}

Text: "{text}"`,

            // Concise memory detection
            memory: `Is this memorable? Return JSON:
{
  "is_memorable": true/false,
  "type": "milestone|achievement|emotion|breakthrough|funny|conversation",
  "title": "short title",
  "significance": 1-10
}

Text: "{text}"`,

            // Optimized chat system prompt
            chat: `You are an AI companion. Be:
- Empathetic & supportive
- Conversational & natural
- Remember past context
- Ask follow-up questions
- Use casual language

Personality: {personality}
Emotional state: {emotion}
Trust level: {trust}/100

Respond naturally.`,
        };

        return templates[type] || '';
    }

    /**
     * Fill template with variables
     */
    fillTemplate(template, variables) {
        let filled = template;
        for (const [key, value] of Object.entries(variables)) {
            filled = filled.replace(`{${key}}`, value);
        }
        return filled;
    }
}

module.exports = new PromptOptimizer();
