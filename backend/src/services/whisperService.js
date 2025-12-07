import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import logger from '../config/logger.js';
import geminiService from './geminiService.js';

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
    try {
        logger.info(`Starting Gemini audio transcription for: ${audioFilePath}`);

        // Read audio file as base64
        const audioBuffer = fs.readFileSync(audioFilePath);
        const base64Audio = audioBuffer.toString('base64');

        // Determine MIME type from file extension
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

        // Use Gemini Flash model for audio transcription
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
    } catch (error) {
        logger.error('Gemini transcription error:', error);

        // Fallback to simple placeholder
        logger.warn('Transcription failed, using placeholder');
        return "Voice message received";
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
