import Groq from 'groq-sdk';
import fs from 'fs';

class GroqService {
    constructor() {
        this.groq = new Groq({
            apiKey: process.env.GROQ_API_KEY || 'dummy_key', // Prevent crash if missing
        });
        this.isEnabled = !!process.env.GROQ_API_KEY;
    }

    /**
     * Generate chat response (fallback for Gemini)
     */
    async generateChatResponse(messagesArray, userMessage, conversationHistory) {
        if (!this.isEnabled) {
            throw new Error('Groq API key not configured');
        }

        try {
            // Groq SDK is OpenAI-compatible, so messagesArray works directly
            const completion = await this.groq.chat.completions.create({
                messages: messagesArray,
                model: 'llama3-70b-8192', // Fast and free
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
                model: 'llama3-70b-8192',
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
                model: 'distil-whisper-large-v3-en', // Ultra fast & free
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
