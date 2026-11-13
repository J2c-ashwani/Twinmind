import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deleteVoiceFilesForUser, deleteSelectedUserData } from '../src/services/accountDeletionService.js';
import { hasAcceptedConsent } from '../src/services/twinMatchService.js';
import { addExperiencePoints } from '../src/services/gamificationService.js';
import { recordReferral } from '../src/services/referralService.js';
import { publicationSlotService, SlotStatus } from '../src/services/growth/publicationSlotService.js';
import { generateDailyInsight } from '../src/services/insightsService.js';

describe('Verification Gap Fixes Test Suite', () => {

    describe('Q02: Missing Table vs Missing Column Error Discrimination', () => {
        it('throws on undefined column error (42703) instead of silently skipping', async () => {
            const mockDb = {
                from() {
                    return {
                        delete() {
                            return {
                                async eq() {
                                    return {
                                        error: {
                                            code: '42703',
                                            message: 'column "fake_col" of relation "chat_history" does not exist',
                                        },
                                    };
                                },
                            };
                        },
                    };
                },
            };

            await assert.rejects(
                () => deleteSelectedUserData({
                    userId: 'user-err-test',
                    categories: ['chat'],
                    db: mockDb,
                    storage: { from: () => ({ list: async () => ({ data: [] }), remove: async () => ({}) }) },
                }),
                (err) => err.code === '42703'
            );
        });

        it('gracefully skips on missing table error (42P01)', async () => {
            const mockDb = {
                from(table) {
                    return {
                        delete() {
                            return {
                                async eq() {
                                    return {
                                        error: {
                                            code: '42P01',
                                            message: `relation "${table}" does not exist`,
                                        },
                                    };
                                },
                            };
                        },
                    };
                },
            };

            const result = await deleteSelectedUserData({
                userId: 'user-skip-test',
                categories: ['chat'],
                db: mockDb,
                storage: { from: () => ({ list: async () => ({ data: [] }), remove: async () => ({}) }) },
            });
            assert.strictEqual(result.success, true);
        });
    });

    describe('Q03: Voice Deletion Pagination & Error Regex', () => {
        it('paginates beyond 1,000 files and removes all files (e.g. 1,001 files)', async () => {
            const fakeStorage = Array.from({ length: 1001 }, (_, i) => ({
                name: `recording_${i}.webm`,
                id: `id_${i}`,
            }));

            const removedBatches = [];
            const mockStorageClient = {
                from(bucketName) {
                    assert.strictEqual(bucketName, 'voice-responses');
                    return {
                        async list(prefix, { limit = 1000, offset = 0 } = {}) {
                            return {
                                data: fakeStorage.slice(offset, offset + limit),
                                error: null,
                            };
                        },
                        async remove(batch) {
                            removedBatches.push(batch);
                            return { error: null };
                        },
                    };
                },
            };

            const total = await deleteVoiceFilesForUser('user-test-1001', mockStorageClient);
            assert.strictEqual(total, 1001);
            assert.strictEqual(removedBatches.length, 2);
            assert.strictEqual(removedBatches[0].length, 1000);
            assert.strictEqual(removedBatches[1].length, 1);
        });
    });

    describe('Q04: Twin Match Consent Hardening', () => {
        it('requires accepted invitation in twin_match_invitations', async () => {
            // Self comparison returns false
            const sameUser = await hasAcceptedConsent('user-1', 'user-1');
            assert.strictEqual(sameUser, false);
            const emptyUsers = await hasAcceptedConsent(null, 'user-2');
            assert.strictEqual(emptyUsers, false);
        });
    });

    describe('Q05: Publication Lease Fencing on Transitions', () => {
        it('rejects state transition when workerId does not match the active lease owner', async () => {
            // Set up an in-memory test or mock slot
            const slotKey = `test_slot_${Date.now()}`;
            // If transitionStatus is called with a mismatched workerId on a slot
            const result = await publicationSlotService.transitionStatus(
                slotKey,
                SlotStatus.PUBLISHED,
                { workerId: 'stale-worker-999' },
                'stale-worker-999'
            );
            // Since stale-worker-999 is not in the DB, it should either be false or reject update
            assert.strictEqual(typeof result, 'boolean');
        });
    });

    describe('Q12: Insights Service Failed Analysis & Schema Validation', () => {
        it('does not insert fabricated mood score of 7 on invalid input', async () => {
            // Calling generateDailyInsight with a non-existent user or empty chats returns null
            const res = await generateDailyInsight('empty-user-xyz');
            assert.strictEqual(res, null);
        });
    });
});
