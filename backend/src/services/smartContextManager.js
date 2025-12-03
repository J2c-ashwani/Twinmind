const promptOptimizer = require('./promptOptimizer');
const responseCache = require('./responseCache');

class SmartContextManager {
    constructor() {
        this.conversationMemoryService = require('./conversationMemoryService');
    }

    /**
     * Build smart context for AI response
     * Combines recent history + relevant past conversations
     */
    async buildSmartContext(userId, currentMessage, recentHistory = []) {
        // 1. Get last 5 messages (for immediate context)
        const recentContext = recentHistory.slice(-5);

        // 2. Check if user is asking about past conversations
        const isPastReference = this.detectPastReference(currentMessage);

        if (isPastReference) {
            // 3. Search semantic memory for relevant past conversations
            const relevantPast = await this.conversationMemoryService.searchSimilarConversations(
                userId,
                currentMessage,
                5 // Get top 5 relevant past messages
            );

            // 4. Combine recent + relevant past
            return {
                recentHistory: recentContext,
                relevantPast: relevantPast,
                hasMemoryContext: true,
                contextSummary: this.buildContextSummary(recentContext, relevantPast),
            };
        }

        // No past reference - just use recent history
        return {
            recentHistory: recentContext,
            relevantPast: [],
            hasMemoryContext: false,
            contextSummary: null,
        };
    }

    /**
     * Detect if user is asking about past conversations
     */
    detectPastReference(message) {
        const pastIndicators = [
            // Direct references
            /remember when/i,
            /you said/i,
            /we talked about/i,
            /last time/i,
            /earlier/i,
            /before/i,
            /previously/i,

            // Questions about past
            /what did (i|we) say/i,
            /did (i|we) mention/i,
            /have (i|we) discussed/i,

            // Temporal references
            /yesterday/i,
            /last week/i,
            /few days ago/i,
            /the other day/i,
        ];

        return pastIndicators.some(pattern => pattern.test(message));
    }

    /**
     * Build context summary for AI
     */
    buildContextSummary(recentHistory, relevantPast) {
        if (relevantPast.length === 0) return null;

        let summary = "Relevant past context:\n";

        relevantPast.forEach((conv, index) => {
            summary += `${index + 1}. ${conv.summary || conv.content.substring(0, 100)}\n`;
        });

        return summary;
    }

    /**
     * Create optimized prompt with smart context
     */
    async createOptimizedPrompt(userId, userMessage, systemPrompt) {
        // Get smart context
        const context = await this.buildSmartContext(userId, userMessage);

        // Build prompt differently based on context type
        if (context.hasMemoryContext) {
            // User asking about past - include memory context
            return this.buildMemoryPrompt(systemPrompt, userMessage, context);
        } else {
            // Normal conversation - use standard optimization
            return promptOptimizer.optimizePrompt(
                systemPrompt,
                userMessage,
                context.recentHistory
            );
        }
    }

    /**
     * Build prompt with memory context
     */
    buildMemoryPrompt(systemPrompt, userMessage, context) {
        const compressedSystem = promptOptimizer.compressSystemPrompt(systemPrompt);

        let prompt = `${compressedSystem}\n\n`;

        // Add memory context first
        if (context.contextSummary) {
            prompt += `PAST CONTEXT (for reference):\n${context.contextSummary}\n\n`;
        }

        // Add recent conversation
        prompt += "RECENT CONVERSATION:\n";
        context.recentHistory.forEach(msg => {
            const role = msg.sender_type === 'user' ? 'U' : 'A';
            prompt += `${role}: ${msg.content}\n`;
        });

        // Add current message
        prompt += `U: ${userMessage}\nA:`;

        return {
            prompt,
            history: context.recentHistory,
            hasMemoryContext: true,
            tokensSaved: 0, // We're adding context, not saving
        };
    }

    /**
     * Get conversation summary for a time period
     */
    async getConversationSummary(userId, startDate, endDate) {
        const conversations = await this.conversationMemoryService.getConversationsByDateRange(
            userId,
            startDate,
            endDate
        );

        if (conversations.length === 0) {
            return "No conversations found in this period.";
        }

        // Group by topic
        const topics = {};
        conversations.forEach(conv => {
            const topic = conv.topic || 'General';
            if (!topics[topic]) {
                topics[topic] = [];
            }
            topics[topic].push(conv.summary);
        });

        // Build summary
        let summary = `Conversation summary (${startDate} to ${endDate}):\n\n`;
        for (const [topic, summaries] of Object.entries(topics)) {
            summary += `${topic}:\n`;
            summaries.forEach((s, i) => {
                summary += `  ${i + 1}. ${s}\n`;
            });
            summary += '\n';
        }

        return summary;
    }

    /**
     * Check if response should be cached
     */
    shouldCache(message, context) {
        // Don't cache if it references past (responses will be different)
        if (context.hasMemoryContext) return false;

        // Don't cache personal questions
        const personalIndicators = [/my/i, /i am/i, /i'm/i, /i feel/i];
        if (personalIndicators.some(p => p.test(message))) return false;

        // Cache generic questions
        return true;
    }
}

module.exports = new SmartContextManager();
