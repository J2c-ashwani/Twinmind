import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import aiService from '../src/services/aiService.js';
import { getSuggestedFollowups } from '../src/services/chatEngine.js';

describe('Real-Time Streaming Engine', () => {
    it('aiService.generateStreamingResponse should be an async generator function', () => {
        const gen = aiService.generateStreamingResponse({ userMessage: 'Hello', systemPrompt: 'Test' });
        assert.equal(typeof gen[Symbol.asyncIterator], 'function', 'Should implement AsyncIterator interface');
    });

    it('aiService.generateStreamingResponse should gracefully yield a fallback message when no live provider API is connected', async () => {
        const stream = aiService.generateStreamingResponse({
            userMessage: 'Test streaming message',
            systemPrompt: 'You are a helpful assistant',
            taskType: 'fast_chat'
        });

        const chunks = [];
        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        assert.ok(chunks.length > 0, 'Should yield at least one chunk');
        const fullOutput = chunks.join('');
        assert.ok(fullOutput.length > 0, 'Output should have non-zero length');
    });

    it('getSuggestedFollowups should return context-appropriate options for each mode', () => {
        const normalFollowups = getSuggestedFollowups('normal');
        assert.ok(Array.isArray(normalFollowups), 'Normal followups should be an array');
        assert.ok(normalFollowups.length >= 3, 'Should have at least 3 suggestions');

        const darkFollowups = getSuggestedFollowups('dark');
        assert.ok(darkFollowups.some(f => f.toLowerCase().includes('excuse') || f.toLowerCase().includes('avoiding')), 'Dark mode should have accountability questions');

        const therapistFollowups = getSuggestedFollowups('therapist');
        assert.ok(therapistFollowups.some(f => f.toLowerCase().includes('feeling') || f.toLowerCase().includes('grounded')), 'Therapist mode should have reflective questions');
    });
});
