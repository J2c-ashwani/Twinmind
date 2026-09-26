import Anthropic from '@anthropic-ai/sdk';

class ClaudeService {
    constructor() {
        this.apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
        this.model = process.env.ANTHROPIC_MODEL || process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022';
        this.fallbackModel = process.env.ANTHROPIC_FALLBACK_MODEL || 'claude-3-haiku-20240307';

        if (this.apiKey) {
            this.client = new Anthropic({ apiKey: this.apiKey });
            console.log(`✅ Claude Service initialized (Model: ${this.model})`);
        } else {
            this.client = null;
            console.log('⚠️  Claude/Anthropic API key not found');
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
        if (!this.isEnabled || !this.client) {
            throw new Error('Claude/Anthropic API key not configured');
        }

        let messagesArray = [];
        let systemPrompt = undefined;

        if (input && typeof input === 'object' && !Array.isArray(input)) {
            messagesArray = input.messages || [];
            systemPrompt = input.systemPrompt || undefined;
            if (messagesArray.length === 0 && input.userMessage) {
                messagesArray = [{ role: 'user', content: input.userMessage }];
            }
        } else if (Array.isArray(input)) {
            messagesArray = input;
        }

        try {
            // Extract system prompt if present in messages
            if (!systemPrompt) {
                const systemMsg = messagesArray.find(m => m.role === 'system');
                systemPrompt = systemMsg ? systemMsg.content : undefined;
            }

            const anthropicMessages = messagesArray
                .filter(m => m.role !== 'system')
                .map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content || ' '
                }));

            const callClaude = async (modelId) => {
                const response = await this.client.messages.create({
                    model: modelId,
                    max_tokens: 2048,
                    system: systemPrompt,
                    messages: anthropicMessages,
                });
                return response.content[0].text;
            };

            try {
                return await callClaude(this.model);
            } catch (err) {
                if (this.fallbackModel && this.fallbackModel !== this.model) {
                    console.warn(`Claude model ${this.model} failed, retrying with ${this.fallbackModel}...`);
                    return await callClaude(this.fallbackModel);
                }
                throw err;
            }
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
