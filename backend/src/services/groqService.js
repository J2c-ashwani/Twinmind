import Groq from 'groq-sdk';
import fs from 'fs';

class GroqService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY;
        this.model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
        this.fallbackModel = process.env.GROQ_FALLBACK_MODEL || 'openai/gpt-oss-20b';
        
        if (this.apiKey) {
            this.groq = new Groq({ apiKey: this.apiKey });
            console.log(`✅ Groq Service initialized (Model: ${this.model})`);
        } else {
            this.groq = null;
            console.log('⚠️  Groq API key not found');
        }
        this.isEnabled = !!this.apiKey;
    }

    get isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Unified generateChatResponse accepting object contract or legacy positional arguments
     */
    async generateChatResponse(input, legacyUserMessage, legacyHistory) {
        if (!this.isEnabled || !this.groq) {
            throw new Error('Groq API key not configured');
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

        const callGroq = async (modelId) => {
            const completionParams = {
                messages: messagesArray,
                model: modelId,
                temperature: 0.7,
                max_tokens: 2048,
            };

            if (responseFormat === 'json') {
                completionParams.response_format = { type: 'json_object' };
            }

            const completion = await this.groq.chat.completions.create(completionParams);
            return completion.choices[0].message.content;
        };

        try {
            return await callGroq(this.model);
        } catch (error) {
            if (this.fallbackModel && this.fallbackModel !== this.model) {
                console.warn(`Groq model ${this.model} failed, retrying with ${this.fallbackModel}...`);
                try {
                    return await callGroq(this.fallbackModel);
                } catch (fallbackErr) {
                    console.error('Groq API fallback error:', fallbackErr);
                    throw fallbackErr;
                }
            }
            console.error('Groq API error:', error);
            throw new Error('Failed to generate AI response: ' + error.message);
        }
    }

    /**
     * Generate with system context
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.isEnabled) {
            throw new Error('Groq API key not configured');
        }

        try {
            const completion = await this.groq.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage },
                ],
                model: 'llama-3.3-70b-versatile',
                temperature: 0.9,
                max_tokens: 2048,
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error('Groq API error:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    /**
     * Transcribe audio file using Groq Whisper (Distil-V3)
     */
    async transcribeAudio(filePath) {
        if (!this.isEnabled) {
            throw new Error('Groq API key not configured');
        }

        try {
            // Groq requires a ReadStream for the file
            const transcription = await this.groq.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: 'whisper-large-v3-turbo', // Replacement for deprecated distil-whisper-large-v3-en
                response_format: 'json',
            });

            return transcription.text;
        } catch (error) {
            console.error('Groq Transcription Error:', error.message);
            throw error;
        }
    }
}

export default new GroqService();
