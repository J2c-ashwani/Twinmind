import { HfInference } from '@huggingface/inference';

class HuggingFaceService {
    constructor() {
        this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY || 'dummy_key');
        this.isEnabled = !!process.env.HUGGINGFACE_API_KEY;
    }

    /**
     * Generate chat response using Hugging Face
     */
    async generateChatResponse(messagesArray, userMessage, conversationHistory) {
        if (!this.isEnabled) {
            throw new Error('Hugging Face API key not configured');
        }

        try {
            // Build conversation context string from messages array
            let context = '';

            messagesArray.forEach(msg => {
                if (msg.role === 'system') {
                    context += `System: ${msg.content}\n\n`;
                } else {
                    const role = msg.role === 'user' ? 'User' : 'Assistant';
                    context += `${role}: ${msg.content}\n`;
                }
            });

            const formattedMessages = messagesArray.length > 0 ? messagesArray.map(m => ({
                role: m.role === 'system' ? 'system' : (m.role === 'user' ? 'user' : 'assistant'),
                content: m.content || userMessage || ''
            })) : [{ role: 'user', content: userMessage || 'Hello' }];

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
