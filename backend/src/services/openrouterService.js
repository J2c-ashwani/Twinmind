import fetch from 'node-fetch';

class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1';

        // Free models available on OpenRouter
        this.models = [
            'mistralai/mistral-7b-instruct:free',
            'huggingfaceh4/zephyr-7b-beta:free',
            'google/gemma-7b-it:free',
            'meta-llama/llama-3-8b-instruct:free',
        ];

        this.currentModelIndex = 0;

        if (this.apiKey) {
            console.log('✅ OpenRouter Service initialized with free models');
        } else {
            console.log('⚠️  OpenRouter API key not found');
        }
    }

    /**
     * Get current model (rotates through available free models)
     */
    getCurrentModel() {
        const model = this.models[this.currentModelIndex];
        this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
        return model;
    }

    /**
     * Generate chat response
     */
    async generateChatResponse(prompt, conversationHistory = [], systemPrompt = null) {
        if (!this.apiKey) {
            throw new Error('OpenRouter not configured');
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

            const model = this.getCurrentModel();

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://twinmind.app',
                    'X-Title': 'TwinMind',
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenRouter API error: ${error}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenRouter API Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate with system context
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.apiKey) {
            throw new Error('OpenRouter not configured');
        }

        try {
            const model = this.getCurrentModel();

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://twinmind.app',
                    'X-Title': 'TwinMind',
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userMessage },
                    ],
                    temperature: 0.7,
                    max_tokens: 800,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenRouter API error: ${error}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenRouter Context Error:', error.message);
            throw error;
        }
    }
}

export default new OpenRouterService();
