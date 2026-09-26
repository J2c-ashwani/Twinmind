// openaiService.js (Corrected for aiService compatibility)

import OpenAI from "openai";

class OpenAIService {
    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.client = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
            console.log(`✅ OpenAI Service initialized (Model: ${this.model})`);
        } else {
            console.log("⚠️ OpenAI API key missing — OpenAI disabled");
            this.client = null;
        }
    }

    get isConfigured() {
        return !!(this.client && process.env.OPENAI_API_KEY);
    }

    /**
     * Unified generateChatResponse accepting object contract or legacy positional arguments
     */
    async generateChatResponse(input, legacyUserMessage, legacyHistory) {
        if (!this.client) throw new Error("OpenAI not configured");

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
            const completionParams = {
                model: this.model,
                messages: messagesArray,
                temperature: 0.7,
                max_tokens: 2048,
            };

            if (responseFormat === 'json') {
                completionParams.response_format = { type: "json_object" };
            }

            const response = await this.client.chat.completions.create(completionParams);

            return response.choices[0].message.content;
        } catch (error) {
            console.error("❌ OpenAI generateChatResponse Error:", error.message);
            throw error;
        }
    }

    /**
     * Used when aiService wants a simple call.
     * generateWithContext(systemPrompt, userMessage)
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.client) throw new Error("OpenAI not configured");

        try {
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ];

            const response = await this.client.chat.completions.create({
                model: this.model,
                temperature: 0.7,
                max_tokens: 900,
                messages,
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error("❌ OpenAI generateWithContext Error:", error.message);
            throw error;
        }
    }

    /**
     * Embeddings (used for memory + semantic search)
     */
    async generateEmbedding(text) {
        if (!this.client || this.embeddingDisabled) throw new Error("OpenAI embeddings unavailable");

        try {
            const response = await this.client.embeddings.create({
                model: "text-embedding-3-small",
                input: text,
                encoding_format: "float",
            });

            return response.data[0].embedding;
        } catch (error) {
            if (error.status === 429 || error.message?.includes("credits")) {
                this.embeddingDisabled = true;
                console.warn("⚠️ OpenAI Embedding Quota exceeded — disabled until restart.");
            }
            throw error;
        }
    }
    async transcribeAudio(filePath) {
        if (!this.client) throw new Error("OpenAI not configured");
        try {
            const fs = await import('fs');
            const transcription = await this.client.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: "whisper-1",
            });
            return transcription.text;
        } catch (error) {
            console.error("OpenAI Transcription Error:", error);
            throw error;
        }
    }
}

export default new OpenAIService();
