import { describe, it } from 'node:test';
import assert from 'node:assert';
import leadDiscoveryService, { PERMANENT_SUPPRESSION_LIST } from '../src/services/leadDiscoveryService.js';
import prOutreachService from '../src/services/prOutreachService.js';
import investorOutreachService from '../src/services/investorOutreachService.js';
import acquisitionCampaignService from '../src/services/acquisitionCampaignService.js';

describe('Autonomous Continuous Outreach Engine & Auto-Replenishment', () => {

    describe('Lead Discovery & Suppression Defenses', () => {
        it('should maintain verified candidate catalogs across all three campaign pillars', () => {
            const prCatalog = leadDiscoveryService.getCatalog('pr');
            const invCatalog = leadDiscoveryService.getCatalog('investor');
            const acqCatalog = leadDiscoveryService.getCatalog('acquisition');

            assert.ok(prCatalog.length >= 20, `PR catalog should have >= 20 leads (found ${prCatalog.length})`);
            assert.ok(invCatalog.length >= 20, `Investor catalog should have >= 20 leads (found ${invCatalog.length})`);
            assert.ok(acqCatalog.length >= 20, `Acquisition catalog should have >= 20 leads (found ${acqCatalog.length})`);
        });

        it('should strictly reject invalid email syntax and suppressed contacts', () => {
            assert.strictEqual(leadDiscoveryService.isValidEmail('invalid-email'), false);
            assert.strictEqual(leadDiscoveryService.isValidEmail('missing@tld'), false);
            assert.strictEqual(leadDiscoveryService.isValidEmail(''), false);

            // Reconciled suppression list
            for (const suppressed of PERMANENT_SUPPRESSION_LIST) {
                assert.strictEqual(leadDiscoveryService.isValidEmail(suppressed), false, `Suppressed email ${suppressed} must be blocked`);
            }

            // Valid corporate email
            assert.strictEqual(leadDiscoveryService.isValidEmail('amanda@techcrunch.com'), true);
            assert.strictEqual(leadDiscoveryService.isValidEmail('omoore@a16z.com'), true);
            assert.strictEqual(leadDiscoveryService.isValidEmail('roy@bloombergbeta.com'), true);
            assert.strictEqual(leadDiscoveryService.isValidEmail('hi@tiny.com'), true);
            assert.strictEqual(leadDiscoveryService.isValidEmail('pete@theneurondaily.com'), true);

            // Bounced & dead addresses must be blocked
            assert.strictEqual(leadDiscoveryService.isValidEmail('rbahat@bloombergbeta.com'), false);
            assert.strictEqual(leadDiscoveryService.isValidEmail('manda@tiny.com'), false);
            assert.strictEqual(leadDiscoveryService.isValidEmail('acquisitions@thehappyharbor.com'), false);
            assert.strictEqual(leadDiscoveryService.isValidEmail('acquisitions@appspree.co'), false);
            assert.strictEqual(leadDiscoveryService.isValidEmail('acquisitions@nalasoft.com'), false);
        });

        it('should synthesize tailored pitches with genuine value proposition and opt-out compliance', () => {
            const prPitch = leadDiscoveryService.generatePitch('pr', {
                recipientName: 'Amanda Silberling',
                organization: 'TechCrunch',
                angle: 'reddit_backlash'
            });
            assert.ok(prPitch.subject.includes('Reddit’s backlash'));
            assert.ok(prPitch.bodyText.includes('TwinGenie'));
            assert.ok(prPitch.bodyText.includes('uncompromising cognitive mirror'));

            const invPitch = leadDiscoveryService.generatePitch('investor', {
                recipientName: 'Olivia Moore',
                organization: 'a16z'
            });
            assert.ok(invPitch.subject.includes('Zero-Party Cognitive Graph'));
            assert.ok(invPitch.bodyText.includes('78.8% completion rate'));
            assert.ok(invPitch.bodyText.toLowerCase().includes('pre-seed'));

            const acqPitch = leadDiscoveryService.generatePitch('acquisition', {
                recipientName: 'Divestments Team',
                organization: 'YTC Ventures'
            });
            assert.ok(acqPitch.subject.includes('acquisition opportunity'));
            assert.ok(acqPitch.bodyText.includes('Google Play'));
            assert.ok(acqPitch.bodyText.includes('Flutter iOS codebase'));
        });
    });

    describe('Continuous Local & Database Replenishment', () => {
        it('should auto-replenish local queue whenever pending leads fall below minimum buffer', () => {
            const state = { queue: [], history: [] };
            const added = leadDiscoveryService.replenishLocalQueue(state, 'pr', 15);
            assert.strictEqual(added, 15);
            assert.strictEqual(state.queue.length, 15);
            assert.strictEqual(state.queue.filter(q => q.status === 'pending').length, 15);

            // Calling again when buffer is healthy should add 0
            const addedAgain = leadDiscoveryService.replenishLocalQueue(state, 'pr', 15);
            assert.strictEqual(addedAgain, 0);
        });

        it('should verify PR, Investor, and Acquisition services retain active queues >= 15', () => {
            const prStatus = prOutreachService.getStatus();
            const invStatus = investorOutreachService.getStatus();
            const acqStatus = acquisitionCampaignService.getStatus();

            assert.ok(prStatus.pendingInQueue >= 15, `PR queue should be >= 15 (got ${prStatus.pendingInQueue})`);
            assert.ok(invStatus.pendingInQueue >= 15, `Investor queue should be >= 15 (got ${invStatus.pendingInQueue})`);
            assert.ok(acqStatus.pendingInQueue >= 15, `Acquisition queue should be >= 15 (got ${acqStatus.pendingInQueue})`);

            assert.strictEqual(prStatus.dailyLimit, 6);
            assert.strictEqual(invStatus.dailyLimit, 3);
            assert.strictEqual(acqStatus.dailyLimit, 8);
        });
    });
});
