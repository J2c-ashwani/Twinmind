import Anthropic from '@anthropic-ai/sdk';

class ClaudeService {
    constructor() {
        this.client = new Anthropic({
            apiKey: process.env.CLAUDE_API_KEY || 'dummy_key',
        });
        this.isEnabled = !!process.env.CLAUDE_API_KEY;
    }

    /**
     * Generate chat response using Claude
     */
    async generateChatResponse(messagesArray, userMessage, conversationHistory) {
        if (!this.isEnabled) {
            throw new Error('Claude API key not configured');
        }

        try {
            // Extract system prompt
            const systemMsg = messagesArray.find(m => m.role === 'system');
            const systemPrompt = systemMsg ? systemMsg.content : undefined;

            // Filter out system prompt for the messages array
            const anthropicMessages = messagesArray.filter(m => m.role !== 'system');

            const response = await this.client.messages.create({
                model: 'claude-3-haiku-20240307', // Free tier available
                max_tokens: 2048,
                system: systemPrompt,
                messages: anthropicMessages,
            });

            return response.content[0].text;
        } catch (error) {
            console.error('Claude API error:', error);
            throw new Error('Failed to generate AI response: ' + error.message);
        }
    }

    /**
     * Generate with system context
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.isEnabled) {
            throw new Error('Claude API key not configured');
        }

        try {
            const response = await this.client.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 2048,
                system: systemPrompt,
                messages: [{ role: 'user', content: userMessage }],
            });

            return response.content[0].text;
        } catch (error) {
            console.error('Claude API error:', error);
            throw new Error('Failed to generate AI response');
        }
    }
}

export default new ClaudeService();
