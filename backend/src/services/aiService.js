import geminiService from './geminiService.js';
import groqService from './groqService.js';
import claudeService from './claudeService.js';
import cohereService from './cohereService.js';
import huggingfaceService from './huggingfaceService.js';
import openaiService from './openaiService.js';
import openrouterService from './openrouterService.js';
import mistralService from './mistralService.js';
import cloudflareService from './cloudflareService.js';

class AIService {
    constructor() {
        // Priority order: Gemini > Mistral > OpenAI > Groq > Claude > OpenRouter > Cloudflare > Cohere > HuggingFace
        this.providers = [
            { name: 'Gemini', service: geminiService, priority: 1, dailyLimit: 1000 },
            { name: 'Mistral', service: mistralService, priority: 2, dailyLimit: 10000 }, // High limit
            { name: 'OpenAI', service: openaiService, priority: 3, dailyLimit: 500 },
            { name: 'Groq', service: groqService, priority: 4, dailyLimit: 1000 },
            { name: 'Claude', service: claudeService, priority: 5, dailyLimit: 50 },
            { name: 'OpenRouter', service: openrouterService, priority: 6, dailyLimit: 1000 },
            { name: 'Cloudflare', service: cloudflareService, priority: 7, dailyLimit: 100000 }, // Very high limit
            { name: 'Cohere', service: cohereService, priority: 8, dailyLimit: 100 },
            { name: 'HuggingFace', service: huggingfaceService, priority: 9, dailyLimit: 1000 },
        ];

        // Provider Status Tracking
        this.providerStatus = {};
        this.providers.forEach(p => {
            this.providerStatus[p.name] = {
                requestsToday: 0,
                errorsToday: 0,
                isExhausted: false,
                cooldownUntil: null,
                lastError: null
            };
        });

        // Statistics
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            providerUsage: {},
        };

        // Initialize provider stats
        this.providers.forEach(p => {
            this.stats.providerUsage[p.name] = { requests: 0, errors: 0 };
        });

        // Task-Based Routing Map
        this.routingMap = {
            'fast_chat': ['Groq', 'Mistral', 'Gemini', 'Cloudflare'],              // Speed prioritized
            'deep_reasoning': ['Claude', 'Mistral', 'Gemini', 'OpenAI'],           // IQ prioritized
            'emotional_support': ['Gemini', 'Claude', 'Mistral', 'OpenAI'],        // Empathy prioritized
            'personality_core': ['OpenAI', 'Mistral', 'Gemini', 'Cloudflare'],     // Consistency prioritized
            'creative_writing': ['OpenRouter', 'Mistral', 'Claude', 'Gemini'],     // Creativity prioritized
            'memory_analysis': ['Cohere', 'Mistral', 'Gemini', 'Cloudflare'],      // Context prioritized
            'default': ['Gemini', 'Mistral', 'Cloudflare', 'OpenAI']               // Balanced default
        };

        // Reset quotas at midnight
        this.scheduleDailyReset();
    }

    /**
     * Schedule daily quota reset
     */
    scheduleDailyReset() {
        const now = new Date();
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const timeUntilMidnight = tomorrow - now;

        setTimeout(() => {
            this.resetDailyQuotas();
            this.scheduleDailyReset(); // Reschedule for next day
        }, timeUntilMidnight);
    }

    /**
     * Reset all daily quotas
     */
    resetDailyQuotas() {
        console.log('🔄 Resetting daily AI quotas...');
        Object.keys(this.providerStatus).forEach(key => {
            this.providerStatus[key].requestsToday = 0;
            this.providerStatus[key].isExhausted = false;
            this.providerStatus[key].cooldownUntil = null;
        });
    }

    /**
     * Get prioritized providers for a specific task
     */
    getProvidersForTask(taskType) {
        const preferredOrder = this.routingMap[taskType] || this.routingMap['default'];

        // 1. Start with preferred providers for this task
        let sortedProviders = [];

        preferredOrder.forEach(name => {
            const provider = this.providers.find(p => p.name === name);
            if (provider) sortedProviders.push(provider);
        });

        // 2. Add remaining providers as fallback (excluding those already added)
        this.providers.forEach(p => {
            if (!sortedProviders.find(sp => sp.name === p.name)) {
                sortedProviders.push(p);
            }
        });

        return sortedProviders;
    }

    /**
     * Check if provider is available
     */
    isProviderAvailable(providerName) {
        const status = this.providerStatus[providerName];

        // Check if manually marked exhausted
        if (status.isExhausted) return false;

        // Check cooldown
        if (status.cooldownUntil && new Date() < status.cooldownUntil) return false;

        // Check daily limit (soft check)
        const provider = this.providers.find(p => p.name === providerName);
        if (provider && status.requestsToday >= provider.dailyLimit) {
            return false;
        }

        return true;
    }

    /**
     * Handle provider error and update status
     */
    handleProviderError(providerName, error) {
        const status = this.providerStatus[providerName];
        status.errorsToday++;
        status.lastError = error.message;

        const errorMessage = error.message.toLowerCase();

        // Check for rate limits or quotas
        if (errorMessage.includes('429') ||
            errorMessage.includes('quota') ||
            errorMessage.includes('limit') ||
            errorMessage.includes('exhausted')) {

            console.warn(`⚠️ ${providerName} quota exceeded or rate limited. Switching to next provider.`);
            status.isExhausted = true;
            status.cooldownUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour cooldown
        }
        // Temporary network issues
        else if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
            console.warn(`⚠️ ${providerName} network issue. Cooldown for 5 mins.`);
            status.cooldownUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 min cooldown
        }
    }

    /**
     * Generate chat response with smart task-based routing
     */
    async generateChatResponse(prompt, conversationHistory = [], systemPrompt = null, taskType = 'default') {
        this.stats.totalRequests++;

        // Auto-detect task type if default
        if (taskType === 'default') {
            taskType = this.detectTaskType(prompt, systemPrompt);
        }

        console.log(`🧠 Task Type: ${taskType}`);

        // Get providers sorted by task suitability
        const taskProviders = this.getProvidersForTask(taskType);

        // Filter available providers based on status
        const availableProviders = taskProviders.filter(p => this.isProviderAvailable(p.name));

        // If no providers available (rare), try all regardless of status as last resort
        const providersToTry = availableProviders.length > 0 ? availableProviders : taskProviders;

        for (const provider of providersToTry) {
            try {
                console.log(`🤖 Routing to ${provider.name} (Priority for ${taskType})...`);
                this.stats.providerUsage[provider.name].requests++;
                this.providerStatus[provider.name].requestsToday++;

                const response = await provider.service.generateChatResponse(
                    prompt,
                    conversationHistory,
                    systemPrompt
                );

                this.stats.successfulRequests++;
                console.log(`✅ ${provider.name} succeeded`);
                return response;
            } catch (error) {
                console.error(`❌ ${provider.name} failed:`, error.message);
                this.stats.providerUsage[provider.name].errors++;

                // Smart error handling
                this.handleProviderError(provider.name, error);

                // Continue to next provider
                continue;
            }
        }

        // All providers failed
        this.stats.failedRequests++;
        throw new Error('All AI providers unavailable. Please try again later.');
    }

    /**
     * Simple heuristic to detect task type
     */
    detectTaskType(prompt, systemPrompt) {
        const p = prompt.toLowerCase();
        const s = (systemPrompt || '').toLowerCase();

        if (s.includes('therapist') || s.includes('emotional') || p.includes('feel') || p.includes('sad')) return 'emotional_support';
        if (s.includes('future') || s.includes('wise') || p.includes('analyze') || p.includes('why')) return 'deep_reasoning';
        if (s.includes('dark') || p.includes('story') || p.includes('imagine')) return 'creative_writing';
        if (p.length < 20 && (p.includes('hi') || p.includes('hello') || p.includes('thanks'))) return 'fast_chat';

        return 'personality_core'; // Default for normal chat
    }

    /**
     * Generate with system context
     */
    async generateWithContext(systemPrompt, userMessage) {
        const availableProviders = this.providers.filter(p => this.isProviderAvailable(p.name));
        const providersToTry = availableProviders.length > 0 ? availableProviders : this.providers;

        for (const provider of providersToTry) {
            try {
                return await provider.service.generateWithContext(systemPrompt, userMessage);
            } catch (error) {
                console.error(`${provider.name} failed:`, error.message);
                this.handleProviderError(provider.name, error);
                continue;
            }
        }
        throw new Error('All AI providers unavailable');
    }

    // ... (Keep existing specific methods like analyzeEmotion as they are specific to Gemini for now)

    async analyzeEmotion(text) { return await geminiService.analyzeEmotion(text); }
    async extractEntities(text) { return await geminiService.extractEntities(text); }
    async detectMemorableMoment(text) { return await geminiService.detectMemorableMoment(text); }
    async generateEmbedding(text) { return await mistralService.generateEmbedding(text); }

    /**
     * Get detailed service stats including routing info
     */
    getStats() {
        const successRate = this.stats.totalRequests > 0
            ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2)
            : '0.00';

        return {
            totalRequests: this.stats.totalRequests,
            successful: this.stats.successfulRequests,
            failed: this.stats.failedRequests,
            successRate: successRate + '%',
            providerBreakdown: this.stats.providerUsage,
            routingStatus: this.providerStatus
        };
    }

    getMostReliableProvider() {
        let bestProvider = null;
        let bestSuccessRate = 0;

        for (const [name, stats] of Object.entries(this.stats.providerUsage)) {
            if (stats.requests > 0) {
                const successRate = ((stats.requests - stats.errors) / stats.requests) * 100;
                if (successRate > bestSuccessRate) {
                    bestSuccessRate = successRate;
                    bestProvider = name;
                }
            }
        }

        return { provider: bestProvider, successRate: bestSuccessRate.toFixed(2) + '%' };
    }
}

export default new AIService();
