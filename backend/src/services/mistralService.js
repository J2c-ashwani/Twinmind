import fetch from 'node-fetch';

class MistralService {
    constructor() {
        this.apiKey = process.env.MISTRAL_API_KEY;
        this.baseUrl = 'https://api.mistral.ai/v1';
        this.model = 'mistral-tiny'; // Free tier optimized

        if (this.apiKey) {
            console.log('✅ Mistral Service initialized');
        } else {
            console.log('⚠️  Mistral API key not found');
        }
    }

    /**
     * Generate chat response
     */
    async generateChatResponse(prompt, conversationHistory = [], systemPrompt = null) {
        if (!this.apiKey) {
            throw new Error('Mistral API key not configured');
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

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1000,
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Mistral API error: ${error}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Mistral API Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate with system context
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.apiKey) {
            throw new Error('Mistral API key not configured');
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
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
                throw new Error(`Mistral API error: ${error}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('Mistral Context Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate embedding for text
     * Returns 1024-dimensional vector
     */
    async generateEmbedding(text) {
        if (!this.apiKey) {
            throw new Error('Mistral API key not configured');
        }

        try {
            const response = await fetch(`${this.baseUrl}/embeddings`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'mistral-embed',
                    input: [text],
                }),
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Mistral Embedding API error: ${error}`);
            }

            const data = await response.json();
            return data.data[0].embedding;
        } catch (error) {
            console.error('Mistral Embedding Error:', error.message);
            throw error;
        }
    }
}

export default new MistralService();
