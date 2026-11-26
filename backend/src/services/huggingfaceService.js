import { HfInference } from '@huggingface/inference';

class HuggingFaceService {
    constructor() {
        this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY || 'dummy_key');
        this.isEnabled = !!process.env.HUGGINGFACE_API_KEY;
    }

    /**
     * Unified generateChatResponse accepting object contract or legacy positional arguments
     */
    async generateChatResponse(input, legacyUserMessage, legacyHistory) {
        if (!this.isEnabled) {
            throw new Error('Hugging Face API key not configured');
        }

        let messagesArray = [];
        let userMessage = '';

        if (input && typeof input === 'object' && !Array.isArray(input)) {
            messagesArray = Array.isArray(input.messages) ? input.messages : [];
            userMessage = input.userMessage || '';
            if (messagesArray.length === 0 && (input.systemPrompt || userMessage)) {
                if (input.systemPrompt) {
                    messagesArray.push({ role: 'system', content: input.systemPrompt });
                }
                if (userMessage) {
                    messagesArray.push({ role: 'user', content: userMessage });
                }
            }
        } else if (Array.isArray(input)) {
            messagesArray = input;
            userMessage = legacyUserMessage || '';
        } else if (typeof input === 'string') {
            userMessage = input;
            const history = Array.isArray(legacyHistory) ? legacyHistory : [];
            messagesArray = [
                ...history.map((m) => ({
                    role: m.sender_type === 'user' || m.role === 'user' ? 'user' : 'assistant',
                    content: m.content || m.message || '',
                })),
                { role: 'user', content: input },
            ];
        }

        try {
            const formattedMessages = messagesArray.length > 0
                ? messagesArray.map((m) => ({
                    role: m.role === 'system' ? 'system' : (m.role === 'user' ? 'user' : 'assistant'),
                    content: m.content || userMessage || '',
                }))
                : [{ role: 'user', content: userMessage || 'Hello' }];

            const response = await this.hf.chatCompletion({
                model: process.env.HUGGINGFACE_MODEL || 'meta-llama/Llama-3.2-3B-Instruct',
                messages: formattedMessages,
                max_tokens: 512,
                temperature: 0.9,
            });

            return response.choices?.[0]?.message?.content?.trim() || '';
        } catch (error) {
            console.error('Hugging Face API error:', error);
            throw new Error('Failed to generate AI response: ' + error.message);
        }
    }

    /**
     * Generate with system context
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.isEnabled) {
            throw new Error('Hugging Face API key not configured');
        }

        try {
            const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\nAssistant:`;

            const response = await this.hf.textGeneration({
                model: 'mistralai/Mistral-7B-Instruct-v0.2',
                inputs: fullPrompt,
                parameters: {
                    max_new_tokens: 512,
                    temperature: 0.9,
                },
            });

            return response.generated_text.split('Assistant:').pop().trim();
        } catch (error) {
            console.error('Hugging Face API error:', error);
            throw new Error('Failed to generate AI response');
        }
    }
}

export default new HuggingFaceService();
