import { describe, it, after } from 'node:test';
import assert from 'node:assert';
import contentGeneratorService from '../src/services/growth/contentGeneratorService.js';
import linkedinAdapter from '../src/services/growth/adapters/linkedinAdapter.js';
import growthOrchestratorService from '../src/services/growth/growthOrchestratorService.js';

describe('Growth Engine Reliability & Synchronized Multi-Platform Publishing', () => {
    after(() => {
        setTimeout(() => process.exit(0), 50);
    });

    describe('Meta Synchronized Format (Facebook + Instagram locked to 100% Reels)', () => {
        it('should strictly lock Facebook and Instagram to 100% Reels for viral distribution', () => {
            for (let d = 0; d < 7; d++) {
                const testDate = new Date(`2026-10-${20 + d}T10:00:00+05:30`);
                const sched = contentGeneratorService.getDailySchedule(testDate);
                assert.strictEqual(sched.facebookFormat, 'reel');
                assert.strictEqual(sched.instagramFormat, 'reel');
                assert.strictEqual(sched.sharedFormat, 'reel');
            }
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
