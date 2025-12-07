// openaiService.js (Corrected for aiService compatibility)

import OpenAI from "openai";

class OpenAIService {
    constructor() {
        if (process.env.OPENAI_API_KEY) {
            this.client = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });

            this.model = "gpt-4o-mini"; // Fast + cheap
            console.log("✅ OpenAI Service initialized (gpt-4o-mini)");
        } else {
            console.log("⚠️ OpenAI API key missing — OpenAI disabled");
            this.client = null;
        }
    }

    /**
     * NEW SIGNATURE (must match aiService.js):
     * generateChatResponse(messagesArray, userMessage, conversationHistory)
     */
    async generateChatResponse(messagesArray, userMessage, conversationHistory) {
        if (!this.client) throw new Error("OpenAI not configured");

        try {
            // messagesArray already includes:
            // - system prompt
            // - conversation history
            // - user message
            // So we pass it directly to OpenAI

            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: messagesArray,
                temperature: 0.9,
                max_tokens: 900,
            });

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
        if (!this.client) throw new Error("OpenAI not configured");

        try {
            const response = await this.client.embeddings.create({
                model: "text-embedding-3-small",
                input: text,
                encoding_format: "float",
            });

            return response.data[0].embedding;
        } catch (error) {
            console.error("❌ OpenAI Embedding Error:", error.message);
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
