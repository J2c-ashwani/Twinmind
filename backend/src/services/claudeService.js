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
    async generateChatResponse(prompt, conversationHistory = []) {
        if (!this.isEnabled) {
            throw new Error('Claude API key not configured');
        }

        try {
            const messages = conversationHistory.map(msg => ({
                role: msg.sender_type === 'user' ? 'user' : 'assistant',
                content: msg.content,
            }));

            messages.push({ role: 'user', content: prompt });

            const response = await this.client.messages.create({
                model: 'claude-3-haiku-20240307', // Free tier available
                max_tokens: 2048,
                messages,
            });

            return response.content[0].text;
        } catch (error) {
            console.error('Claude API error:', error);
            throw new Error('Failed to generate AI response');
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
