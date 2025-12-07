/**
 * Input Validation Middleware
 * Validates and sanitizes all incoming request data
 */

import logger from '../config/logger.js';

/**
 * Sanitize string - remove dangerous characters
 */
export function sanitizeString(str) {
    if (typeof str !== 'string') return str;

    return str
        // Remove null bytes
        .replace(/\0/g, '')
        // Remove script tags
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Limit length
        .substring(0, 10000);
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return sanitizeString(obj);
    if (Array.isArray(obj)) return obj.map(sanitizeObject);
    if (typeof obj === 'object') {
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[sanitizeString(key)] = sanitizeObject(value);
        }
        return sanitized;
    }
    return obj;
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Request body sanitization middleware
 */
export const sanitizeRequestBody = (req, res, next) => {
    try {
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeObject(req.body);
        }
        next();
    } catch (error) {
        logger.error('Sanitization error:', error);
        res.status(400).json({ error: 'Invalid request data' });
    }
};

/**
 * Validate chat message input
 */
export const validateChatMessage = (req, res, next) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    if (typeof message !== 'string') {
        return res.status(400).json({ error: 'Message must be a string' });
    }

    if (message.length > 10000) {
        return res.status(400).json({ error: 'Message too long (max 10000 characters)' });
    }

    if (message.trim().length === 0) {
        return res.status(400).json({ error: 'Message cannot be empty' });
    }

    next();
};

/**
 * Validate auth input (login/register)
 */
export const validateAuthInput = (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (password.length > 100) {
        return res.status(400).json({ error: 'Password too long' });
    }

    next();
};

/**
 * Validate personality answers
 */
export const validatePersonalityAnswers = (req, res, next) => {
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Answers array is required' });
    }

    if (answers.length === 0) {
        return res.status(400).json({ error: 'At least one answer is required' });
    }

    for (const answer of answers) {
        if (!answer.questionId || !answer.answer) {
            return res.status(400).json({ error: 'Each answer must have questionId and answer' });
        }
    }

    next();
};

/**
 * Validate mood input
 */
export const validateMoodInput = (req, res, next) => {
    const { mood } = req.body;

    if (!mood) {
        return res.status(400).json({ error: 'Mood is required' });
    }

    const validMoods = ['great', 'good', 'okay', 'bad', 'terrible', 'happy', 'sad', 'anxious', 'calm', 'angry', 'excited'];

    if (!validMoods.includes(mood.toLowerCase())) {
        // Allow custom moods but log them
        logger.info(`Custom mood received: ${mood}`);
    }

    next();
};

/**
 * Validate subscription input
 */
export const validateSubscriptionInput = (req, res, next) => {
    const { plan } = req.body;

    if (!plan) {
        return res.status(400).json({ error: 'Plan is required' });
    }

    const validPlans = ['free', 'pro', 'premium', 'lifetime'];

    if (!validPlans.includes(plan.toLowerCase())) {
        return res.status(400).json({ error: 'Invalid plan' });
    }

    next();
};

/**
 * Validate pagination params
 */
export const validatePagination = (req, res, next) => {
    const { page, limit } = req.query;

    if (page && (isNaN(page) || parseInt(page) < 1)) {
        return res.status(400).json({ error: 'Invalid page number' });
    }

    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        return res.status(400).json({ error: 'Invalid limit (1-100)' });
    }

    // Set defaults
    req.pagination = {
        page: parseInt(page) || 1,
        limit: Math.min(parseInt(limit) || 20, 100)
    };

    next();
};

/**
 * Validate voice input (file upload)
 */
export const validateVoiceInput = (req, res, next) => {
    if (!req.file && !req.body.audio) {
        return res.status(400).json({ error: 'Audio file is required' });
    }

    // Check file size (10MB max)
    if (req.file && req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ error: 'Audio file too large (max 10MB)' });
    }

    next();
};

export default {
    sanitizeRequestBody,
    sanitizeString,
    sanitizeObject,
    isValidEmail,
    isValidUUID,
    validateChatMessage,
    validateAuthInput,
    validatePersonalityAnswers,
    validateMoodInput,
    validateSubscriptionInput,
    validatePagination,
    validateVoiceInput
};
