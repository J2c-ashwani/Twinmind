import fetch from 'node-fetch';

class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPENROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1';

        const configuredModel = process.env.OPENROUTER_MODEL;
        this.models = configuredModel ? [configuredModel] : [
            'meta-llama/llama-3.1-8b-instruct:free',
            'qwen/qwen-2.5-7b-instruct:free',
            'mistralai/mistral-7b-instruct:free'
        ];

        this.currentModelIndex = 0;

        if (this.apiKey) {
            console.log(`✅ OpenRouter Service initialized (Primary: ${this.models[0]})`);
        } else {
            console.log('⚠️  OpenRouter API key not found');
        }
    }

    get isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Get current model
     */
    getCurrentModel() {
        const model = this.models[this.currentModelIndex];
        this.currentModelIndex = (this.currentModelIndex + 1) % this.models.length;
        return model;
    }

    /**
     * Unified generateChatResponse accepting object contract or legacy positional arguments
     */
    async generateChatResponse(input, legacyUserMessage, legacyHistory) {
        if (!this.apiKey) {
            throw new Error('OpenRouter not configured');
        }

        let messagesArray = [];
        let responseFormat = 'text';

        if (input && typeof input === 'object' && !Array.isArray(input)) {
            messagesArray = input.messages || [];
            responseFormat = input.responseFormat || 'text';
            if (messagesArray.length === 0 && input.userMessage) {
                messagesArray = [
                    ...(input.systemPrompt ? [{ role: 'system', content: input.systemPrompt }] : []),
                    { role: 'user', content: input.userMessage }
                ];
            }
        } else if (Array.isArray(input)) {
            messagesArray = input;
        }

        try {
            const model = this.getCurrentModel();

            const bodyPayload = {
                model: model,
                messages: messagesArray,
                temperature: 0.7,
                max_tokens: 2048,
            };

            if (responseFormat === 'json') {
                bodyPayload.response_format = { type: "json_object" };
            }

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://twingenie.app',
                    'X-Title': 'TwinGenie',
                },
                body: JSON.stringify(bodyPayload),
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
                    'X-Title': 'TwinGenie',
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
