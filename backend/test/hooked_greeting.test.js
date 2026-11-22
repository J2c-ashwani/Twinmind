import test from 'node:test';
import assert from 'node:assert/strict';
import { isPureGreeting, generateHookedGreeting } from '../src/services/chatEngine.js';

test('Hooked Greeting: isPureGreeting pattern detection', async (t) => {
    // Valid greetings
    const validGreetings = [
        'hi', 'Hi', 'HI', 'hi!', 'hi...', 'hello', 'Hello', 'hey', 'Hey!',
        'good morning', 'Good afternoon', 'Good evening', 'sup', 'yo',
        'hey twin', 'hi there', 'hello buddy', 'what\'s up', 'wassup'
    ];
    for (const g of validGreetings) {
        assert.equal(isPureGreeting(g), true, `Expected "${g}" to be detected as a pure greeting`);
    }

    // Invalid greetings (have real content or questions)
    const nonGreetings = [
        'hi can you help me with my resume',
        'hello I am feeling really stressed',
        'hey what do you think about my job',
        'top 50 subordinate conjunctions please',
        'how does twin mode work',
        'why am I always procrastinating'
    ];
    for (const ng of nonGreetings) {
        assert.equal(isPureGreeting(ng), false, `Expected "${ng}" NOT to be detected as a pure greeting`);
    }
});

test('Hooked Greeting: Personalized response generation for returning users (>48h)', async (t) => {
    const greeting = generateHookedGreeting({
        userName: 'Sravan Kumar',
        hoursSinceLastMessage: 72, // 3 days
        mode: 'normal'
    });

    assert.match(greeting, /Hey Sravan/, 'Should address Sravan by his first name');
    assert.match(greeting, /headspace|going on/, 'Should include an open, curious hook without hostility');
    assert.doesNotMatch(greeting, /overthinking/, 'Must NOT accuse user of overthinking unprompted');
});

test('Hooked Greeting: Personalized response generation for active users (<48h)', async (t) => {
    const greeting = generateHookedGreeting({
        userName: 'Sravan',
        hoursSinceLastMessage: 2, // 2 hours
        mode: 'normal'
    });

    assert.match(greeting, /Hey Sravan/, 'Should address user by name');
    assert.match(greeting, /unpacking|mind/, 'Should invite reflection');
});

test('Hooked Greeting: First-time user greeting', async (t) => {
    const greeting = generateHookedGreeting({
        userName: 'Alex',
        hoursSinceLastMessage: null,
        mode: 'normal'
    });

    assert.match(greeting, /Hey Alex/, 'Should address user by name');
    assert.match(greeting, /Twin is ready|energy today/, 'Should welcome new user warmly');
});

test('Hooked Greeting: Multi-mode adaptability', async (t) => {
    const modes = ['therapist', 'dark', 'future', 'normal'];
    for (const mode of modes) {
        const greeting = generateHookedGreeting({
            userName: 'Maya',
            hoursSinceLastMessage: 100,
            mode
        });
        assert.ok(greeting && greeting.length > 10, `Greeting for mode ${mode} should be populated`);
        assert.doesNotMatch(greeting, /overthinking/, `Mode ${mode} must not accuse user of overthinking`);
    }
});

test('Hooked Greeting: Sub-millisecond execution benchmark', async (t) => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
        isPureGreeting('hello there!');
        generateHookedGreeting({
            userName: 'Sravan',
            hoursSinceLastMessage: 50,
            mode: 'normal'
        });
    }
    const elapsedMs = performance.now() - start;
    const avgMs = elapsedMs / 1000;
    assert.ok(avgMs < 0.1, `Average execution time (${avgMs.toFixed(4)}ms) must be under 0.1ms`);
});
