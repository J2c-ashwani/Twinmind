// mistralService.js (Corrected for aiService compatibility)

import fetch from "node-fetch";

class MistralService {
    constructor() {
        this.apiKey = process.env.MISTRAL_API_KEY;
        this.baseUrl = "https://api.mistral.ai/v1";
        this.model = "mistral-tiny"; // Fast + cheap

        if (this.apiKey) {
            console.log("✅ Mistral Service initialized");
        } else {
            console.log("⚠️ Mistral API key missing — service disabled");
        }
    }

    /**
     * REQUIRED SIGNATURE (must match aiService)
     * generateChatResponse(messagesArray, userMessage, conversationHistory)
     */
    async generateChatResponse(messagesArray, userMessage, conversationHistory) {
        if (!this.apiKey) {
            throw new Error("Mistral API key not configured");
        }

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: messagesArray,  // already assembled correctly
                    temperature: 0.9,
                    max_tokens: 900,
                }),
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Mistral API Error: ${err}`);
            }

            const data = await response.json();
            return data?.choices?.[0]?.message?.content || "";
        } catch (error) {
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
