import { GoogleGenerativeAI } from '@google/generative-ai';

class GeminiService {
    constructor(apiKey) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY;
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            // Use Gemini 1.5 Flash by default (Faster, Cheaper/Free)
            this.flashModel = this.genAI.getGenerativeModel({
                model: 'gemini-1.5-pro',
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

            this.embeddingModel = this.genAI.getGenerativeModel({ model: "text-embedding-004" });
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
    /**
     * Generate chat response
     * Signatuure: generateChatResponse(messagesArray, userMessage, conversationHistory)
     * Note: messagesArray contains { role: 'system'|'user'|'assistant', content: string }
     */
    async generateChatResponse(messagesArray, userMessage, conversationHistory) {
        if (!this.genAI) {
            throw new Error('Gemini not configured');
        }

        try {
            // 1. Extract System Prompt
            const systemMsg = messagesArray.find(m => m.role === 'system');
            const systemPrompt = systemMsg ? systemMsg.content : null;

            // 2. Filter out System Prompt from history because Gemini handles it separately via systemInstruction
            //    And convert 'assistant' -> 'model'
            const history = messagesArray
                .filter(m => m.role !== 'system' && m.content !== userMessage) // Exclude current user message to avoid duplication if passed in array
                .map(m => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    parts: [{ text: m.content || ' ' }],
                }));

            // Note: The loop in aiService often constructs [system, ...history, user].
            // We need to be careful not to duplicate.
            // But usually the history passed to startChat should exclude the final new message.
            // Let's assume messagesArray includes the final message. 
            // Gemini startChat takes history (past) + sendMessage (current).
            // So we slice off the last element if it matches userMessage.

            let finalHistory = messagesArray.filter(m => m.role !== 'system');
            const lastMsg = finalHistory[finalHistory.length - 1];
            let currentPrompt = userMessage;

            if (lastMsg && lastMsg.role === 'user' && lastMsg.content === userMessage) {
                finalHistory.pop(); // Remove last message to send it via sendMessage
            } else if (!userMessage && lastMsg && lastMsg.role === 'user') {
                // If userMessage arg is empty but array has it
                currentPrompt = finalHistory.pop().content;
            }

            // Convert to Gemini format
            const geminiHistory = finalHistory.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.content || ' ' }],
            }));

            // Select model based on complexity heuristic
            const usePro = currentPrompt.length > 500 ||
                currentPrompt.toLowerCase().includes('analyze') ||
                currentPrompt.toLowerCase().includes('why') ||
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
                history: geminiHistory,
            });

            // Add timeout to prevent hanging
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Gemini API timeout')), 15000)
            );

            const result = await Promise.race([
                chat.sendMessage(currentPrompt),
                timeoutPromise
            ]);

            const response = await result.response;
            return response.text();
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
            // Pad to 1536 dimensions if needed (openai-compatibility hack)
            if (embedding.length === 768) {
                return [...embedding, ...embedding]; // Duplicate to reach 1536
            }
            return embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            // Fallback to empty array or throw
            return Array(1536).fill(0);
        }
    }
}

export default new GeminiService();
