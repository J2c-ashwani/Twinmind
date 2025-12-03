import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY;
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            // Use Gemini 1.5 Flash by default (Faster, Cheaper/Free)
            this.flashModel = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-flash',
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            });
            // Use Gemini 1.5 Pro for complex reasoning
            this.proModel = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-pro',
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 2048,
                },
            });

            this.embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" });
            console.log('✅ Gemini Service initialized (Flash + Pro)');
        } else {
            console.log('⚠️  Gemini API key not found');
        }
    }

    /**
     * Helper to format conversation history for Gemini
     */
    _formatHistory(conversationHistory) {
        return conversationHistory.map(msg => ({
            role: msg.sender_type === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content || ' ' }], // Ensure text is never empty
        }));
    }

    /**
     * Generate chat response
     */
    async generateChatResponse(prompt, conversationHistory = [], systemPrompt = null) {
        if (!this.genAI) {
            throw new Error('Gemini not configured');
        }

        try {
            // Select model based on complexity heuristic
            const usePro = prompt.length > 500 ||
                prompt.toLowerCase().includes('analyze') ||
                prompt.toLowerCase().includes('why') ||
                (systemPrompt && systemPrompt.toLowerCase().includes('reasoning'));

            // Create model instance per request to support dynamic systemPrompt
            const model = this.genAI.getGenerativeModel({
                model: usePro ? 'gemini-1.5-pro' : 'gemini-1.5-flash',
                systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }], role: 'model' } : undefined,
                generationConfig: {
                    temperature: 0.9,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1000,
                },
            });

            const chat = model.startChat({
                history: this._formatHistory(conversationHistory),
            });

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Gemini API timeout')), 15000)
            );

            const result = await Promise.race([
                chat.sendMessage(prompt),
                timeoutPromise
            ]);

            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Gemini API error:', error);
            throw new Error('Failed to generate AI response');
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
            const embedding = result.embedding;
            return embedding.values;
        } catch (error) {
            console.error('Error generating embedding:', error);
            // Fallback to empty array or throw
            return Array(768).fill(0); // Gemini embeddings are 768 dimensions usually
        }
    }
}

export default new GeminiService();
