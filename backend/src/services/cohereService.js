import { CohereClient } from 'cohere-ai';

class CohereService {
    constructor() {
        this.apiKey = process.env.COHERE_API_KEY;
        this.model = process.env.COHERE_MODEL || 'command-r';
        if (this.apiKey) {
            this.cohere = new CohereClient({ token: this.apiKey });
            console.log(`✅ Cohere Service initialized (Model: ${this.model})`);
        } else {
            this.cohere = null;
            console.log('⚠️  Cohere API key not found');
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
        if (!this.isEnabled || !this.cohere) {
            throw new Error('Cohere API key not configured');
        }

        let messagesArray = [];
        let userMessage = '';
        let systemPrompt = undefined;

        if (input && typeof input === 'object' && !Array.isArray(input)) {
            messagesArray = input.messages || [];
            userMessage = input.userMessage || '';
            systemPrompt = input.systemPrompt || undefined;
            if (messagesArray.length === 0 && userMessage) {
                messagesArray = [{ role: 'user', content: userMessage }];
            }
        } else if (Array.isArray(input)) {
            messagesArray = input;
            userMessage = legacyUserMessage || '';
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
