// aiService.js
// Production-grade multi-provider AI router for TwinMind

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

const DEFAULT_TIMEOUT_MS = 12000; // 12s timeout for provider calls
const SAFE_FALLBACK_REPLY = "I'm having trouble thinking clearly right now — tell me the one sentence that matters most.";

class AIService {
    constructor() {
        /**
         * Provider definitions:
         * name: string
         * service: adapter import
         * dailyLimit: soft daily quota
         */
        this.providers = [
            { name: 'Gemini', service: geminiService, dailyLimit: 1000 },
            { name: 'Mistral', service: mistralService, dailyLimit: 10000 },
            { name: 'OpenAI', service: openaiService, dailyLimit: 500 },
            { name: 'Groq', service: groqService, dailyLimit: 1000 },
            { name: 'Claude', service: claudeService, dailyLimit: 50 },
            { name: 'OpenRouter', service: openrouterService, dailyLimit: 1000 },
            { name: 'Cloudflare', service: cloudflareService, dailyLimit: 100000 },
            { name: 'Cohere', service: cohereService, dailyLimit: 100 },
            { name: 'HuggingFace', service: huggingfaceService, dailyLimit: 1000 },
            { name: 'DeepSeek', service: deepSeekService, dailyLimit: 5000 }
        ];

        // Routing map (taskType -> preferred provider names in order)
        this.routingMap = {
            fast_chat: ['DeepSeek', 'Groq', 'Mistral', 'Gemini', 'Cloudflare'],
            deep_reasoning: ['DeepSeek', 'Claude', 'Mistral', 'Gemini', 'OpenAI'],
            emotional_support: ['Gemini', 'Claude', 'DeepSeek', 'Mistral', 'OpenAI'],
            personality_core: ['DeepSeek', 'OpenAI', 'Mistral', 'Gemini', 'Cloudflare'],
            creative_writing: ['OpenRouter', 'DeepSeek', 'Mistral', 'Claude', 'Gemini'],
            memory_analysis: ['Cohere', 'Mistral', 'Gemini', 'Cloudflare'],
            default: ['DeepSeek', 'Gemini', 'Mistral', 'Cloudflare', 'OpenAI']
        };

        // runtime status tracking
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

        // stats
        this.stats = {
            totalRequests: 0,
            successfulRequests: 0,
            failedRequests: 0,
            providerUsage: {}
        };
        this.providers.forEach(p => {
            this.stats.providerUsage[p.name] = { requests: 0, errors: 0 };
        });

        // daily reset
        this.scheduleDailyReset();
    }

    /* ---------------------
       Utilities
       --------------------- */

    scheduleDailyReset() {
        try {
            const now = new Date();
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const ms = tomorrow - now;
            setTimeout(() => {
                this.resetDailyQuotas();
                this.scheduleDailyReset();
            }, ms);
        } catch (err) {
            // best-effort
            console.warn('aiService: scheduleDailyReset failed', err?.message || err);
        }
    }

    resetDailyQuotas() {
        Object.keys(this.providerStatus).forEach(k => {
            this.providerStatus[k].requestsToday = 0;
            this.providerStatus[k].errorsToday = 0;
            this.providerStatus[k].isExhausted = false;
            this.providerStatus[k].cooldownUntil = null;
            this.providerStatus[k].lastError = null;
        });
    }

    withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms))
        ]);
    }

    sanitizeResponse(text) {
        if (!text || typeof text !== 'string') return text || '';
        return text
            .replace(/\bAs an AI[^.]*\.\s*/gi, '')
            .replace(/\bI am an AI[^.]*\.\s*/gi, '')
            .replace(/^(Sure[,.\s]?|Certainly[,.\s]?|Of course[,.\s]?)(\s*)/i, '')
            .replace(/\bHere'?s (a breakdown|what I think|an overview)[^\n]*\n?/gi, '')
            .replace(/\n{3,}/g, '\n\n')
            .trim() || text.trim();
    }

    isProviderAvailable(provider) {
        const s = this.providerStatus[provider.name];
        if (!s) return false;

        // cooldown check
        if (s.cooldownUntil && new Date() < s.cooldownUntil) return false;

        // exhausted flag
        if (s.isExhausted) return false;

        // soft quota
        if (typeof provider.dailyLimit === 'number' && s.requestsToday >= provider.dailyLimit) {
            return false;
        }

        // provider adapter might be missing methods? check quickly
        if (!provider.service) return false;

        // check if provider is configured (credentials present)
        if (provider.service.isConfigured === false) return false;

        return true;
    }

    markProviderError(providerName, error) {
        const status = this.providerStatus[providerName];
        if (!status) return;
        status.errorsToday = (status.errorsToday || 0) + 1;
        status.lastError = error?.message || String(error);

        const msg = (error?.message || '').toLowerCase();

        if (msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted')) {
            status.isExhausted = true;
            status.cooldownUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        } else if (msg.includes('timeout') || msg.includes('network') || msg.includes('socket')) {
            status.cooldownUntil = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
        } else {
            // small backoff for other errors
            status.cooldownUntil = new Date(Date.now() + 1 * 60 * 1000); // 1 minute
        }
    }

    // Build canonical messages array: system -> history (already shaped) -> user
    buildMessagesArray(systemPrompt, conversationHistory = [], userMessage) {
        const messages = [];
        if (systemPrompt && systemPrompt.length) {
            messages.push({ role: 'system', content: typeof systemPrompt === 'string' ? systemPrompt : JSON.stringify(systemPrompt) });
        }
        // conversationHistory expected to be array of { sender_type, content } oldest-first
        if (Array.isArray(conversationHistory) && conversationHistory.length) {
            conversationHistory.forEach(item => {
                const role = (item.sender_type === 'user' || item.role === 'user') ? 'user' : 'assistant';
                messages.push({ role, content: item.content });
            });
        }
        messages.push({ role: 'user', content: userMessage });
        return messages;
    }

    // detect task type using system prompt first (mode-aware), then fallback heuristics
    detectTaskType(userMessage, systemPrompt = '') {
        const s = (systemPrompt || '').toLowerCase();
        const p = (userMessage || '').toLowerCase();

        // Mode-based routing (priority)
        if (s.includes('therapist') || s.includes('therapist twin') || s.includes('emotional_support') || s.includes('emotional')) return 'emotional_support';
        if (s.includes('future') || s.includes('future twin') || s.includes('deep_reasoning')) return 'deep_reasoning';
        if (s.includes('dark') || s.includes('dark twin') || s.includes('brutally honest')) return 'creative_writing';
        if (s.includes('normal') || s.includes('normal twin') || s.includes('personality')) return 'personality_core';

        // Heuristic fallback
        if (p.includes('feel') || p.includes('sad') || p.includes('angry') || p.includes('anxious')) return 'emotional_support';
        if (p.includes('why') || p.includes('analyze') || p.includes('how come') || p.includes('should i')) return 'deep_reasoning';
        if (p.length < 30 && (p.includes('hi') || p.includes('hello') || p.includes('thanks'))) return 'fast_chat';
        if (p.includes('story') || p.includes('write') || p.includes('imagine')) return 'creative_writing';

        return 'default';
    }

    // Get ordered provider list for a task type (preferred first, then rest)
    getProvidersForTask(taskType) {
        const preferred = this.routingMap[taskType] || this.routingMap.default || ['Gemini', 'Mistral'];
        const ordered = [];

        preferred.forEach(name => {
            const p = this.providers.find(x => x.name === name);
            if (p) ordered.push(p);
        });

        // append remaining (dedupe)
        this.providers.forEach(p => {
            if (!ordered.find(x => x.name === p.name)) ordered.push(p);
        });

        return ordered;
    }

    // normalize provider adapter calls to a safe contract:
    // try provider.service.generateChatResponse(messagesArray, userMessage, conversationHistory)
    // if not available, fallback to provider.service.generateWithContext(systemPrompt, userMessage)
    async callProvider(provider, messagesArray, userMessage, conversationHistory) {
        const svc = provider.service;
        // increase usage counters
        this.stats.providerUsage[provider.name].requests++;
        this.providerStatus[provider.name].requestsToday = (this.providerStatus[provider.name].requestsToday || 0) + 1;

        // Preferred: generateChatResponse(systemMessagesArray, userMessage, conversationHistory)
        if (typeof svc.generateChatResponse === 'function') {
            // call with timeout
            return await this.withTimeout(svc.generateChatResponse(messagesArray, userMessage, conversationHistory), DEFAULT_TIMEOUT_MS);
        }

        // Next fallback: generateWithContext(systemPromptString, userMessage)
        if (typeof svc.generateWithContext === 'function') {
            const systemPromptString = messagesArray.find(m => m.role === 'system')?.content || '';
            return await this.withTimeout(svc.generateWithContext(systemPromptString, userMessage), DEFAULT_TIMEOUT_MS);
        }

        // Provider does not implement expected methods
        throw new Error(`Provider ${provider.name} adapter missing generateChatResponse/generateWithContext`);
    }

    /* ---------------------
       Public API
       --------------------- */

    /**
     * Main generator with multi-provider fallback
     * - systemPrompt (string)
     * - userMessage (string)
     * - conversationHistory: array oldest-first [{sender_type, content}, ...]
     * - taskType: optional
     */
    async generateChatResponse(userMessage, conversationHistory = [], systemPrompt = '', taskType = 'default') {
        this.stats.totalRequests++;

        try {
            // If caller passed default, try to detect task type
            if (!taskType || taskType === 'default') {
                taskType = this.detectTaskType(userMessage, systemPrompt);
            }

            const messagesArray = this.buildMessagesArray(systemPrompt, conversationHistory, userMessage);
            const providersToTry = this.getProvidersForTask(taskType);

            // Filter available providers (soft check)
            let available = providersToTry.filter(p => this.isProviderAvailable(p));

            // If none available, attempt providersToTry anyway (we'll handle errors individually)
            if (!available.length) available = providersToTry;

            for (const provider of available) {
                try {
                    // final guard: skip providers that can't handle very large prompts
                    if (typeof systemPrompt === 'string' && systemPrompt.length > 8000 && ['HuggingFace', 'Cloudflare'].includes(provider.name)) {
                        // skip small providers for huge system prompts
                        continue;
                    }

                    // call provider
                    const raw = await this.callProvider(provider, messagesArray, userMessage, conversationHistory);

                    // mark stats
                    this.stats.successfulRequests++;
                    this.stats.providerUsage[provider.name].requests = (this.stats.providerUsage[provider.name].requests || 0);
                    // provider succeeded — sanitize and return
                    const text = typeof raw === 'string' ? raw : (raw?.message || raw?.text || JSON.stringify(raw));
                    const cleaned = this.sanitizeResponse(String(text));

                    // success
                    return { provider: provider.name, text: cleaned, raw };
                } catch (err) {
                    // provider error — record and move on
                    this.stats.providerUsage[provider.name].errors = (this.stats.providerUsage[provider.name].errors || 0) + 1;
                    this.providerStatus[provider.name].errorsToday = (this.providerStatus[provider.name].errorsToday || 0) + 1;
                    this.markProviderError(provider.name, err);
                    console.warn(`aiService: provider ${provider.name} failed: ${err?.message || err}`);
                    continue;
                }
            }

            // all providers failed
            this.stats.failedRequests++;
            console.error('aiService: all AI providers failed for this request');
            return { provider: null, text: SAFE_FALLBACK_REPLY, raw: null };
        } catch (fatal) {
            this.stats.failedRequests++;
            console.error('aiService.generateChatResponse fatal error:', fatal?.message || fatal);
            return { provider: null, text: SAFE_FALLBACK_REPLY, raw: null };
        }
    }

    /**
     * Simpler call when you already assembled a systemPrompt and want a one-shot call
     */
    async generateWithContext(systemPrompt, userMessage) {
        // try providers in availability order
        const providers = this.providers.filter(p => this.isProviderAvailable(p)) || this.providers;
        for (const p of providers) {
            try {
                if (typeof p.service.generateWithContext === 'function') {
                    const raw = await this.withTimeout(p.service.generateWithContext(systemPrompt, userMessage), DEFAULT_TIMEOUT_MS);
                    const text = typeof raw === 'string' ? raw : (raw?.message || raw?.text || JSON.stringify(raw));
                    return { provider: p.name, text: this.sanitizeResponse(String(text)), raw };
                }
            } catch (err) {
                this.markProviderError(p.name, err);
                console.warn(`aiService.generateWithContext: ${p.name} failed: ${err?.message || err}`);
                continue;
            }
        }
        return { provider: null, text: SAFE_FALLBACK_REPLY, raw: null };
    }

    /**
     * Optional streaming support.
     * Delegates to provider if it has generateStreamingResponse and returns an async iterator or event emitter.
     * Otherwise returns null to indicate streaming not available.
     */
    async generateStreamingResponse(systemPrompt, userMessage, conversationHistory = [], taskType = 'default') {
        const task = taskType === 'default' ? this.detectTaskType(userMessage, systemPrompt) : taskType;
        const providers = this.getProvidersForTask(task).filter(p => this.isProviderAvailable(p));

        for (const p of providers) {
            if (p.service && typeof p.service.generateStreamingResponse === 'function') {
                try {
                    // let the provider handle streaming with a messages array
                    const messages = this.buildMessagesArray(systemPrompt, conversationHistory, userMessage);
                    return p.service.generateStreamingResponse(messages, userMessage, conversationHistory);
                } catch (err) {
                    this.markProviderError(p.name, err);
                    console.warn(`aiService.stream: ${p.name} streaming failed: ${err?.message || err}`);
                    continue;
                }
            }
        }
        // streaming not supported by any provider
        return null;
    }

    /* ----------------
       Diagnostics
       ---------------- */
    getStats() {
        const successRate = this.stats.totalRequests > 0
            ? ((this.stats.successfulRequests / this.stats.totalRequests) * 100).toFixed(2)
            : '0.00';
        return {
            totalRequests: this.stats.totalRequests,
            successful: this.stats.successfulRequests,
            failed: this.stats.failedRequests,
            successRate: `${successRate}%`,
            providerBreakdown: this.stats.providerUsage,
            routingStatus: this.providerStatus
        };
    }

    getMostReliableProvider() {
        let best = null;
        let bestRate = -1;
        for (const [name, usage] of Object.entries(this.stats.providerUsage)) {
            const req = usage.requests || 0;
            const err = usage.errors || 0;
            if (req === 0) continue;
            const rate = ((req - err) / req) * 100;
            if (rate > bestRate) {
                bestRate = rate;
                best = name;
            }
        }
        return { provider: best, successRate: bestRate >= 0 ? bestRate.toFixed(2) + '%' : 'N/A' };
    }

    // convenience wrappers for provider-specific helpers (preserve your existing API)
    async analyzeEmotion(text) { return await geminiService.analyzeEmotion(text); }
    async extractEntities(text) { return await geminiService.extractEntities(text); }
    async detectMemorableMoment(text) { return await geminiService.detectMemorableMoment(text); }
    async generateEmbedding(text) { return await geminiService.generateEmbedding(text); }
}

export default new AIService();
