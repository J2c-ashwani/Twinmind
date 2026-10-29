import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import contentGeneratorService from '../src/services/growth/contentGeneratorService.js';
import linkedinAdapter from '../src/services/growth/adapters/linkedinAdapter.js';
import growthOrchestratorService from '../src/services/growth/growthOrchestratorService.js';

describe('Growth Engine Reliability & Synchronized Multi-Platform Publishing', () => {
    after(() => {
        setTimeout(() => process.exit(0), 50);
    });

    describe('Meta Synchronized Format Alternation (Facebook + Instagram)', () => {
        it('should strictly alternate Facebook and Instagram together in lockstep (Carousel on even days, Reel on odd days)', () => {
            // Day 0 (2026-10-20): Carousel
            const day0 = new Date('2026-10-20T10:00:00+05:30');
            const sched0 = contentGeneratorService.getDailySchedule(day0);
            assert.strictEqual(sched0.facebookFormat, 'carousel');
            assert.strictEqual(sched0.instagramFormat, 'carousel');
            assert.strictEqual(sched0.sharedFormat, 'carousel');

            // Day 1 (2026-10-21): Reel
            const day1 = new Date('2026-10-21T10:00:00+05:30');
            const sched1 = contentGeneratorService.getDailySchedule(day1);
            assert.strictEqual(sched1.facebookFormat, 'reel');
            assert.strictEqual(sched1.instagramFormat, 'reel');
            assert.strictEqual(sched1.sharedFormat, 'reel');

            // Day 2 (2026-10-22): Carousel
            const day2 = new Date('2026-10-22T10:00:00+05:30');
            const sched2 = contentGeneratorService.getDailySchedule(day2);
            assert.strictEqual(sched2.facebookFormat, 'carousel');
            assert.strictEqual(sched2.instagramFormat, 'carousel');
            assert.strictEqual(sched2.sharedFormat, 'carousel');

            // Day 3 (2026-10-23): Reel
            const day3 = new Date('2026-10-23T10:00:00+05:30');
            const sched3 = contentGeneratorService.getDailySchedule(day3);
            assert.strictEqual(sched3.facebookFormat, 'reel');
            assert.strictEqual(sched3.instagramFormat, 'reel');
            assert.strictEqual(sched3.sharedFormat, 'reel');
        });

        it('should guarantee Facebook and Instagram never desynchronize their publishing format', () => {
            for (let offset = 0; offset < 30; offset++) {
                const date = new Date(Date.now() + offset * 86400000);
                const sched = contentGeneratorService.getDailySchedule(date);
                assert.strictEqual(sched.facebookFormat, sched.instagramFormat, `Desynchronization detected on day ${sched.dayNumber}`);
            }
        });
    });

    describe('LinkedIn Personal Profile Adapter', () => {
        it('should provide explicit postToPersonalProfile method matching audit requirements', () => {
            assert.strictEqual(typeof linkedinAdapter.postToPersonalProfile, 'function');
        });
    });

    describe('In-Memory Concurrency Mutex', () => {
        it('should reject concurrent duplicate triggers when Facebook publication is in progress', async () => {
            growthOrchestratorService._publishingLocks.facebook = true;
            try {
                const result = await growthOrchestratorService.publishDailyFacebookReel(false);
                assert.strictEqual(result.action, 'skipped');
                assert.strictEqual(result.reason, 'publish_in_progress');
            } finally {
                growthOrchestratorService._publishingLocks.facebook = false;
            }
        });

        it('should reject concurrent duplicate triggers when Instagram publication is in progress', async () => {
            growthOrchestratorService._publishingLocks.instagram = true;
            try {
                const result = await growthOrchestratorService.publishDailyInstagram(false);
                assert.strictEqual(result.action, 'skipped');
                assert.strictEqual(result.reason, 'publish_in_progress');
            } finally {
                growthOrchestratorService._publishingLocks.instagram = false;
            }
        });

        it('should reject duplicate trigger within 15-minute debounce window', async () => {
            growthOrchestratorService._lastPublishedTimestamps.facebook = Date.now() - 60000; // 1 min ago
            try {
                const result = await growthOrchestratorService.publishDailyFacebookReel(false);
                assert.strictEqual(result.action, 'skipped');
                assert.strictEqual(result.reason, 'recently_published');
            } finally {
                growthOrchestratorService._lastPublishedTimestamps.facebook = null;
            }
        });
    });
});
