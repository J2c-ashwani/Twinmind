import { supabaseAdmin } from '../src/config/supabase.js';
import linkedinAdapter from '../src/services/growth/adapters/linkedinAdapter.js';

async function runRealSupabaseConcurrencyAudit() {
    console.log('================================================================');
    console.log('🚀 LIVE SUPABASE CONCURRENT-WORKER & LOCK LIFECYCLE AUDIT');
    console.log('Testing against production Supabase instance (lhwtfjgtripwikxwookp.supabase.co)');
    console.log('================================================================\n');

    if (!supabaseAdmin) {
        throw new Error('Supabase client is not initialized');
    }

    const testPostId = `urn:li:ugcPost:real_audit_${Date.now()}`;
    const dbLockKey = `LOCK-COMM-${testPostId}`;
    const testUserId = '5e149458-628a-426c-9469-c6f0fcf9fca6'; // twingenie.app@gmail.com

    try {
        // -------------------------------------------------------------
        // SCENARIO 1: Simultaneous Worker Race Condition
        // -------------------------------------------------------------
        console.log('▶ [SCENARIO 1] Simulating 2 real concurrent workers triggering at exact same ms...');
        let worker1Landed = false;
        let worker2Landed = false;

        const [w1Res, w2Res] = await Promise.all([
            supabaseAdmin.from('referral_codes').insert({ user_id: testUserId, code: dbLockKey }),
            supabaseAdmin.from('referral_codes').insert({ user_id: testUserId, code: dbLockKey })
        ]);

        const winner = !w1Res.error ? 'Worker 1' : (!w2Res.error ? 'Worker 2' : 'Neither');
        const loser = w1Res.error ? 'Worker 1' : 'Worker 2';
        const loserError = w1Res.error || w2Res.error;

        console.log(`  • Lock Insert Worker 1: status=${w1Res.status}, error=${w1Res.error?.code || 'none'}`);
        console.log(`  • Lock Insert Worker 2: status=${w2Res.status}, error=${w2Res.error?.code || 'none'}`);
        console.log(`  • Atomic Winner: ${winner}`);
        console.log(`  • Atomic Loser: ${loser} received ${loserError?.code} (${loserError?.message})`);

        if (loserError?.code !== '23505') {
            throw new Error(`Expected SQLSTATE 23505 for losing worker, got ${loserError?.code}`);
        }
        console.log('  ✅ SCENARIO 1 PASSED: Exactly 1 worker claimed lock. Second worker blocked by SQLSTATE 23505.\n');

        // -------------------------------------------------------------
        // SCENARIO 2: Active Lease Inspection (PENDING_ACTIVE)
        // -------------------------------------------------------------
        console.log('▶ [SCENARIO 2] Verifying active lease state for concurrent duplicate request...');
        const lifecycleActive = await linkedinAdapter._handleExistingCommentLock(
            testPostId,
            dbLockKey,
            supabaseAdmin,
            'urn:li:person:test',
            'token',
            5 * 60 * 1000 // 5m TTL
        );
        console.log(`  • Lifecycle evaluation result: status=${lifecycleActive.status}, alreadyPosted=${lifecycleActive.alreadyPosted}, tier=${lifecycleActive.tier}`);
        if (lifecycleActive.status !== 'PENDING_ACTIVE') {
            throw new Error(`Expected status PENDING_ACTIVE for fresh lock, got ${lifecycleActive.status}`);
        }
        console.log('  ✅ SCENARIO 2 PASSED: Active lease correctly recognized; concurrent worker prevented from duplicate.\n');

        // -------------------------------------------------------------
        // SCENARIO 3: Crashed Worker Recovery (The CEO Challenge)
        // Simulate: Worker 1 acquired lock, but crashed. Comment never posted.
        // Lock created_at is expired (simulated with 10ms TTL for testing).
        // -------------------------------------------------------------
        console.log('▶ [SCENARIO 3] Simulating Worker Crash mid-operation (comment never sent to LinkedIn)...');
        console.log('  • Waiting 50ms and evaluating recovery with 30ms TTL...');
        await new Promise(r => setTimeout(r, 50));

        const lifecycleRecover = await linkedinAdapter._handleExistingCommentLock(
            testPostId,
            dbLockKey,
            supabaseAdmin,
            'urn:li:person:test',
            'token',
            30 // 30ms TTL for immediate test recovery
        );
        console.log(`  • Crash recovery evaluation result: status=${lifecycleRecover.status}, acquired=${lifecycleRecover.acquired}`);
        if (lifecycleRecover.status !== 'RECOVERED' || !lifecycleRecover.acquired) {
            throw new Error(`Expected status RECOVERED with acquired=true, got ${JSON.stringify(lifecycleRecover)}`);
        }
        console.log('  ✅ SCENARIO 3 PASSED: Expired lock evicted, fresh lease acquired, publication unblocked!\n');

        // -------------------------------------------------------------
        // SCENARIO 4: Successful Publication Terminal Protection
        // Simulate: Worker successfully publishes and records in usage_tracking.
        // -------------------------------------------------------------
        console.log('▶ [SCENARIO 4] Verifying terminal SUCCESSFUL state once comment is recorded...');
        await linkedinAdapter._recordDurableComment(testPostId, 'urn:li:comment:live_audit_test');

        const lifecycleSuccess = await linkedinAdapter._handleExistingCommentLock(
            testPostId,
            dbLockKey,
            supabaseAdmin,
            'urn:li:person:test',
            'token',
            5 * 60 * 1000
        );
        console.log(`  • Published check evaluation: status=${lifecycleSuccess.status}, alreadyPosted=${lifecycleSuccess.alreadyPosted}, tier=${lifecycleSuccess.tier}`);
        if (lifecycleSuccess.status !== 'SUCCESSFUL' || !lifecycleSuccess.alreadyPosted) {
            throw new Error(`Expected status SUCCESSFUL, got ${lifecycleSuccess.status}`);
        }
        console.log('  ✅ SCENARIO 4 PASSED: Published comment permanently protected from future duplication.\n');

    } finally {
        // Cleanup live database
        console.log('🧹 [CLEANUP] Cleaning up temporary audit records from live Supabase...');
        await supabaseAdmin.from('referral_codes').delete().eq('code', dbLockKey);
        await supabaseAdmin.from('usage_tracking').delete().eq('action_type', `growth_first_comment:${testPostId}`);
        console.log('  ✅ Cleaned up temporary test records from referral_codes and usage_tracking.\n');
    }

    console.log('================================================================');
    console.log('🎉 ALL 4 LIVE SUPABASE CONCURRENT-WORKER AUDIT SCENARIOS PASSED!');
    console.log('================================================================');
}

runRealSupabaseConcurrencyAudit().catch(err => {
    console.error('❌ LIVE AUDIT FAILED:', err);
    process.exit(1);
});
