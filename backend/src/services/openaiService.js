import OpenAI from 'openai';

class OpenAIService {
    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.client = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
            this.model = 'gpt-4o-mini'; // Cost-effective model
            console.log('✅ OpenAI Service initialized with GPT-4o-mini');
        } else {
            console.log('⚠️  OpenAI API key not found');
        }
    }

    /**
     * Generate chat response
     */
    async generateChatResponse(prompt, conversationHistory = [], systemPrompt = null) {
        if (!this.client) {
            throw new Error('OpenAI not configured');
        }

        try {
            const messages = [];

            // Add system prompt
            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt });
            }

            // Add conversation history
            if (conversationHistory && conversationHistory.length > 0) {
                conversationHistory.forEach((msg) => {
                    messages.push({
                        role: msg.role === 'user' ? 'user' : 'assistant',
                        content: msg.content,
                    });
                });
            }

            // Add current prompt
            messages.push({ role: 'user', content: prompt });

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 1000,
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI API Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate with system context
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.client) {
            throw new Error('OpenAI not configured');
        }

        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                temperature: 0.7,
                max_tokens: 800,
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error('OpenAI Context Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate embedding for text
     * Returns 1536-dimensional vector
     */
    async generateEmbedding(text) {
        if (!this.client) {
            throw new Error('OpenAI not configured');
        }

        try {
            const response = await this.client.embeddings.create({
                model: 'text-embedding-3-small',
                input: text,
                encoding_format: 'float',
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error('OpenAI Embedding Error:', error.message);
            throw error;
        }
    }
}

export default new OpenAIService();
