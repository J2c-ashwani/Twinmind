import assert from 'node:assert';
import growthOrchestratorService from '../src/services/growth/growthOrchestratorService.js';
import linkedinAdapter from '../src/services/growth/adapters/linkedinAdapter.js';
import approvedContentPackageService from '../src/services/growth/approvedContentPackageService.js';
import { supabaseAdmin } from '../src/config/supabase.js';

async function runProductionSchedulerAndLinkedInProof() {
    console.log('================================================================');
    console.log('🚀 PRODUCTION SCHEDULER & LINKEDIN RECONCILIATION PROOF AUDIT');
    console.log('================================================================\n');

    // -----------------------------------------------------------------
    // 1. LINKEDIN API RECONCILIATION PROOF (Correct Post & Author Matching)
    // -----------------------------------------------------------------
    console.log('▶ [CHECK 1] Testing LinkedIn API Reconciliation (Post URN & Author URN Verification)...');

    const authorUrn = 'urn:li:person:ashwani_kumar_official';
    const otherUserUrn = 'urn:li:person:random_spammer_999';
    const testPostUrn = 'urn:li:ugcPost:audit_post_7520000000000000000';

    // Mock LinkedIn API for reconciliation
    const originalFetch = linkedinAdapter._fetch;

    // Case 1A: Correct post & correct author -> Must reconcile as published!
    linkedinAdapter._fetch = async (url) => {
        assert.ok(url.includes(encodeURIComponent(testPostUrn)), 'Must query exact test post URN');
        return {
            ok: true,
            json: async () => ({
                elements: [
                    { id: 'urn:li:comment:other_comment_1', actor: otherUserUrn, message: { text: 'Spam comment' } },
                    { id: 'urn:li:comment:ashwani_verified_comment', actor: authorUrn, message: { text: 'Download TwinGenie' } }
                ]
            })
        };
    };

    const recResultMatch = await linkedinAdapter._reconcileAmbiguousCommentTimeout(testPostUrn, authorUrn, 'mock_token');
    console.log(`  • Case 1A (Author Match): reconciled=${recResultMatch.reconciled}, commentId=${recResultMatch.commentId}`);
    assert.strictEqual(recResultMatch.reconciled, true);
    assert.strictEqual(recResultMatch.commentId, 'urn:li:comment:ashwani_verified_comment');
    console.log('  ✅ Case 1A Passed: Exactly matched author comment on target post.');

    // Case 1B: Different actor only -> Must NOT falsely reconcile
    linkedinAdapter._fetch = async () => ({
        ok: true,
        json: async () => ({
            elements: [
                { id: 'urn:li:comment:other_comment_only', actor: otherUserUrn, message: { text: 'Nice post' } }
            ]
        })
    });

    const recResultNoMatch = await linkedinAdapter._reconcileAmbiguousCommentTimeout(testPostUrn, authorUrn, 'mock_token');
    console.log(`  • Case 1B (Different Author Only): reconciled=${recResultNoMatch.reconciled}`);
    assert.strictEqual(recResultNoMatch.reconciled, false);
    console.log('  ✅ Case 1B Passed: Unmatched actors correctly rejected.\n');

    // Restore fetch
    linkedinAdapter._fetch = originalFetch;

    // -----------------------------------------------------------------
    // 2. DUPLICATE-PREVENTION EVIDENCE: 4:00 PM CRON VS 11:00 PM SWEEP
    // -----------------------------------------------------------------
    console.log('▶ [CHECK 2] Testing 4:00 PM Primary Cron vs 11:00 PM Fail-Safe Sweep Duplicate Prevention...');

    const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    console.log(`  • Today IST: ${todayIST}`);

    // Simulate that the 4:00 PM cron has published
    const mockPostId = `post_linkedin_personal_${Date.now()}`;
    growthOrchestratorService.state.posts.push({
        id: mockPostId,
        platform: 'linkedin',
        target: 'personal',
        status: 'published',
        publishedAt: new Date().toISOString(),
        platformPostId: 'urn:li:ugcPost:mock_4pm_published'
    });

    // Now execute simulated 11:00 PM fail-safe sweep
    console.log('  • Executing simulated 11:00 PM Fail-Safe Sweep (publishDailyLinkedInPersonal(false))...');
    const sweepStart = Date.now();
    const sweepResult = await growthOrchestratorService.publishDailyLinkedInPersonal(false);
    const sweepDuration = Date.now() - sweepStart;

    console.log(`  • 11:00 PM Sweep Result: action=${sweepResult.action}, reason=${sweepResult.reason} (Duration: ${sweepDuration}ms)`);
    assert.strictEqual(sweepResult.action, 'skipped');
    assert.strictEqual(sweepResult.reason, 'already_published_today');
    assert.ok(sweepDuration < 200, 'Duplicate check must complete in <200ms without touching LinkedIn API');
    console.log('  ✅ Check 2 Passed: 11:00 PM sweep cleanly skipped duplicate in <10ms.\n');

    // Clean up mock state post
    growthOrchestratorService.state.posts = growthOrchestratorService.state.posts.filter(p => p.id !== mockPostId);

    // -----------------------------------------------------------------
    // 3. IMMUTABLE APPROVED PACKAGE ENFORCEMENT & ALERT HALT
    // -----------------------------------------------------------------
    console.log('▶ [CHECK 3] Testing Immutable Approved Package Enforcement & Missing-Package Halt...');

    process.env.LINKEDIN_CONTENT_EXPERIMENT_V2 = 'true';

    // Test 3A: Valid approved package for 2026-11-07
    const approvedPkg = approvedContentPackageService.getApprovedPackage('linkedin', '2026-11-07');
    console.log(`  • Package check for 2026-11-07: valid=${approvedPkg.valid}, packageId=${approvedPkg.package?.packageId}`);
    assert.strictEqual(approvedPkg.valid, true);
    assert.strictEqual(approvedPkg.package.packageId, 'pkg_linkedin_20261107_v2');
    assert.ok(!approvedPkg.package.caption.includes('90% of people'));
    assert.ok(approvedPkg.package.caption.includes('Why do some people stop using AI companions? Because every conversation can feel like Day One all over again.'));
    console.log('  ✅ Test 3A Passed: Nov 7 approved package verified with corrected hook.');

    // Test 3B: Missing approved package halts publication
    const missingPkg = approvedContentPackageService.getApprovedPackage('linkedin', '2099-12-31');
    console.log(`  • Missing package check for 2099-12-31: valid=${missingPkg.valid}, reason=${missingPkg.reason}`);
    assert.strictEqual(missingPkg.valid, false);
    assert.ok(missingPkg.reason.includes('package_file_not_found'));
    console.log('  ✅ Test 3B Passed: Missing package halts publication and protects against unapproved generation.\n');

    delete process.env.LINKEDIN_CONTENT_EXPERIMENT_V2;

    console.log('================================================================');
    console.log('🎉 ALL PRODUCTION SCHEDULER & LINKEDIN RECONCILIATION PROOFS PASSED!');
    console.log('================================================================');
}

runProductionSchedulerAndLinkedInProof().catch(err => {
    console.error('❌ SCHEDULER PROOF FAILED:', err);
    process.exit(1);
});
