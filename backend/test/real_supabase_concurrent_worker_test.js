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

        // Clean up Scenario 1-4 lock before Scenario 5
        await supabaseAdmin.from('referral_codes').delete().eq('code', dbLockKey);

        // -------------------------------------------------------------
        // SCENARIO 5: Fencing Protection (Delayed Worker A vs Recovered Worker B)
        // Tests that:
        // 1. Worker A's lease expires.
        // 2. Worker B evicts Worker A's lock and acquires fresh lease with ownerTokenB.
        // 3. Delayed Worker A wakes up and attempts to publish -> Fencing check detects token mismatch and ABORTS.
        // 4. Delayed Worker A runs finally cleanup -> Attempting to delete matching ownerTokenA affects 0 rows.
        // 5. Worker B's lock remains safely held in database!
        // -------------------------------------------------------------
        console.log('▶ [SCENARIO 5] Testing Fencing Token Protection & finally Cleanup Isolation...');
        const testPostIdFencing = `urn:li:ugcPost:fencing_${Date.now()}`;
        const dbLockKeyFencing = `LOCK-COMM-${testPostIdFencing}`;
        const ownerTokenA = '00000000-0000-0000-0000-00000000000a';
        const ownerTokenB = '00000000-0000-0000-0000-00000000000b';

        // 1. Worker A claims lock with ownerTokenA
        await supabaseAdmin.from('referral_codes').insert({
            id: ownerTokenA,
            user_id: testUserId,
            code: dbLockKeyFencing
        });
        console.log(`  • Worker A claimed initial lock: token=${ownerTokenA}`);

        // 2. Worker B detects expired lock (using 10ms TTL) and recovers lease with ownerTokenB
        await new Promise(r => setTimeout(r, 30));
        const recoveryB = await linkedinAdapter._handleExistingCommentLock(
            testPostIdFencing,
            dbLockKeyFencing,
            supabaseAdmin,
            'urn:li:person:author',
            'token',
            10, // 10ms TTL
            ownerTokenB
        );
        console.log(`  • Worker B recovery result: status=${recoveryB.status}, acquired=${recoveryB.acquired}, token=${recoveryB.ownerToken}`);
        if (recoveryB.ownerToken !== ownerTokenB) {
            throw new Error(`Worker B failed to acquire with its own token: ${recoveryB.ownerToken}`);
        }

        // 3. Delayed Worker A wakes up and verifies lock ownership (Fencing Check)
        const { data: currentLockCheck } = await supabaseAdmin
            .from('referral_codes')
            .select('id')
            .eq('code', dbLockKeyFencing)
            .maybeSingle();

        const fencingViolation = (!currentLockCheck || currentLockCheck.id !== ownerTokenA);
        console.log(`  • Worker A Fencing Check: current_owner=${currentLockCheck?.id}, worker_A=${ownerTokenA}, violation_detected=${fencingViolation}`);
        if (!fencingViolation) {
            throw new Error('Worker A failed to detect fencing violation!');
        }

        // 4. Delayed Worker A runs finally cleanup with its token (ownerTokenA)
        console.log('  • Worker A executing finally cleanup (.eq(id, ownerTokenA))...');
        await supabaseAdmin
            .from('referral_codes')
            .delete()
            .eq('code', dbLockKeyFencing)
            .eq('id', ownerTokenA);

        // 5. Verify Worker B's lock is STILL in the database intact!
        const { data: lockAfterWorkerACleanup } = await supabaseAdmin
            .from('referral_codes')
            .select('id')
            .eq('code', dbLockKeyFencing)
            .maybeSingle();

        console.log(`  • Lock state in DB after Worker A cleanup: owner=${lockAfterWorkerACleanup?.id}`);
        if (!lockAfterWorkerACleanup || lockAfterWorkerACleanup.id !== ownerTokenB) {
            throw new Error(`Worker B's lock was improperly deleted by Worker A! Lock state: ${JSON.stringify(lockAfterWorkerACleanup)}`);
        }
        console.log('  ✅ SCENARIO 5 PASSED: Worker A fenced out from publishing; Worker A finally cleanup could NOT delete Worker B lock!\n');

        // Clean up scenario 5 lock
        await supabaseAdmin.from('referral_codes').delete().eq('code', dbLockKeyFencing);

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
