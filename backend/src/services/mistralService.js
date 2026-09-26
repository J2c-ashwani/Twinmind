// mistralService.js (Corrected for aiService compatibility)

import fetch from "node-fetch";

class MistralService {
    constructor() {
        this.apiKey = process.env.MISTRAL_API_KEY;
        this.baseUrl = "https://api.mistral.ai/v1";
        this.model = process.env.MISTRAL_MODEL || "mistral-small-latest";
        this.fallbackModel = process.env.MISTRAL_FALLBACK_MODEL || "open-mistral-7b";

        if (this.apiKey) {
            console.log(`✅ Mistral Service initialized (Model: ${this.model})`);
        } else {
            console.log("⚠️ Mistral API key missing — service disabled");
        }
    }

    get isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Unified generateChatResponse accepting object contract or legacy positional arguments
     */
    async generateChatResponse(input, legacyUserMessage, legacyHistory) {
        if (!this.apiKey) {
            throw new Error("Mistral API key not configured");
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

        const callMistral = async (modelId) => {
            const bodyPayload = {
                model: modelId,
                messages: messagesArray,
                temperature: 0.7,
                max_tokens: 2048,
            };

            if (responseFormat === 'json') {
                bodyPayload.response_format = { type: "json_object" };
            }

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(bodyPayload),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Mistral API Error (${response.status}): ${err}`);
            }

            const data = await response.json();
            return data?.choices?.[0]?.message?.content || "";
        };

        try {
            return await callMistral(this.model);
        } catch (error) {
            if (this.fallbackModel && this.fallbackModel !== this.model) {
                console.warn(`Mistral model ${this.model} failed, retrying with ${this.fallbackModel}...`);
                try {
                    return await callMistral(this.fallbackModel);
                } catch (fallbackErr) {
                    console.error("❌ Mistral generateChatResponse Error:", fallbackErr.message);
                    throw fallbackErr;
                }
            }
            console.error("❌ Mistral generateChatResponse Error:", error.message);
            throw error;
        }
    }

    /**
     * Simple system + user context call
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.apiKey) {
            throw new Error("Mistral API key not configured");
        }

        try {
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ];

            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    temperature: 0.7,
                    max_tokens: 800
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Mistral Context API Error: ${err}`);
            }

            const data = await response.json();
            return data?.choices?.[0]?.message?.content || "";
        } catch (error) {
            console.error("❌ Mistral generateWithContext Error:", error.message);
            throw error;
        }
    }

    /**
     * Generate Embeddings (1024d)
     */
    async generateEmbedding(text) {
        if (!this.apiKey) {
            throw new Error("Mistral API key not configured");
        }

        try {
            const response = await fetch(`${this.baseUrl}/embeddings`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "mistral-embed",
                    input: [text]
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Mistral Embedding Error: ${err}`);
            }

            const data = await response.json();
            return data?.data?.[0]?.embedding || [];
        } catch (error) {
            console.error("❌ Mistral Embedding API Error:", error.message);
            throw error;
        }
    }
}

export default new MistralService();
