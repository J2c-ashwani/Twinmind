import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import logger from '../config/logger.js';
import geminiService from './geminiService.js';
import cloudflareService from './cloudflareService.js';
import groqService from './groqService.js';

const unlink = promisify(fs.unlink);

/**
 * Whisper Service - Uses Gemini AI as primary transcription (free tier)
 */

/**
 * Transcribe audio file to text using Gemini
 * @param {string} audioFilePath - Path to audio file
 * @returns {Promise<string>} - Transcribed text
 */
export async function transcribeAudio(audioFilePath) {
    let audioBuffer;
    try {
        audioBuffer = fs.readFileSync(audioFilePath);
    } catch (err) {
        throw new Error(`Failed to read audio file: ${err.message}`);
    }

    // 1. Try Gemini (Primary)
    try {
        logger.info(`Starting Gemini audio transcription for: ${audioFilePath}`);
        const base64Audio = audioBuffer.toString('base64');

        const ext = path.extname(audioFilePath).toLowerCase();
        const mimeTypes = {
            '.mp3': 'audio/mp3',
            '.wav': 'audio/wav',
            '.m4a': 'audio/mp4',
            '.aac': 'audio/aac',
            '.ogg': 'audio/ogg',
            '.webm': 'audio/webm'
        };
        const mimeType = mimeTypes[ext] || 'audio/webm';

        const model = geminiService.flashModel;
        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Audio
                }
            },
            { text: "Transcribe this audio accurately. Return ONLY the transcribed text, nothing else." }
        ]);

        const transcription = result.response.text().trim();
        logger.info(`Gemini transcription complete: ${transcription.substring(0, 50)}...`);
        return transcription;

    } catch (geminiError) {
        logger.error(`Gemini transcription failed (${geminiError.message}). Attempting fallback...`);

        // 2. Try Groq (Fast & High Limit)
        if (groqService.isEnabled) {
            try {
                logger.info('🔄 Switching to Groq Whisper...');
                const groqText = await groqService.transcribeAudio(audioFilePath);
                logger.info(`✅ Groq transcription complete: ${groqText.substring(0, 50)}...`);
                return groqText;
            } catch (groqError) {
                logger.warn('Groq transcription failed:', groqError.message);
            }
        }

        // 3. Try Cloudflare (Fallback)
        if (cloudflareService.isConfigured) {
            try {
                logger.info('🔄 Switching to Cloudflare Whisper...');
                const cfTranscript = await cloudflareService.transcribeAudio(audioBuffer);
                logger.info(`✅ Cloudflare transcription complete: ${cfTranscript.substring(0, 50)}...`);
                return cfTranscript;
            } catch (cfError) {
                logger.error('Cloudflare transcription failed:', cfError);
            }
        } else {
            logger.warn('Cloudflare not configured, skipping fallback.');
        }

        // 3. Fail
        throw new Error(`Transcription service unavailable. Gemini: ${geminiError.message}`);
    }
}

/**
 * Check if Whisper is installed and available
 * @returns {Promise<boolean>}
 */
export async function checkWhisperInstalled() {
    // Always return true since we're using Gemini
    return true;
}

export default {
    transcribeAudio,
    checkWhisperInstalled
};
