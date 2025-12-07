import ttsClient from '@google-cloud/text-to-speech';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../config/logger.js';

const writeFile = promisify(fs.writeFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Text-to-Speech Service using Google Cloud TTS
 */

// Initialize Google Cloud TTS client with credentials
const credentialsPath = path.join(__dirname, '../../google-tts-service-account.json');
const client = new ttsClient.TextToSpeechClient({
    keyFilename: credentialsPath
});

/**
 * Convert text to speech using Google Cloud TTS
 * @param {string} text - Text to convert
 * @param {string} outputPath - Path to save audio file
 * @param {object} options - Voice options
 * @returns {Promise<string>} - Path to generated audio file
 */
export async function textToSpeech(text, outputPath, options = {}) {
    try {
        // Ensure text is a string
        if (typeof text !== 'string') {
            if (text && typeof text === 'object') {
                text = text.text || text.message || text.content || JSON.stringify(text);
            } else {
                text = String(text || '');
            }
        }

        if (!text || text.trim().length === 0) {
            throw new Error('No text provided for TTS');
        }

        logger.info(`Converting text to speech: ${text.substring(0, 50)}...`);

        const request = {
            input: { text },
            voice: {
                languageCode: options.languageCode || 'en-US',
                name: options.voiceName || 'en-US-Neural2-F', // Female voice
                ssmlGender: options.gender || 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: options.speed || 1.0,
                pitch: options.pitch || 0.0
            }
        };

        const [response] = await client.synthesizeSpeech(request);

        // Write audio to file
        await writeFile(outputPath, response.audioContent, 'binary');

        logger.info(`Audio file created: ${outputPath}`);
        return outputPath;

    } catch (error) {
        logger.error('Text-to-speech error:', error);
        throw error;
    }
}

/**
 * Get available voices from Google Cloud TTS
 * @param {string} languageCode - Language code (e.g., 'en-US')
 * @returns {Promise<Array>} - List of available voices
 */
export async function getAvailableVoices(languageCode = 'en-US') {
    try {
        const [result] = await client.listVoices({ languageCode });
        return result.voices;
    } catch (error) {
        logger.error('Failed to fetch voices:', error);
        return [];
    }
}

export default {
    textToSpeech,
    getAvailableVoices
};
