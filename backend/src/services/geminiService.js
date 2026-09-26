import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../config/logger.js';

class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        this.modelName = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').replace(/^models\//, '');
        this.fallbackModelName = (process.env.GEMINI_FALLBACK_MODEL || 'gemini-1.5-flash').replace(/^models\//, '');

        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.flashModel = this.genAI.getGenerativeModel({
                model: this.modelName,
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 2048,
                },
            });
            this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
            console.log(`✅ Gemini Service initialized (Configured model: ${this.modelName})`);
        } else {
            console.log('⚠️  Gemini API key not found');
        }
    }

    get isConfigured() {
        return !!this.apiKey;
    }

    /**
     * Helper to format conversation history for Gemini
     */
    _formatHistory(conversationHistory) {
        return conversationHistory.map(msg => ({
            role: msg.sender_type === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content || ' ' }],
        }));
    }

    /**
     * Unified generateChatResponse accepting object contract or legacy positional arguments
     */
    async generateChatResponse(input, legacyUserMessage, legacyHistory) {
        if (!this.genAI) {
            throw new Error('Gemini not configured');
        }

        let messagesArray = [];
        let userMessage = '';
        let systemPrompt = null;
        let responseFormat = 'text';

        if (input && typeof input === 'object' && !Array.isArray(input)) {
            messagesArray = input.messages || [];
            userMessage = input.userMessage || '';
            systemPrompt = input.systemPrompt || null;
            responseFormat = input.responseFormat || 'text';
        } else {
            messagesArray = input || [];
            userMessage = legacyUserMessage || '';
        }

        try {
            // Extract System Prompt if not explicitly provided
            if (!systemPrompt) {
                const systemMsg = messagesArray.find(m => m.role === 'system');
                systemPrompt = systemMsg ? systemMsg.content : null;
            }

            let finalHistory = messagesArray.filter(m => m.role !== 'system');
            const lastMsg = finalHistory[finalHistory.length - 1];
            let currentPrompt = userMessage;

            if (lastMsg && lastMsg.role === 'user' && lastMsg.content === userMessage) {
                finalHistory.pop();
            } else if (!userMessage && lastMsg && lastMsg.role === 'user') {
                currentPrompt = finalHistory.pop().content;
            }

            const geminiHistory = finalHistory.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content || ' ' }],
            }));

            // Generation config with structured output support if JSON requested
            const generationConfig = {
                temperature: 0.7,
                maxOutputTokens: 2048,
                ...(responseFormat === 'json' ? { responseMimeType: 'application/json' } : {})
            };

            const sendWithModel = async (modelId) => {
                const model = this.genAI.getGenerativeModel({
                    model: modelId,
                    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }], role: 'model' } : undefined,
                    generationConfig,
                });

                const chat = model.startChat({ history: geminiHistory });
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini API timeout')), 15000)
                );

                const result = await Promise.race([
                    chat.sendMessage(currentPrompt),
                    timeoutPromise
                ]);

                const response = await result.response;
                return response.text();
            };

            try {
                return await sendWithModel(this.modelName);
            } catch (primaryErr) {
                // If primary model failed with 404/not found or deprecation, fallback to secondary model
                if (this.fallbackModelName && this.fallbackModelName !== this.modelName) {
                    console.warn(`Gemini model ${this.modelName} failed, retrying with fallback model ${this.fallbackModelName}...`);
                    return await sendWithModel(this.fallbackModelName);
                }
                throw primaryErr;
            }
        } catch (error) {
            console.error('Gemini API error:', error);
            throw new Error('Failed to generate AI response: ' + error.message);
        }
    }

    /**
     * Generate response with system instructions
     */
    async generateWithContext(systemPrompt, userMessage) {
        try {
            const fullPrompt = `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`;
            const result = await this.flashModel.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini API error:', error);
            throw new Error('Failed to generate AI response');
        }
    }

    /**
     * Analyze emotional state from text
     */
    async analyzeEmotion(text) {
        try {
            const prompt = `Analyze the emotional state of this message and return a JSON object with these scores (0-100):
{
  "trust": <score>,
  "dependency": <score>,
  "vulnerability": <score>,
  "openness": <score>,
  "engagement": <score>,
  "valence": <score from -100 to 100>,
  "detected_emotions": ["emotion1", "emotion2"]
}

Message: "${text}"

Return only the JSON object, no other text.`;

            const result = await this.flashModel.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();

            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Invalid response format');
        } catch (error) {
            console.error('Emotion analysis error:', error);
            // Return default values on error
            return {
                trust: 50,
                dependency: 50,
                vulnerability: 50,
                openness: 50,
                engagement: 50,
                valence: 0,
                detected_emotions: [],
            };
        }
    }

    /**
     * Extract entities (people, goals, situations) from text
     */
    async extractEntities(text) {
        try {
            const prompt = `Extract important entities from this message and return a JSON object:
{
  "people": ["person1", "person2"],
  "goals": ["goal1", "goal2"],
  "situations": ["situation1"]
}

Message: "${text}"

Return only the JSON object, no other text.`;

            const result = await this.flashModel.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return { people: [], goals: [], situations: [] };
        } catch (error) {
            console.error('Entity extraction error:', error);
            return { people: [], goals: [], situations: [] };
        }
    }

    /**
     * Detect if message is a memorable moment
     */
    async detectMemorableMoment(text) {
        try {
            const prompt = `Analyze if this message represents a memorable moment (milestone, achievement, emotional moment, breakthrough, etc.).
Return JSON:
{
  "is_memorable": true/false,
  "type": "milestone|achievement|emotion|breakthrough|funny_moment|conversation",
  "title": "short title",
  "significance": <1-10>
}

Message: "${text}"

Return only the JSON object.`;

            const result = await this.flashModel.generateContent(prompt);
            const response = await result.response;
            const responseText = response.text();

            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            return { is_memorable: false };
        } catch (error) {
            console.error('Memory detection error:', error);
            return { is_memorable: false };
        }
    }

    /**
     * Generate embeddings for semantic search
     */
    async generateEmbedding(text) {
        try {
            const result = await this.embeddingModel.embedContent(text);
            const embedding = result.embedding.values;
            // Gemini text-embedding-004 returns 768 dims; pad to 1536 for pgvector compat
            if (embedding.length === 768) {
                return [...embedding, ...embedding];
            }
            return embedding;
        } catch (error) {
            // Log concisely — this is fire-and-forget memory storage, not user-blocking
            logger.warn(`Embedding failed (${error.status ?? error.code ?? 'unknown'}): ${error.message?.slice(0, 80)}`);
            return Array(1536).fill(0); // zero vector — memory row still saved, just not searchable
        }
    }
}

export default new GeminiService();
