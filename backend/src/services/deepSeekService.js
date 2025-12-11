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

        this.client = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: this.apiKey,
        });

        logger.info('✅ DeepSeek Service initialized');
    }

    /**
     * Generate response using DeepSeek Chat (V3)
     * Best for: General conversation, coding, fast responses
     */
    async generateChatResponse(messages, systemPrompt = null) {
        try {
            const formattedMessages = [
                ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                ...messages
            ];

            const completion = await this.client.chat.completions.create({
                messages: formattedMessages,
                model: 'deepseek-chat',
                temperature: 1.0, // Recommended for V3
            });

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
