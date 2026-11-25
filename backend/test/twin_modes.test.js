import test from 'node:test';
import assert from 'node:assert/strict';

import {
    mapTwinModeToStyleMode,
    getUserStyleMode,
    adjustModifiersForStyle,
    STYLE_MODES
} from '../src/services/emotionalStyleAdapter.js';
import {
    detectEmotionalIntensity,
    detectEmotionalEvents,
    getEmotionalBehaviorModifiers
} from '../src/services/emotionalStateEngine.js';
import {
    generatePersonalityDirectives,
    getDefaultPersonalityProfile
} from '../src/services/personalityStyleLayer.js';
import { buildModePrompt } from '../src/services/modeManager.js';
import { formatHistoryWithModeContext, MODE_TO_TASK_TYPE } from '../src/services/chatEngine.js';

test('emotionalStyleAdapter maps every twin mode without falling back to normal_twin', async () => {
    assert.equal(mapTwinModeToStyleMode('normal'), 'normal_twin');
    assert.equal(mapTwinModeToStyleMode('future'), 'future_twin');
    assert.equal(mapTwinModeToStyleMode('dark'), 'dark_twin');
    assert.equal(mapTwinModeToStyleMode('therapist'), 'therapist_twin');

    assert.equal(await getUserStyleMode('user-1', 'dark'), 'dark_twin');
    assert.equal(await getUserStyleMode('user-1', 'future'), 'future_twin');
    assert.equal(await getUserStyleMode('user-1', 'therapist'), 'therapist_twin');
    assert.equal(STYLE_MODES.future_twin.response_length, 'short');
});

test('detectEmotionalIntensity matches whole words and avoids substring false positives', () => {
    const falseTrigger = detectEmotionalIntensity('Hi, what i do when someone cheat me ?');
    assert.equal(falseTrigger.level, 'normal');
    assert.equal(falseTrigger.marker, null);

    const recoveryTrigger = detectEmotionalIntensity('Working on my recovery every day');
    assert.equal(recoveryTrigger.level, 'normal');

    const genuineStrong = detectEmotionalIntensity('I feel so overwhelmed right now');
    assert.equal(genuineStrong.level, 'very_strong');
    assert.equal(genuineStrong.marker, 'so');
});

test('dark and future modes do not inject Normal Twin empathy or softer distress overrides', async () => {
    const metrics = { emotional_state: 'new_user', trust_level: 0, dependency_score: 0, emotional_valence: 50 };
    const events = detectEmotionalEvents('I feel hurt and hopeless');
    const intensity = detectEmotionalIntensity('I feel so hurt');

    const darkEmotion = adjustModifiersForStyle(
        getEmotionalBehaviorModifiers(metrics, events, intensity, { full_name: 'Ashwani', preferences: {} }, 'dark')
            + generatePersonalityDirectives(getDefaultPersonalityProfile(), 'sad', 'high', 0, 'dark'),
        await getUserStyleMode('u1', 'dark')
    );

    assert.match(darkEmotion, /EMOTIONAL STYLE MODE: DARK TWIN/);
    assert.doesNotMatch(darkEmotion, /EMOTIONAL STYLE MODE: NORMAL TWIN/);
    assert.doesNotMatch(darkEmotion, /TONE: SOFTER/);
    assert.doesNotMatch(darkEmotion, /REASSURANCE: REQUIRED/);

    const futureEmotion = adjustModifiersForStyle(
        getEmotionalBehaviorModifiers(metrics, events, intensity, { full_name: 'Ashwani', preferences: {} }, 'future')
            + generatePersonalityDirectives(getDefaultPersonalityProfile(), 'sad', 'high', 0, 'future'),
        await getUserStyleMode('u1', 'future')
    );

    assert.match(futureEmotion, /EMOTIONAL STYLE MODE: FUTURE TWIN/);
    assert.doesNotMatch(futureEmotion, /REASSURANCE: REQUIRED/);
    assert.doesNotMatch(futureEmotion, /FUTURE PROJECTION: LOW/);
});

test('formatHistoryWithModeContext keeps cross-mode continuity while labeling mode switches', () => {
    const dbRowsNewestFirst = [
        { sender: 'ai', mode: 'normal', message: 'Cheating can be a gut punch.' },
        { sender: 'user', mode: 'normal', message: 'Hi, what i do when someone cheat me ?' }
    ];

    const darkHistory = formatHistoryWithModeContext(dbRowsNewestFirst, 'dark');
    assert.equal(darkHistory.length, 2);
    assert.equal(darkHistory[0].content, 'Hi, what i do when someone cheat me ?');
    assert.equal(darkHistory[1].content, '[Earlier reply in normal mode]: Cheating can be a gut punch.');

    const normalHistory = formatHistoryWithModeContext(dbRowsNewestFirst, 'normal');
    assert.equal(normalHistory[1].content, 'Cheating can be a gut punch.');
});

test('modeManager prompts have clean switching instructions and MODE_TO_TASK_TYPE maps all 4 modes', () => {
    const promptDark = buildModePrompt({}, 'dark', 'Ashwani', []);
    assert.doesNotMatch(promptDark, /last message: ""/);
    assert.match(promptDark, /\[Earlier reply in \.\.\. mode\]/);

    const promptTherapist = buildModePrompt({}, 'therapist', 'Ashwani', []);
    assert.doesNotMatch(promptTherapist, /It sounds like you're feeling/);

    assert.equal(MODE_TO_TASK_TYPE.normal, 'personality_core');
    assert.equal(MODE_TO_TASK_TYPE.dark, 'creative_writing');
    assert.equal(MODE_TO_TASK_TYPE.future, 'deep_reasoning');
    assert.equal(MODE_TO_TASK_TYPE.therapist, 'emotional_support');
});
