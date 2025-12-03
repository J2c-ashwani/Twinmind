import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

export const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const MODELS = {
    CHAT: process.env.OPENAI_MODEL || 'gpt-4o',
    EMBEDDING: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
};

export default openai;
