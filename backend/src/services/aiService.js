// aiService.js
// Production-grade multi-provider AI router for TwinGenie
// Optimized for Stability, Cost-Control, and Rate-Limit Defense

import geminiService from './geminiService.js';
import groqService from './groqService.js';
import claudeService from './claudeService.js';
import cohereService from './cohereService.js';
import huggingfaceService from './huggingfaceService.js';
import openaiService from './openaiService.js';
import openrouterService from './openrouterService.js';
import mistralService from './mistralService.js';
import cloudflareService from './cloudflareService.js';
import deepSeekService from './deepSeekService.js';

const SAFE_FALLBACK_REPLY = "I’m having a temporary issue reaching my AI engines. Please try again in a moment.";

class AIService {
    constructor() {
        /**
         * Provider definitions with Realistic Limits
         * Daily Limits adjusted for Free/Low-Cost tiers
         */
        this.providers = [
            { name: 'Groq', service: groqService, dailyLimit: 300 },       // Fast LPU
            { name: 'Mistral', service: mistralService, dailyLimit: 200 }, // Reliable Free
            { name: 'OpenRouter', service: openrouterService, dailyLimit: 1000 }, // Aggregator
            { name: 'Gemini', service: geminiService, dailyLimit: 1000 },  // Generous but 429 prone
            { name: 'Cloudflare', service: cloudflareService, dailyLimit: 100000 }, // Workers AI
            { name: 'Cohere', service: cohereService, dailyLimit: 100 },
            { name: 'HuggingFace', service: huggingfaceService, dailyLimit: 1000 },
            { name: 'Claude', service: claudeService, dailyLimit: 100 },
            { name: 'OpenAI', service: openaiService, dailyLimit: 500 },
            { name: 'DeepSeek', service: deepSeekService, dailyLimit: 100 } // Paid - Limit Risk
        ];

        // Routing map: DEEPSEEK MOVED TO BOTTOM
        // Prioritizes Free/Fast -> Fallback to Paid/Quota
        this.routingMap = {
            fast_chat: ['Groq', 'Mistral', 'Gemini', 'Cloudflare', 'OpenRouter', 'Cohere', 'HuggingFace', 'DeepSeek', 'OpenAI'],
            deep_reasoning: ['Claude', 'Gemini', 'Groq', 'Mistral', 'OpenRouter', 'DeepSeek', 'OpenAI'],
            emotional_support: ['Gemini', 'Mistral', 'Claude', 'Groq', 'OpenRouter', 'DeepSeek', 'OpenAI'],
            personality_core: ['Groq', 'Mistral', 'OpenRouter', 'Gemini', 'Cloudflare', 'DeepSeek', 'OpenAI'],
            creative_writing: ['OpenRouter', 'Groq', 'Mistral', 'Claude', 'Gemini', 'DeepSeek'],
            memory_analysis: ['Cohere', 'Groq', 'Mistral', 'Gemini', 'Cloudflare'],
            default: ['Groq', 'Mistral', 'OpenRouter', 'Gemini', 'Cloudflare', 'DeepSeek', 'OpenAI']
        };

        // Provider Status Tracking
        this.providerStatus = {};
        this.providers.forEach(p => {
            this.providerStatus[p.name] = {
                requestsToday: 0,
                errorsToday: 0,
                consecutiveFailures: 0,
                isExhausted: false,
                cooldownUntil: null,
                lastError: null,
                lastSuccess: null
            };
        });

        // Config
        this.CIRCUIT_BREAKER_THRESHOLD = 3;
        this.CIRCUIT_BREAKER_COOLDOWN = 15 * 60 * 1000; // 15 min

        // Statistics
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            providerUsage: {}
        };
        this.providers.forEach(p => {
            this.stats.providerUsage[p.name] = { requests: 0, errors: 0 };
        });

        this.scheduleDailyReset();
    }

    /* ---------------------
       Utilities
       --------------------- */

    scheduleDailyReset() {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            setTimeout(() => {
                this.resetDailyQuotas();
                this.scheduleDailyReset();
            }, tomorrow - now);
        } catch (e) { console.warn('Daily reset scheduling failed'); }
    }

    resetDailyQuotas() {
        Object.keys(this.providerStatus).forEach(k => {
            const s = this.providerStatus[k];
            // Only reset usage, keep long-term suspensions (like 30-day 402)
            s.requestsToday = 0;
            s.errorsToday = 0;
            if (s.cooldownUntil && s.cooldownUntil > new Date(Date.now() + 24 * 60 * 60 * 1000)) {
                // Keep long cooldowns (e.g. 30 days)
            } else {
                s.isExhausted = false;
                s.cooldownUntil = null;
            }
        });
        console.log('🔄 Daily AI Quotas Reset');
    }

    getTimeoutForProvider(providerName) {
        const timeouts = {
            'Groq': 6000,
            'Mistral': 8000,
            'Claude': 12000,
            'Gemini': 12000,
            'Cloudflare': 8000,
            'DeepSeek': 6000,
            'OpenRouter': 15000,
            'default': 12000
        };
        return timeouts[providerName] || timeouts['default'];
    }

    /* ---------------------
       Core Logic
       --------------------- */

    isProviderAvailable(provider) {
        const s = this.providerStatus[provider.name];
        if (!s) return false;

        // 1. Check Cooldown / Exhaustion
        if (s.isExhausted) return false;
        if (s.cooldownUntil && new Date() < s.cooldownUntil) return false;

        // 2. Check Daily Limit
        if (typeof provider.dailyLimit === 'number' && s.requestsToday >= provider.dailyLimit) {
            return false;
        }

        // 3. Check Configuration (API Key presence)
        // Checks .isConfigured OR .isEnabled (legacy)
        const svc = provider.service;
        if (!svc) return false;

        const isConfigured = (svc.isConfigured !== undefined) ? svc.isConfigured :
            (svc.isEnabled !== undefined ? svc.isEnabled : true);

        if (isConfigured === false) return false;

        return true;
    }

    markProviderError(providerName, error) {
        const status = this.providerStatus[providerName];
        if (!status) return;

        status.errorsToday++;
        status.consecutiveFailures++;
        status.lastError = error?.message || String(error);

        const msg = (status.lastError).toLowerCase();

        // Sensible, operational cooldowns (never 30-day memory lock)
        if (msg.includes('402') || msg.includes('insufficient balance')) {
            // 30 Minutes lockout for billing issues (gives admin time to refill or auto-recharge)
            status.isExhausted = true;
            status.cooldownUntil = new Date(Date.now() + 30 * 60 * 1000);
            console.warn(`💸 Provider ${providerName} DISABLED (Insufficient Balance) - Cooldown 30m`);
        }
        else if (msg.includes('401') || msg.includes('invalid') || msg.includes('unauthorized')) {
            // 15 Minutes lockout for config issues
            status.isExhausted = true;
            status.cooldownUntil = new Date(Date.now() + 15 * 60 * 1000);
            console.warn(`🔑 Provider ${providerName} DISABLED (Auth Failed) - Cooldown 15m`);
        }
        else if (msg.includes('404') || msg.includes('not found') || msg.includes('deprecated')) {
            // 15 Minutes lockout for Model Not Found / Deprecated
            status.isExhausted = true;
            status.cooldownUntil = new Date(Date.now() + 15 * 60 * 1000);
            console.warn(`🚫 Provider ${providerName} DISABLED (Model Not Found / Deprecated) - Cooldown 15m`);
        }
        else if (msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted')) {
            // 2 Minutes for Rate Limits
            status.isExhausted = true;
            status.cooldownUntil = new Date(Date.now() + 2 * 60 * 1000);
            console.warn(`⏳ Provider ${providerName} Throttled (Rate Limit) - Cooldown 2m`);
        }
        else if (msg.includes('timeout') || msg.includes('network') || msg.includes('socket')) {
            // 30 Seconds temporary backoff
            status.cooldownUntil = new Date(Date.now() + 30 * 1000);
        }
        else if (status.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
            // Circuit Breaker: 15 min
            status.cooldownUntil = new Date(Date.now() + this.CIRCUIT_BREAKER_COOLDOWN);
            console.warn(`🔴 Circuit OPEN for ${providerName} (${status.consecutiveFailures} failures) - Cooldown 15m`);
        } else {
            status.cooldownUntil = new Date(Date.now() + 15 * 1000);
        }

        this.stats.providerUsage[providerName].errors++;
    }

    markProviderSuccess(providerName) {
        const status = this.providerStatus[providerName];
        if (!status) return;
        status.consecutiveFailures = 0;
        status.lastSuccess = new Date();
        status.cooldownUntil = null;
        status.isExhausted = false;
    }

    /* ---------------------
       Message Helper
       --------------------- */
    buildMessagesArray(systemPrompt, conversationHistory = [], userMessage) {
        const messages = [];
        if (systemPrompt && typeof systemPrompt === 'string' && systemPrompt.length > 0) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        if (Array.isArray(conversationHistory)) {
            conversationHistory.forEach(item => {
                const role = (item.sender_type === 'user' || item.role === 'user') ? 'user' : 'assistant';
                messages.push({ role, content: item.content });
            });
        }
        if (userMessage) {
            messages.push({ role: 'user', content: userMessage });
        }
        return messages;
    }

    /* ---------------------
       Execution Logic
       --------------------- */

    async callProvider(provider, providerParams) {
        const svc = provider.service;
        this.stats.providerUsage[provider.name].requests++;
        this.providerStatus[provider.name].requestsToday++;

        const timeoutMs = this.getTimeoutForProvider(provider.name);

        const withTimeout = (promise) => Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms)`)), timeoutMs))
        ]);

        let rawResponse;

        // Try Unified Object Interface (Priority 1)
        if (typeof svc.generateChatResponse === 'function') {
            rawResponse = await withTimeout(svc.generateChatResponse(providerParams, providerParams.userMessage, providerParams.conversationHistory));
        }
        // Try Legacy Context Interface
        else if (typeof svc.generateWithContext === 'function') {
            rawResponse = await withTimeout(svc.generateWithContext(providerParams.systemPrompt, providerParams.userMessage));
        } else {
            throw new Error(`Provider ${provider.name} missing execution methods`);
        }

        const text = (typeof rawResponse === 'string') ? rawResponse :
            (rawResponse?.text || rawResponse?.message || rawResponse?.content || JSON.stringify(rawResponse));

        return { text, raw: rawResponse };
    }

    /* ---------------------
       Public Methods
       --------------------- */

    detectTaskType(userMessage, systemPrompt) {
        const s = (systemPrompt || '').toLowerCase();
        const p = (userMessage || '').toLowerCase();
        if (s.includes('therapist') || s.includes('support')) return 'emotional_support';
        if (s.includes('reason') || s.includes('analyze')) return 'deep_reasoning';
        if (s.includes('personality')) return 'personality_core';
        if (p.length < 50 && (p.includes('hi') || p.includes('hello'))) return 'fast_chat';
        return 'default';
    }

    getProvidersForTask(taskType) {
        const preferred = this.routingMap[taskType] || this.routingMap.default;
        return preferred.map(name => this.providers.find(p => p.name === name)).filter(Boolean);
    }

    /**
     * Unified generateChatResponse accepting an object contract:
     * { messages, userMessage, conversationHistory, systemPrompt, taskType, responseFormat }
     * Or legacy positional arguments: (userMessage, conversationHistory, systemPrompt, taskType)
     */
    async generateChatResponse(input, legacyHistory = [], legacySystemPrompt = '', legacyTaskType = 'default') {
        this.stats.totalRequests++;

        let userMessage = '';
        let conversationHistory = [];
        let systemPrompt = '';
        let taskType = 'default';
        let responseFormat = 'text'; // 'text' | 'json'

        if (input && typeof input === 'object' && !Array.isArray(input)) {
            userMessage = input.userMessage || input.prompt || input.message || '';
            conversationHistory = input.conversationHistory || input.history || [];
            systemPrompt = input.systemPrompt || '';
            taskType = input.taskType || 'default';
            responseFormat = input.responseFormat || 'text';
        } else {
            userMessage = input || '';
            conversationHistory = legacyHistory || [];
            systemPrompt = legacySystemPrompt || '';
            taskType = legacyTaskType || 'default';
            responseFormat = 'text';
        }

        if (!taskType || taskType === 'default') {
            taskType = this.detectTaskType(userMessage, systemPrompt);
        }

        const messagesArray = this.buildMessagesArray(systemPrompt, conversationHistory, userMessage);
        const preferredProviders = this.getProvidersForTask(taskType);

        const uniqueAvailable = [];
        const seen = new Set();

        for (const p of preferredProviders) {
            if (!seen.has(p.name) && this.isProviderAvailable(p)) {
                if (systemPrompt.length > 3000 && ['HuggingFace', 'Cloudflare'].includes(p.name)) {
                    continue;
                }
                uniqueAvailable.push(p);
                seen.add(p.name);
            }
        }

        const providerParams = {
            messages: messagesArray,
            userMessage,
            conversationHistory,
            systemPrompt,
            taskType,
            responseFormat
        };

        if (uniqueAvailable.length === 0) {
            console.error('aiService: NO Available Providers for task ' + taskType);
            this.stats.failedRequests++;
            if (responseFormat === 'json') {
                return { success: false, provider: null, text: null, parsed: null, error: 'NO_PROVIDERS_AVAILABLE' };
            }
            return { success: false, provider: null, text: SAFE_FALLBACK_REPLY, error: 'NO_PROVIDERS_AVAILABLE' };
        }

        for (const provider of uniqueAvailable) {
            try {
                const result = await this.callProvider(provider, providerParams);

                let cleaned = (result.text || '').replace(/^["']|["']$/g, '').trim();

                // Structured output validation (Priority 2)
                if (responseFormat === 'json') {
                    let jsonStr = cleaned.replace(/```json|```/gi, '').trim();
                    const first = jsonStr.indexOf('{');
                    const last = jsonStr.lastIndexOf('}');
                    if (first !== -1 && last !== -1) {
                        jsonStr = jsonStr.substring(first, last + 1);
                    }
                    try {
                        const parsed = JSON.parse(jsonStr);
                        this.markProviderSuccess(provider.name);
                        this.stats.successfulRequests++;
                        return {
                            success: true,
                            provider: provider.name,
                            text: cleaned,
                            parsed,
                            raw: result.raw
                        };
                    } catch (parseErr) {
                        console.warn(`⚠️ ${provider.name} returned non-JSON for structured request. Trying next...`);
                        this.markProviderError(provider.name, new Error('INVALID_JSON_OUTPUT'));
                        continue;
                    }
                }

                this.markProviderSuccess(provider.name);
                this.stats.successfulRequests++;

                return {
                    success: true,
                    provider: provider.name,
                    text: cleaned,
                    raw: result.raw
                };

            } catch (err) {
                console.warn(`❌ ${provider.name} Failed: ${err.message}. Trying next...`);
                this.markProviderError(provider.name, err);
                continue;
            }
        }

        this.stats.failedRequests++;
        console.error('aiService: All attempted providers failed.');

        if (responseFormat === 'json') {
            return {
                success: false,
                provider: null,
                text: null,
                parsed: null,
                error: 'ALL_PROVIDERS_FAILED'
            };
        }

        return {
            success: false,
            provider: null,
            text: SAFE_FALLBACK_REPLY,
            error: 'ALL_PROVIDERS_FAILED'
        };
    }

    // Streaming placeholder (returns null for now to force standard)
    async generateStreamingResponse() {
        return null;
    }

    // Helpers
    async analyzeEmotion(text) { return await geminiService.analyzeEmotion(text); }
    async extractEntities(text) { return await geminiService.extractEntities(text); }
    async detectMemorableMoment(text) { return await geminiService.detectMemorableMoment(text); }
    async generateEmbedding(text) {
        if (openaiService && openaiService.isConfigured) {
            try {
                return await openaiService.generateEmbedding(text);
            } catch (err) {
                // OpenAI embedding failed, proceed to Gemini fallback
            }
        }
        return await geminiService.generateEmbedding(text);
    }

    getStats() {
        return {
            total: this.stats.totalRequests,
            success: this.stats.successfulRequests,
            usage: this.stats.providerUsage,
            status: this.providerStatus
        };
    }
}

export default new AIService();
