import ttsClient from '@google-cloud/text-to-speech';
import fs from 'fs';
import { promisify } from 'util';
import logger from '../config/logger.js';

const writeFile = promisify(fs.writeFile);

/**
 * Text-to-Speech Service using Google Cloud TTS
 */

let cachedClient = null;

function parseServiceAccountFromEnv() {
    const rawJson = process.env.GOOGLE_TTS_SERVICE_ACCOUNT_JSON;
    if (rawJson) {
        return JSON.parse(rawJson);
    }

    const rawBase64 = process.env.GOOGLE_TTS_SERVICE_ACCOUNT_BASE64;
    if (rawBase64) {
        return JSON.parse(Buffer.from(rawBase64, 'base64').toString('utf8'));
    }

    return null;
}

function getTtsClient() {
    if (cachedClient) return cachedClient;

    const credentials = parseServiceAccountFromEnv();
    if (credentials) {
        cachedClient = new ttsClient.TextToSpeechClient({ credentials });
        return cachedClient;
    }

    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyFilename && fs.existsSync(keyFilename)) {
        cachedClient = new ttsClient.TextToSpeechClient({ keyFilename });
        return cachedClient;
    }

    throw new Error(
        'Google Cloud TTS credentials are not configured. Set GOOGLE_TTS_SERVICE_ACCOUNT_JSON, GOOGLE_TTS_SERVICE_ACCOUNT_BASE64, or GOOGLE_APPLICATION_CREDENTIALS.'
    );
}

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

        logger.info(`Converting text to speech (${text.length} chars)`);

        const client = getTtsClient();
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
        const client = getTtsClient();
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
