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
    async generateChatResponse(messagesArray, userMessage, conversationHistory) {
        if (!this.isEnabled) {
            throw new Error('Cohere API key not configured');
        }

        try {
            // Extract System Prompt for Preamble
            const systemMsg = messagesArray.find(m => m.role === 'system');
            const preamble = systemMsg ? systemMsg.content : undefined;

            // Filter out system prompt
            const filteredMessages = messagesArray.filter(m => m.role !== 'system');

            // Extract current message (last one)
            // Note: messagesArray includes the current user message at the end
            // Cohere expects 'message' and 'chatHistory' separately
            const currentMsgObj = filteredMessages[filteredMessages.length - 1];
            const currentPrompt = currentMsgObj ? currentMsgObj.content : userMessage;

            // Build history (excluding last message)
            const chatHistory = filteredMessages.slice(0, -1).map(msg => ({
                role: msg.role === 'user' ? 'USER' : 'CHATBOT',
                message: msg.content,
            }));

            const response = await this.cohere.chat({
                message: currentPrompt,
                chatHistory: chatHistory,
                preamble: preamble, // Use system prompt as preamble
                model: 'command-r', // Free tier available
                temperature: 0.9,
            });

            return response.text;
        } catch (error) {
            console.error('Cohere API error:', error);
            throw new Error('Failed to generate AI response: ' + error.message);
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
