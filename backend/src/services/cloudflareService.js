import fetch from 'node-fetch';

class CloudflareService {
    constructor() {
        this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
        this.apiToken = process.env.CLOUDFLARE_API_TOKEN;
        // Using Llama 3 8B Instruct (Free Beta)
        this.model = '@cf/meta/llama-3-8b-instruct';

        if (this.accountId && this.apiToken) {
            console.log('✅ Cloudflare Service initialized');
        } else {
            console.log('⚠️  Cloudflare credentials not found (Service disabled)');
        }
    }

    get isConfigured() {
        return !!(this.accountId && this.apiToken);
    }

    /**
     * Generate chat response
     */
    async generateChatResponse(messagesArray, userMessage, conversationHistory) {
        if (!this.accountId || !this.apiToken) {
            throw new Error('Cloudflare credentials not configured');
        }

        try {
            // Cloudflare AI Llama 3 supports standard messages array
            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: messagesArray,
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Cloudflare API error: ${error}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(`Cloudflare AI error: ${JSON.stringify(data.errors)}`);
            }

            return data.result.response;
        } catch (error) {
            console.error('Cloudflare API Error:', error.message);
            throw error;
        }
    }

    /**
     * Generate with system context
     */
    async generateWithContext(systemPrompt, userMessage) {
        if (!this.accountId || !this.apiToken) {
            throw new Error('Cloudflare credentials not configured');
        }

        try {
            const response = await fetch(
                `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run/${this.model}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userMessage },
                        ],
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Cloudflare API error: ${error}`);
            }

            const data = await response.json();
            return data.result.response;
        } catch (error) {
            console.error('Cloudflare Context Error:', error.message);
            throw error;
        }
    }
}

export default new CloudflareService();
