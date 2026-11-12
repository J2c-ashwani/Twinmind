import { describe, it, afterEach, after } from 'node:test';
import assert from 'node:assert';

import { isEffectivePro } from '../src/middleware/subscriptionMiddleware.js';
import { evaluatePlayEntitlement } from '../src/services/googlePlayService.js';
import { filterRetrievedMemories } from '../src/services/memoryEngine.js';
import { calculateDeterministicPersonality } from '../src/services/deterministicPersonality.js';
import { normalizePersonalityProfile } from '../src/services/personalityStyleLayer.js';
import { evaluateProactiveTriggers } from '../src/services/proactiveMessageService.js';
import { crisisCheck, CRISIS_RESPONSE, applyOutputSafetyGuard } from '../src/services/conversationSafety.js';
import { DAILY_CHALLENGES } from '../src/routes/daily.routes.js';
import growthOrchestratorService from '../src/services/growth/growthOrchestratorService.js';
import leadDiscoveryService from '../src/services/leadDiscoveryService.js';
import smartRouterService from '../src/services/growth/smartRouterService.js';
import { deleteSelectedUserData, deleteUserAccount } from '../src/services/accountDeletionService.js';

describe('TwinGenie Full Audit Remediation Verification', () => {
    const originalPausedState = growthOrchestratorService.state?.isPaused;
    const originalGrowthAutorun = process.env.GROWTH_AUTORUN;
    const originalGrowthSystemPaused = process.env.GROWTH_SYSTEM_PAUSED;

    after(() => {
        setTimeout(() => process.exit(0), 50);
    });

    afterEach(() => {
        if (growthOrchestratorService.state) {
            growthOrchestratorService.state.isPaused = originalPausedState;
        }
        if (originalGrowthAutorun === undefined) delete process.env.GROWTH_AUTORUN;
        else process.env.GROWTH_AUTORUN = originalGrowthAutorun;

        if (originalGrowthSystemPaused === undefined) delete process.env.GROWTH_SYSTEM_PAUSED;
        else process.env.GROWTH_SYSTEM_PAUSED = originalGrowthSystemPaused;
    });

    describe('F06: Subscription Expiry & Google Play Entitlement', () => {
        const now = new Date('2026-11-12T12:00:00.000Z');
        const futureIso = '2026-12-01T00:00:00.000Z';
        const pastIso = '2026-11-01T00:00:00.000Z';

        it('treats active Pro with future expiry as Pro, and past expiry as Free', () => {
            assert.strictEqual(isEffectivePro({ plan_type: 'pro', status: 'active', current_period_end: futureIso }, now), true);
            assert.strictEqual(isEffectivePro({ plan_type: 'pro', status: 'active', current_period_end: pastIso }, now), false);
            assert.strictEqual(isEffectivePro({ plan_type: 'pro', status: 'expired', current_period_end: futureIso }, now), false);
            assert.strictEqual(isEffectivePro({ plan_type: 'free', status: 'active', current_period_end: futureIso }, now), false);
            assert.strictEqual(isEffectivePro(null, now), false);
        });

        it('preserves Pro entitlement for cancelled subscriptions until paid period ends', () => {
            assert.strictEqual(isEffectivePro({ plan_type: 'pro', status: 'cancelled', current_period_end: futureIso }, now), true);
            assert.strictEqual(isEffectivePro({ plan_type: 'pro', status: 'canceled', current_period_end: futureIso }, now), true);
            assert.strictEqual(isEffectivePro({ plan_type: 'pro', status: 'cancelled', current_period_end: pastIso }, now), false);
        });

        it('evaluates Play subscription states accurately', () => {
            assert.strictEqual(evaluatePlayEntitlement({ status: 'active', expiryTime: futureIso }, now), true);
            assert.strictEqual(evaluatePlayEntitlement({ status: 'cancelled', expiryTime: futureIso }, now), true);
            assert.strictEqual(evaluatePlayEntitlement({ status: 'cancelled', expiryTime: pastIso }, now), false);
            assert.strictEqual(evaluatePlayEntitlement({ status: 'expired', expiryTime: futureIso }, now), false);
            assert.strictEqual(evaluatePlayEntitlement({ status: 'pending', expiryTime: futureIso }, now), false);
        });
    });

    describe('F09 & F10: Cross-Session Memory Filtering & Vector Space Separation', () => {
        it('retains cross-session memories when scopeConversationId is omitted', () => {
            const memories = [
                { id: 'm1', content: 'Likes morning walks', metadata: { conversation_id: 'conv-a', embedding_provider: 'openai' } },
                { id: 'm2', content: 'Studying for exams', metadata: { conversation_id: 'conv-b', embedding_provider: 'openai' } },
                { id: 'm3', content: 'Legacy memory without provider', metadata: { conversation_id: 'conv-c' } },
            ];

            const result = filterRetrievedMemories(memories, { queryProvider: 'openai' });
            assert.strictEqual(result.length, 3);
        });

        it('filters incompatible embedding spaces while keeping same-provider matches', () => {
            const memories = [
                { id: 'm1', content: 'OpenAI vector', metadata: { embedding_provider: 'openai' } },
                { id: 'm2', content: 'Gemini vector', metadata: { embedding_provider: 'gemini' } },
            ];

            const result = filterRetrievedMemories(memories, { queryProvider: 'gemini' });
            assert.deepStrictEqual(result.map((m) => m.id), ['m2']);
        });

        it('supports explicit conversation scoping when requested', () => {
            const memories = [
                { id: 'm1', content: 'A', metadata: { conversation_id: 'conv-1', embedding_provider: 'openai' } },
                { id: 'm2', content: 'B', metadata: { conversation_id: 'conv-2', embedding_provider: 'openai' } },
            ];

            const result = filterRetrievedMemories(memories, { queryProvider: 'openai', scopeConversationId: 'conv-1' });
            assert.deepStrictEqual(result.map((m) => m.id), ['m1']);
        });
    });

    describe('F11: Deterministic Big Five Numeric Propagation into Style Layer', () => {
        it('emits numeric big_five scores and preserves non-default extremes during normalization', () => {
            const profile = calculateDeterministicPersonality(
                [
                    { question_id: 1, selected_option: 'Very curious and excited' },
                    { question_id: 6, selected_option: 'Very organized' },
                    { question_id: 7, selected_option: 'Rarely' },
                    { question_id: 12, selected_option: 'Yes, very much' },
                    { question_id: 13, selected_option: 'Yes, I love philosophy' },
                    { question_id: 14, selected_option: 'Frequently' },
                ],
                { name: 'Alex' }
            );

            assert.strictEqual(typeof profile.big_five.openness, 'number');
            assert.strictEqual(typeof profile.big_five.conscientiousness, 'number');
            assert.strictEqual(typeof profile.big_five.neuroticism, 'number');
            assert.ok(profile.big_five.openness > 75, `Expected openness > 75, got ${profile.big_five.openness}`);
            assert.ok(profile.big_five.conscientiousness > 70, `Expected conscientiousness > 70, got ${profile.big_five.conscientiousness}`);

            const normalized = normalizePersonalityProfile(profile);
            assert.ok(normalized.big_five.openness > 0.75, 'Normalized openness should stay high instead of falling back to 0.5');
            assert.ok(normalized.big_five.conscientiousness > 0.7, 'Normalized conscientiousness should stay high');
        });

        it('coerces legacy string-encoded Big Five scores and derives neuroticism from emotional_stability', () => {
            const normalized = normalizePersonalityProfile({
                big_five: {
                    openness: '84',
                    conscientiousness: '22',
                    extraversion: '78',
                    agreeableness: '64',
                    emotional_stability: '30',
                },
            });

            assert.strictEqual(normalized.big_five.openness, 0.84);
            assert.strictEqual(normalized.big_five.conscientiousness, 0.22);
            assert.strictEqual(normalized.big_five.extraversion, 0.78);
            assert.strictEqual(normalized.big_five.agreeableness, 0.64);
            assert.strictEqual(normalized.big_five.neuroticism, 0.7);
        });
    });

    describe('F14: Shared Safety Intercepts & Output Guard', () => {
        it('flags crisis phrasing deterministically and keeps non-crisis messages clear', () => {
            assert.strictEqual(crisisCheck('I want to end my life tonight'), true);
            assert.strictEqual(crisisCheck('Helping my friend prepare for an interview'), false);
            assert.ok(CRISIS_RESPONSE.includes('988'));
        });

        it('applies output safety guard consistently', () => {
            const safe = applyOutputSafetyGuard('Take five slow breaths and write down what matters today.', 'u-1');
            assert.ok(safe.includes('Take five slow breaths'));
        });
    });

    describe('F15: Proactive Trigger Evaluation Stability', () => {
        it('evaluates null patterns and full patterns without throwing ReferenceError', () => {
            const now = new Date('2026-11-12T09:15:00');
            const twoDaysAgo = new Date(now.getTime() - 49 * 60 * 60 * 1000).toISOString();

            const noPatternTriggers = evaluateProactiveTriggers({
                now,
                pattern: null,
                lastActivityAt: twoDaysAgo,
            });
            assert.strictEqual(noPatternTriggers.some((t) => t.type === 'missed_you'), true);

            const fullTriggers = evaluateProactiveTriggers({
                now,
                pattern: {
                    last_activity: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
                    typical_wakeup_time: '08:00',
                    typical_bedtime: '23:00',
                },
                contexts: [{
                    name: 'Launch App',
                    context_type: 'goal',
                    last_mentioned: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                }],
                streak: { current_streak: 7 },
            });

            const types = new Set(fullTriggers.map((t) => t.type));
            assert.ok(types.has('missed_you'));
            assert.ok(types.has('morning_checkin'));
            assert.ok(types.has('follow_up'));
            assert.ok(types.has('milestone'));
        });
    });

    describe('F19: Daily Challenge Allowlist', () => {
        it('restricts completable challenge IDs to known definitions', () => {
            assert.deepStrictEqual(Object.keys(DAILY_CHALLENGES).sort(), ['1', '2', '3']);
            assert.strictEqual(DAILY_CHALLENGES['999'], undefined);
        });
    });

    describe('F20 & F25: Growth Pause Controls & Truthful Outreach Positioning', () => {
        it('blocks all daily social publishers and broadcast when paused', async () => {
            process.env.GROWTH_SYSTEM_PAUSED = 'true';
            assert.strictEqual(growthOrchestratorService.isSystemPaused(), true);

            const results = await Promise.all([
                growthOrchestratorService.publishDailyFacebookReel(false),
                growthOrchestratorService.publishDailyLinkedInPersonal(false),
                growthOrchestratorService.publishDailyInstagram(false),
                growthOrchestratorService.publishDailyThreads(false),
                growthOrchestratorService.publishDailyYouTube(false),
                growthOrchestratorService.publishDailyBroadcast(false),
            ]);

            for (const r of results) {
                assert.strictEqual(r.action, 'skipped');
                assert.strictEqual(r.reason, 'system_paused');
            }
        });

        it('keeps outreach pitches free of unverified claims across all campaign types', () => {
            const forbidden = ['Clinical Therapist', '78.8%', 'iOS codebase ready', 'Outperforming ChatGPT'];
            const samples = [
                leadDiscoveryService.generatePitch('pr', { recipientName: 'Alex Reporter', organization: 'TechPress', angle: 'cognitive_architecture' }),
                leadDiscoveryService.generatePitch('investor', { recipientName: 'Sam VC', organization: 'SeedFund', angle: 'retention_moat' }),
                leadDiscoveryService.generatePitch('acquisition', { recipientName: 'Taylor CorpDev', organization: 'BuyerCo', angle: 'strategic_platform' }),
            ];

            for (const pitch of samples) {
                assert.ok(pitch.subject.length > 10);
                assert.ok(pitch.bodyText.length > 50);
                for (const phrase of forbidden) {
                    assert.strictEqual(
                        pitch.bodyText.includes(phrase) || pitch.subject.includes(phrase),
                        false,
                        `Pitch must not contain unverified claim "${phrase}"`
                    );
                }
            }
        });

        it('detects device and platform attribution reliably in SmartRouter', () => {
            assert.strictEqual(smartRouterService.detectDevice('Mozilla/5.0 (Linux; Android 14)'), 'android');
            assert.strictEqual(smartRouterService.detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)'), 'ios');
            assert.strictEqual(smartRouterService.detectDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)'), 'desktop');
            assert.strictEqual(
                smartRouterService.detectPlatform({ query: { utm_source: 'youtube' }, headers: {} }),
                'youtube'
            );
            assert.strictEqual(smartRouterService.isSocialCrawler('LinkedInBot/1.0'), true);
        });
    });

    describe('Google Play Compliance: Account & Selected Data Deletion', () => {
        function createMockDeletionDeps() {
            const deletedTables = [];
            const removedFiles = [];
            const deletedAuthUsers = [];

            const db = {
                from(table) {
                    return {
                        delete() {
                            return {
                                async eq(col, val) {
                                    deletedTables.push({ table, col, val });
                                    return { error: null };
                                },
                            };
                        },
                    };
                },
            };

            const storage = {
                from(bucket) {
                    return {
                        async list(prefix) {
                            if (prefix === 'user-123') {
                                return {
                                    data: [
                                        { name: 'clip1.mp3', id: 'obj-1' },
                                        { name: 'nested', id: null },
                                    ],
                                    error: null,
                                };
                            }
                            if (prefix === 'user-123/nested') {
                                return { data: [{ name: 'clip2.mp3', id: 'obj-2' }], error: null };
                            }
                            return { data: [], error: null };
                        },
                        async remove(paths) {
                            removedFiles.push({ bucket, paths });
                            return { error: null };
                        },
                    };
                },
            };

            const authAdmin = {
                async deleteUser(userId) {
                    deletedAuthUsers.push(userId);
                    return { error: null };
                },
            };

            return { db, storage, authAdmin, deletedTables, removedFiles, deletedAuthUsers };
        }

        it('rejects empty or unknown deletion categories with INVALID_DATA_CATEGORIES', async () => {
            const deps = createMockDeletionDeps();
            await assert.rejects(
                () => deleteSelectedUserData({ userId: 'user-123', categories: ['unknown'], ...deps }),
                (err) => err.code === 'INVALID_DATA_CATEGORIES'
            );
        });

        it('deletes only selected categories and purges nested voice recordings', async () => {
            const deps = createMockDeletionDeps();
            const res = await deleteSelectedUserData({
                userId: 'user-123',
                categories: ['memories', 'voice'],
                ...deps,
            });

            assert.strictEqual(res.success, true);
            assert.deepStrictEqual(res.deletedCategories, ['memories', 'voice']);
            assert.strictEqual(res.deletedVoiceFiles, 2);
            assert.deepStrictEqual(deps.removedFiles, [
                { bucket: 'voice-responses', paths: ['user-123/clip1.mp3', 'user-123/nested/clip2.mp3'] },
            ]);
            assert.strictEqual(deps.deletedTables.some((d) => d.table === 'memory_vectors'), true);
            assert.strictEqual(deps.deletedTables.some((d) => d.table === 'users'), false);
            assert.strictEqual(deps.deletedAuthUsers.length, 0);
        });

        it('deletes all user data, voice storage, users row, and Supabase Auth user on account deletion', async () => {
            const deps = createMockDeletionDeps();
            const res = await deleteUserAccount({ userId: 'user-123', ...deps });

            assert.strictEqual(res.success, true);
            assert.strictEqual(res.deletedUserId, 'user-123');
            assert.strictEqual(deps.deletedTables.some((d) => d.table === 'users' && d.col === 'id'), true);
            assert.deepStrictEqual(deps.deletedAuthUsers, ['user-123']);
        });
    });
});
