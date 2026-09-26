import OpenAI from 'openai';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

class DeepSeekService {
    constructor() {
        // Use environment variable only
        this.apiKey = process.env.DEEPSEEK_API_KEY;

        if (!this.apiKey) {
            logger.warn('⚠️ DeepSeek API key missing in environment variables');
            return;
        }

        this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

        this.client = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: this.apiKey,
        });

        logger.info(`✅ DeepSeek Service initialized (Model: ${this.model})`);
    }

    get isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Unified generateChatResponse accepting object contract or legacy parameters
     */
    async generateChatResponse(input, legacyUserMessage, legacyHistory) {
        if (!this.client) {
            throw new Error('DeepSeek API key not configured');
        }

        let messagesArray = [];
        let systemPrompt = null;
        let responseFormat = 'text';

        if (input && typeof input === 'object' && !Array.isArray(input)) {
            messagesArray = input.messages || [];
            systemPrompt = input.systemPrompt || null;
            responseFormat = input.responseFormat || 'text';
            if (messagesArray.length === 0 && input.userMessage) {
                messagesArray = [
                    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                    { role: 'user', content: input.userMessage }
                ];
            }
        } else if (Array.isArray(input)) {
            messagesArray = input;
        }

        try {
            const completionParams = {
                messages: messagesArray,
                model: this.model,
                temperature: 1.0,
            };

            if (responseFormat === 'json') {
                completionParams.response_format = { type: 'json_object' };
            }

            const completion = await this.client.chat.completions.create(completionParams);

            return completion.choices[0].message.content;
        } catch (error) {
            logger.error('DeepSeek Chat Error:', error);
            throw error;
        }
    }

    /**
     * Generate response using DeepSeek Reasoner (R1)
     * Best for: Complex math, logic, psychology analysis, "Deep Thinking"
     */
    async generateReasoning(prompt) {
        try {
            const completion = await this.client.chat.completions.create({
                messages: [{ role: 'user', content: prompt }],
                model: 'deepseek-reasoner',
                temperature: 0.7,
            });

            return completion.choices[0].message.content;
        } catch (error) {
            logger.error('DeepSeek Reasoner Error:', error);
            throw error;
        }
    }
}

export default new DeepSeekService();
