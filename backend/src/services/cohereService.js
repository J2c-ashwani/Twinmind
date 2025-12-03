import { CohereClient } from 'cohere-ai';

class CohereService {
    constructor() {
        this.cohere = new CohereClient({
            token: process.env.COHERE_API_KEY || 'dummy_key',
        });
        this.isEnabled = !!process.env.COHERE_API_KEY;
    }

    /**
     * Generate chat response using Cohere
     */
    async generateChatResponse(prompt, conversationHistory = []) {
        if (!this.isEnabled) {
            throw new Error('Cohere API key not configured');
        }

        try {
            const chatHistory = conversationHistory.map(msg => ({
                role: msg.sender_type === 'user' ? 'USER' : 'CHATBOT',
                message: msg.content,
            }));

            const response = await this.cohere.chat({
                message: prompt,
                chatHistory,
                model: 'command-r', // Free tier available
                temperature: 0.9,
            });

            return response.text;
        } catch (error) {
            console.error('Cohere API error:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    /**
     * Generate with system context
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.isEnabled) {
            throw new Error('Cohere API key not configured');
        }

        try {
            const response = await this.cohere.chat({
                message: userMessage,
                preamble: systemPrompt,
                model: 'command-r',
                temperature: 0.9,
            });

            return response.text;
        } catch (error) {
            console.error('Cohere API error:', error);
            throw new Error('Failed to generate AI response');
        }
    }
}

export default new CohereService();
