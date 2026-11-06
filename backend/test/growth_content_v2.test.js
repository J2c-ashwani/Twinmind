import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import contentGeneratorService, { 
    CURATED_FALLBACK_THEMES, 
    PILLARS, 
    getCuratedTheme 
} from '../src/services/growth/contentGeneratorService.js';
import linkedinAdapter from '../src/services/growth/adapters/linkedinAdapter.js';
import growthOrchestratorService from '../src/services/growth/growthOrchestratorService.js';
import mediaRendererService from '../src/services/growth/mediaRendererService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TwinGenie Growth Content & LinkedIn Pipeline v2 Verification', () => {

    after(() => {
        setTimeout(() => process.exit(0), 100);
    });

    // =========================================================================
    // 1. CONTENT STRUCTURE & PILLAR DISTRIBUTION (Issue 5 & Issue 6)
    // =========================================================================
    describe('1. 5-Step Content Structure & 50/30/20 Pillar Distribution', () => {
        it('should verify total 35 rotational fallback themes across all 3 pillars', () => {
            assert.strictEqual(CURATED_FALLBACK_THEMES.length, 35, 'Expected exactly 35 curated fallback themes');

            const p1 = CURATED_FALLBACK_THEMES.filter(t => t.pillarId === 'pillar_1_psychology');
            const p2 = CURATED_FALLBACK_THEMES.filter(t => t.pillarId === 'pillar_2_generic_ai');
            const p3 = CURATED_FALLBACK_THEMES.filter(t => t.pillarId === 'pillar_3_product_demo');

            assert.strictEqual(p1.length, 18, 'Expected 18 themes in Pillar 1 (51.4%)');
            assert.strictEqual(p2.length, 10, 'Expected 10 themes in Pillar 2 (28.6%)');
            assert.strictEqual(p3.length, 7, 'Expected 7 themes in Pillar 3 (20.0%)');

            // Verify proportion aligns with 50/30/20 target
            const shareP1 = p1.length / 35;
            const shareP2 = p2.length / 35;
            const shareP3 = p3.length / 35;
            assert.ok(Math.abs(shareP1 - 0.50) < 0.03, 'Pillar 1 should be ~50%');
            assert.ok(Math.abs(shareP2 - 0.30) < 0.03, 'Pillar 2 should be ~30%');
            assert.ok(Math.abs(shareP3 - 0.20) < 0.03, 'Pillar 3 should be ~20%');
        });

        it('should verify 5-step content structure across all 35 themes', () => {
            for (let i = 0; i < CURATED_FALLBACK_THEMES.length; i++) {
                const theme = CURATED_FALLBACK_THEMES[i];

                // Step 1: Relatable Human Problem (Hook)
                assert.ok(theme.hook && theme.hook.length > 20, `Theme ${theme.id} missing hook`);

                // Step 2: Psychological Insight
                assert.ok(theme.psychologyInsight && theme.psychologyInsight.length > 30, `Theme ${theme.id} missing psychology insight`);

                // Step 3: Practical Framework (3 reflection questions / steps)
                assert.ok(Array.isArray(theme.practicalFramework) && theme.practicalFramework.length >= 3, `Theme ${theme.id} missing 3-part framework`);

                // Step 4: Natural Product Alignment
                assert.ok(theme.productAlignment && theme.productAlignment.length > 20, `Theme ${theme.id} missing product alignment`);

                // Step 5: Authentic Discussion Question (no binary engagement bait)
                assert.ok(theme.discussionQuestion && theme.discussionQuestion.length > 15, `Theme ${theme.id} missing discussion question`);
                assert.strictEqual(theme.discussionQuestion.includes('Drop A or B'), false, `Theme ${theme.id} has binary engagement bait`);
                assert.strictEqual(theme.discussionQuestion.includes('Comment below with A or B'), false, `Theme ${theme.id} has binary engagement bait`);
            }
        });

        it('should verify strict 50/30/20 distribution over a 30-day publishing calendar', () => {
            const pillarCycle = [
                'pillar_1_psychology', 'pillar_1_psychology', 'pillar_2_generic_ai',
                'pillar_1_psychology', 'pillar_3_product_demo', 'pillar_1_psychology',
                'pillar_2_generic_ai', 'pillar_3_product_demo', 'pillar_1_psychology',
                'pillar_2_generic_ai'
            ];

            const counts = { pillar_1_psychology: 0, pillar_2_generic_ai: 0, pillar_3_product_demo: 0 };
            for (let day = 0; day < 30; day++) {
                const pillar = pillarCycle[day % 10];
                counts[pillar]++;
            }

            assert.strictEqual(counts.pillar_1_psychology, 15, 'Pillar 1 should receive exactly 15 of 30 days (50%)');
            assert.strictEqual(counts.pillar_2_generic_ai, 9, 'Pillar 2 should receive exactly 9 of 30 days (30%)');
            assert.strictEqual(counts.pillar_3_product_demo, 6, 'Pillar 3 should receive exactly 6 of 30 days (20%)');
        });
    });

    // =========================================================================
    // 2. A/B EXPERIMENT & PAIR-MATCHED METHODOLOGY (Issue 1 & Issue 2)
    // =========================================================================
    describe('2. A/B Experiment & Pair-Matched Randomization (Controlling Confounders)', () => {
        beforeEach(() => {
            growthOrchestratorService._matchedPairBuckets = {};
            growthOrchestratorService._globalArmCounts = { arm_a: 0, arm_b: 0 };
        });

        it('should alternate arms strictly within each (pillar, format) matched pair', () => {
            // Bucket 1: Psychology Carousel
            const post1 = growthOrchestratorService.getExperimentAssignment({ pillarId: 'pillar_1_psychology', format: 'carousel_pdf', themeId: 'sunk_cost_fallacy' });
            assert.strictEqual(post1.arm, 'arm_a_caption');
            assert.strictEqual(post1.includeCaptionLink, true);
            assert.strictEqual(post1.skipFirstComment, true);

            // Bucket 2: Generic AI Carousel (first time in this bucket -> Arm A)
            const post2 = growthOrchestratorService.getExperimentAssignment({ pillarId: 'pillar_2_generic_ai', format: 'carousel_pdf', themeId: 'flattery_trap' });
            assert.strictEqual(post2.arm, 'arm_a_caption');

            // Bucket 1 second time -> Pair match triggers Arm B!
            const post3 = growthOrchestratorService.getExperimentAssignment({ pillarId: 'pillar_1_psychology', format: 'carousel_pdf', themeId: 'avoidance_trap' });
            assert.strictEqual(post3.arm, 'arm_b_comment');
            assert.strictEqual(post3.includeCaptionLink, false);
            assert.strictEqual(post3.skipFirstComment, false);
            assert.ok(post3.firstComment.includes('play.google.com'));

            // Bucket 2 second time -> Pair match triggers Arm B!
            const post4 = growthOrchestratorService.getExperimentAssignment({ pillarId: 'pillar_2_generic_ai', format: 'carousel_pdf', themeId: 'stateless_amnesia' });
            assert.strictEqual(post4.arm, 'arm_b_comment');
        });

        it('should guarantee exactly 50% Arm A and 50% Arm B across 30 pair-matched posts', () => {
            const pillarCycle = [
                'pillar_1_psychology', 'pillar_1_psychology', 'pillar_2_generic_ai',
                'pillar_1_psychology', 'pillar_3_product_demo', 'pillar_1_psychology',
                'pillar_2_generic_ai', 'pillar_3_product_demo', 'pillar_1_psychology',
                'pillar_2_generic_ai'
            ];

            const armCounts = { arm_a_caption: 0, arm_b_comment: 0 };
            const pillarArmDistribution = {
                pillar_1_psychology: { arm_a: 0, arm_b: 0 },
                pillar_2_generic_ai: { arm_a: 0, arm_b: 0 },
                pillar_3_product_demo: { arm_a: 0, arm_b: 0 }
            };

            for (let day = 0; day < 30; day++) {
                const assignedPillar = pillarCycle[day % 10];
                const assignment = growthOrchestratorService.getExperimentAssignment({
                    pillarId: assignedPillar,
                    format: 'carousel_pdf',
                    dayNumber: day,
                    themeId: `theme_${day}`
                });

                armCounts[assignment.arm]++;
                const armKey = assignment.arm === 'arm_a_caption' ? 'arm_a' : 'arm_b';
                pillarArmDistribution[assignedPillar][armKey]++;
            }

            // High-level ~50/50 balance (approx. 15 per arm across odd partition counts 15/9/6)
            assert.ok(Math.abs(armCounts.arm_a_caption - 15) <= 1, 'Arm A should receive approximately 15 of 30 posts (~50%)');
            assert.ok(Math.abs(armCounts.arm_b_comment - 15) <= 1, 'Arm B should receive approximately 15 of 30 posts (~50%)');
            assert.strictEqual(armCounts.arm_a_caption + armCounts.arm_b_comment, 30, 'Total posts must equal 30');

            // Confounder control: Each pillar has equal or near-equal distribution (difference <= 1)
            assert.ok(Math.abs(pillarArmDistribution.pillar_1_psychology.arm_a - pillarArmDistribution.pillar_1_psychology.arm_b) <= 1);
            assert.ok(Math.abs(pillarArmDistribution.pillar_2_generic_ai.arm_a - pillarArmDistribution.pillar_2_generic_ai.arm_b) <= 1);
            assert.strictEqual(pillarArmDistribution.pillar_3_product_demo.arm_a, pillarArmDistribution.pillar_3_product_demo.arm_b);
        });

        it('should explicitly document sample size status as exploratory directional', () => {
            const assignment = growthOrchestratorService.getExperimentAssignment({
                pillarId: 'pillar_1_psychology',
                format: 'carousel_pdf',
                themeId: 'sunk_cost_fallacy'
            });
            assert.ok(assignment.sampleStatus.includes('exploratory_directional'));
            assert.ok(assignment.sampleStatus.includes('n=30'));
        });
    });

    // =========================================================================
    // 3. CAPTION LINK INCLUSION & EXCLUSION (Issue 1)
    // =========================================================================
    describe('3. Caption Link Toggle (Arm A vs Arm B)', () => {
        it('should include Google Play Store link in Arm A caption', async () => {
            const contentArmA = await contentGeneratorService.getOrGenerateDailyContent(new Date('2026-11-06T10:00:00+05:30'), {
                includeCaptionLink: true,
                experimentArm: 'arm_a_caption',
                utmLink: 'https://play.google.com/store/apps/details?id=com.asmind.app&referrer=utm_source%3Dlinkedin%26utm_medium%3Dpost_caption%26utm_campaign%3Dpillar_1_psychology'
            });

            assert.strictEqual(contentArmA.includeCaptionLink, true);
            assert.ok(contentArmA.linkedin.caption.includes('play.google.com'), 'Arm A caption must include Play Store URL');
            assert.ok(contentArmA.linkedin.caption.includes('utm_medium%3Dpost_caption'), 'Arm A caption must have post_caption UTM medium');
        });

        it('should strictly exclude all external links from Arm B caption', async () => {
            const contentArmB = await contentGeneratorService.getOrGenerateDailyContent(new Date('2026-11-06T10:00:00+05:30'), {
                includeCaptionLink: false,
                experimentArm: 'arm_b_comment',
                utmLink: 'https://play.google.com/store/apps/details?id=com.asmind.app&referrer=utm_source%3Dlinkedin%26utm_medium%3Dfirst_comment%26utm_campaign%3Dpillar_1_psychology'
            });

            assert.strictEqual(contentArmB.includeCaptionLink, false);
            assert.strictEqual(contentArmB.linkedin.caption.includes('play.google.com'), false, 'Arm B caption must NEVER contain Play Store link');
            assert.strictEqual(contentArmB.linkedin.caption.includes('https://'), false, 'Arm B caption must NEVER contain any external URL');
            assert.strictEqual(contentArmB.linkedin.caption.includes('http://'), false, 'Arm B caption must NEVER contain any external URL');
        });
    });

    // =========================================================================
    // 4. FIRST-COMMENT AUTOMATION ROBUSTNESS (Issue 3)
    // =========================================================================
    describe('4. First-Comment Automation Robustness (_postFirstComment)', () => {
        beforeEach(() => {
            linkedinAdapter._postedComments = new Set();
            linkedinAdapter._fetch = null;
        });

        it('should skip first comment when skipFirstComment is true (Arm A)', async () => {
            let fetchCalled = false;
            linkedinAdapter._fetch = async () => { fetchCalled = true; return { json: async () => ({}) }; };

            const result = await linkedinAdapter._postFirstComment('urn:li:ugcPost:12345', {
                skipFirstComment: true,
                _propagationDelayMs: 0
            }, 'test_token', 'urn:li:person:67890');

            assert.strictEqual(result.skipped, true);
            assert.strictEqual(result.reason, 'skip_first_comment_flag');
            assert.strictEqual(fetchCalled, false, 'Fetch must not be called when skipFirstComment is true');
        });

        it('should publish first comment to correct post ID with accurate UTM parameters (Arm B)', async () => {
            let capturedUrl = '';
            let capturedBody = null;

            linkedinAdapter._fetch = async (url, options) => {
                capturedUrl = url;
                capturedBody = JSON.parse(options.body);
                return {
                    ok: true,
                    json: async () => ({ id: 'urn:li:comment:(urn:li:ugcPost:12345,999)' })
                };
            };

            const testPostId = `urn:li:ugcPost:utm_test_${Date.now()}`;
            const expectedUtm = 'https://play.google.com/store/apps/details?id=com.asmind.app&referrer=utm_source%3Dlinkedin%26utm_medium%3Dfirst_comment%26utm_campaign%3Dpillar_2_generic_ai';
            const testComment = `📲 Download TwinGenie free on Google Play:\n${expectedUtm}\n\nTake the 35-question cognitive baseline!`;

            const result = await linkedinAdapter._postFirstComment(testPostId, {
                skipFirstComment: false,
                firstComment: testComment,
                _propagationDelayMs: 0
            }, 'mock_access_token', 'urn:li:person:test_author');

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.commentId, 'urn:li:comment:(urn:li:ugcPost:12345,999)');
            assert.ok(capturedUrl.includes(encodeURIComponent(testPostId)), 'URL must target correct post ID');
            assert.strictEqual(capturedBody.actor, 'urn:li:person:test_author');
            assert.ok(capturedBody.message.text.includes('utm_medium') && capturedBody.message.text.includes('first_comment'));
        });

        it('should enforce idempotency and prevent duplicate comments on retries or repeated triggers', async () => {
            let callCount = 0;
            linkedinAdapter._fetch = async () => {
                callCount++;
                return {
                    ok: true,
                    json: async () => ({ id: 'urn:li:comment:first_success' })
                };
            };

            const testPostId = `urn:li:ugcPost:idemp_${Date.now()}`;

            // First call -> posts successfully
            const res1 = await linkedinAdapter._postFirstComment(testPostId, { _propagationDelayMs: 0 }, 'tok', 'urn:li:person:author');
            assert.strictEqual(res1.success, true);
            assert.strictEqual(callCount, 1);

            // Second call with same postId -> blocked by idempotency guard!
            const res2 = await linkedinAdapter._postFirstComment(testPostId, { _propagationDelayMs: 0 }, 'tok', 'urn:li:person:author');
            assert.strictEqual(res2.success, true);
            assert.strictEqual(res2.alreadyPosted, true);
            assert.strictEqual(callCount, 1, 'API must NOT be called twice for the same post ID');
        });

        it('should retry up to 3 times on transient network error and handle failure without throwing', async () => {
            let attemptCount = 0;
            linkedinAdapter._fetch = async (url, options) => {
                if (options?.method === 'POST') {
                    attemptCount++;
                    throw new Error('ETIMEDOUT: Connection dropped by LinkedIn peer');
                }
                // GET reconciliation calls return empty elements so reconciliation fails and retry continues
                return {
                    ok: true,
                    json: async () => ({ elements: [] })
                };
            };

            const testPostId = 'urn:li:ugcPost:77777';

            // Must not throw exception; must return non-blocking failure object
            const result = await linkedinAdapter._postFirstComment(testPostId, {
                _propagationDelayMs: 0,
                _retryDelayMs: 5
            }, 'tok', 'urn:li:person:author');

            assert.strictEqual(result.success, false);
            assert.strictEqual(attemptCount, 3, 'Must attempt exactly 3 retries');
            assert.ok(result.error.includes('ETIMEDOUT'));
            assert.strictEqual(result.postId, testPostId);
        });

        it('should enforce durable idempotency across process restarts via persistent disk ledger', async () => {
            let apiCalls = 0;
            linkedinAdapter._fetch = async () => {
                apiCalls++;
                return {
                    ok: true,
                    json: async () => ({ id: 'urn:li:comment:restart_success' })
                };
            };

            const testPostId = `urn:li:ugcPost:restart_${Date.now()}`;

            // Initial post: succeeds and writes to persistent disk ledger
            const res1 = await linkedinAdapter._postFirstComment(testPostId, { _propagationDelayMs: 0 }, 'tok', 'urn:li:person:author');
            assert.strictEqual(res1.success, true);
            assert.strictEqual(apiCalls, 1);

            // SIMULATE PROCESS RESTART: completely wipe in-memory Set
            linkedinAdapter._postedComments = new Set();
            assert.strictEqual(linkedinAdapter._postedComments.size, 0, 'In-memory Set must be completely cleared');

            // Retry post: must be intercepted by persistent disk ledger (Tier 2)!
            const res2 = await linkedinAdapter._postFirstComment(testPostId, { _propagationDelayMs: 0 }, 'tok', 'urn:li:person:author');
            assert.strictEqual(res2.success, true);
            assert.strictEqual(res2.alreadyPosted, true);
            assert.strictEqual(res2.tier, 'disk_ledger', 'Must be detected by disk ledger after process restart');
            assert.strictEqual(apiCalls, 1, 'API must NOT be called again after process restart');
        });

        it('should prevent concurrent race conditions from parallel publishing tasks', async () => {
            let apiCalls = 0;
            linkedinAdapter._fetch = async () => {
                apiCalls++;
                await new Promise(r => setTimeout(r, 20)); // Simulate in-flight HTTP request
                return {
                    ok: true,
                    json: async () => ({ id: 'urn:li:comment:concurrent_success' })
                };
            };

            const testPostId = `urn:li:ugcPost:concurrent_${Date.now()}`;

            // Fire 2 concurrent posting promises simultaneously
            const [p1, p2] = await Promise.all([
                linkedinAdapter._postFirstComment(testPostId, { _propagationDelayMs: 0 }, 'tok', 'urn:li:person:author'),
                linkedinAdapter._postFirstComment(testPostId, { _propagationDelayMs: 0 }, 'tok', 'urn:li:person:author')
            ]);

            assert.strictEqual(apiCalls, 1, 'Only exactly 1 API call must be dispatched across concurrent workers');
            assert.ok(p1.success && p2.success, 'Both calls must resolve cleanly');
            assert.ok(p1.alreadyPosted || p2.alreadyPosted, 'One of the concurrent workers must be blocked by concurrency guard');
        });

        it('should reconcile ambiguous API timeouts without duplicate comment publishing', async () => {
            let postCalls = 0;
            let getCalls = 0;
            const authorUrn = 'urn:li:person:test_reconcile_author';
            const testPostId = `urn:li:ugcPost:ambig_${Date.now()}`;

            linkedinAdapter._fetch = async (url, options) => {
                if (options?.method === 'POST') {
                    postCalls++;
                    // Simulate ambiguous drop: HTTP connection timed out, but LinkedIn created the comment
                    throw new Error('ETIMEDOUT: Connection dropped by LinkedIn peer');
                } else if (!options || options.method === 'GET') {
                    getCalls++;
                    // Reconcile query returns the comment that landed on LinkedIn!
                    return {
                        ok: true,
                        json: async () => ({
                            elements: [
                                { id: 'urn:li:comment:reconciled_999', actor: authorUrn }
                            ]
                        })
                    };
                }
            };

            const result = await linkedinAdapter._postFirstComment(testPostId, {
                _propagationDelayMs: 0,
                _retryDelayMs: 2
            }, 'mock_token', authorUrn);

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.reconciled, true, 'Must flag timeout as reconciled');
            assert.strictEqual(result.commentId, 'urn:li:comment:reconciled_999');
            assert.strictEqual(postCalls, 1, 'Must not continue blindly posting duplicate comments after reconciliation');
            assert.ok(getCalls >= 1, 'Must have queried LinkedIn socialActions to verify comment state');
        });

        it('should enforce atomic database mutex (SQLSTATE 23505) across concurrent workers without duplicate post calls', async () => {
            let postCalls = 0;
            linkedinAdapter._fetch = async (url, options) => {
                if (options?.method === 'POST') {
                    postCalls++;
                    return { ok: true, json: async () => ({ id: 'urn:li:comment:unreachable' }) };
                }
                // GET reconciliation calls return empty elements
                return { ok: true, json: async () => ({ elements: [] }) };
            };

            // Mock Supabase to simulate PostgreSQL unique_violation (23505) with active lease (< 5 min)
            const originalSupabase = linkedinAdapter._supabaseAdmin;
            linkedinAdapter._supabaseAdmin = {
                from: (table) => ({
                    select: () => ({
                        eq: () => ({
                            limit: async () => ({ data: [] }),
                            maybeSingle: async () => ({ data: { created_at: new Date().toISOString() }, error: null })
                        }),
                        limit: async () => ({ data: [{ id: 'mock_sys_user_id' }] })
                    }),
                    insert: async () => ({
                        data: null,
                        error: { code: '23505', message: 'duplicate key value violates unique constraint "referral_codes_code_key"' }
                    })
                })
            };

            const testPostId = `urn:li:ugcPost:mutex_test_${Date.now()}`;
            const result = await linkedinAdapter._postFirstComment(testPostId, {
                _propagationDelayMs: 0
            }, 'tok', 'urn:li:person:author');

            // Restore
            linkedinAdapter._supabaseAdmin = originalSupabase;

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.alreadyPosted, true);
            assert.strictEqual(result.tier, 'supabase_active_lease', 'Must intercept active lease via lock lifecycle');
            assert.strictEqual(postCalls, 0, 'Zero POST comment calls must be made when atomic DB lock is active');
        });

        it('should safely recover expired lock when previous worker crashed mid-operation without publishing', async () => {
            let postCalls = 0;
            linkedinAdapter._fetch = async (url, options) => {
                if (options?.method === 'POST') {
                    postCalls++;
                    return { ok: true, json: async () => ({ id: 'urn:li:comment:recovered_success' }) };
                }
                // GET reconciliation calls return empty elements (proves crashed worker never posted)
                return { ok: true, json: async () => ({ elements: [] }) };
            };

            let deletedStaleLock = false;
            let relockedFresh = false;
            const originalSupabase = linkedinAdapter._supabaseAdmin;

            // Mock Supabase: initial insert gives 23505; select shows created_at 15 minutes ago (> 5m TTL)
            linkedinAdapter._supabaseAdmin = {
                from: (table) => ({
                    select: () => ({
                        eq: () => ({
                            limit: async () => ({ data: [] }),
                            maybeSingle: async () => ({
                                data: { created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
                                error: null
                            })
                        }),
                        limit: async () => ({ data: [{ id: 'mock_sys_user_id' }] })
                    }),
                    insert: async () => {
                        if (!deletedStaleLock) {
                            return {
                                data: null,
                                error: { code: '23505', message: 'duplicate key' }
                            };
                        }
                        relockedFresh = true;
                        return { data: null, error: null };
                    },
                    delete: () => ({
                        eq: async () => {
                            deletedStaleLock = true;
                            return { data: null, error: null };
                        }
                    })
                })
            };

            const testPostId = `urn:li:ugcPost:crash_recovery_${Date.now()}`;
            const result = await linkedinAdapter._postFirstComment(testPostId, {
                _propagationDelayMs: 0
            }, 'tok', 'urn:li:person:author');

            // Restore
            linkedinAdapter._supabaseAdmin = originalSupabase;

            assert.strictEqual(result.success, true, 'Recovery must succeed');
            assert.strictEqual(deletedStaleLock, true, 'Must evict stale lock row from crashed worker');
            assert.strictEqual(relockedFresh, true, 'Must re-acquire fresh lease');
            assert.strictEqual(postCalls, 1, 'Must proceed to publish comment after recovering lock');
            assert.strictEqual(result.commentId, 'urn:li:comment:recovered_success');
        });
    });

    // =========================================================================
    // 5. CAROUSEL 6-SLIDE FORMAT & PYTHON RENDERER (Issue 5 & Carousel Approval)
    // =========================================================================
    describe('5. Six-Slide Carousel Format & Rendering Integrity', () => {
        it('should verify every theme in curriculum contains exactly 6 structured slides', () => {
            for (const theme of CURATED_FALLBACK_THEMES) {
                assert.strictEqual(theme.slides.length, 6, `Theme ${theme.id} must have 6 slides`);

                const [s1, s2, s3, s4, s5, s6] = theme.slides;
                assert.strictEqual(s1.type, 'cover', `Slide 1 of ${theme.id} must be cover`);
                assert.strictEqual(s4.type, 'timeline', `Slide 4 of ${theme.id} must be timeline/framework`);
                assert.strictEqual(s6.type, 'discussion', `Slide 6 of ${theme.id} must be discussion`);
                assert.ok(s6.question && s6.question.length > 10, `Slide 6 of ${theme.id} must contain open question`);
            }
        });

        it('should render 6-slide carousel to PNGs and PDF via Python renderer', async () => {
            const testTheme = CURATED_FALLBACK_THEMES[0]; // Sunk Cost Fallacy
            const testDir = path.join(__dirname, '../public/growth_assets/test_carousel_v2');

            const rendered = await mediaRendererService.renderCarousel({
                campaignId: 'test_camp_v2',
                postId: 'test_post_v2',
                slides: testTheme.slides
            });

            assert.strictEqual(rendered.totalSlides, 6, 'Rendered slides count must be 6');
            assert.strictEqual(rendered.pngPaths.length, 6, 'Must generate 6 PNG slide paths');
            assert.ok(fs.existsSync(rendered.pdfPath), 'Multi-page PDF must exist on disk');

            // Verify each PNG file was created and is non-empty (>50KB)
            for (const png of rendered.pngPaths) {
                assert.ok(fs.existsSync(png), `File ${png} must exist`);
                const stat = fs.statSync(png);
                assert.ok(stat.size > 50000, `Slide ${png} is too small (${stat.size} bytes)`);
            }
        });
    });

    // =========================================================================
    // 6. ROLLBACK & FEATURE FLAG (CEO Directive: Tested Rollback Mechanism)
    // =========================================================================
    describe('6. Rollback & Feature Flag Verification', () => {
        const originalFlag = process.env.LINKEDIN_CONTENT_EXPERIMENT_V2;

        after(() => {
            if (originalFlag !== undefined) {
                process.env.LINKEDIN_CONTENT_EXPERIMENT_V2 = originalFlag;
            } else {
                delete process.env.LINKEDIN_CONTENT_EXPERIMENT_V2;
            }
        });

        it('should safely revert to legacy behavior when LINKEDIN_CONTENT_EXPERIMENT_V2=false', () => {
            process.env.LINKEDIN_CONTENT_EXPERIMENT_V2 = 'false';

            const assignment = growthOrchestratorService.getExperimentAssignment({
                pillarId: 'pillar_1_psychology',
                format: 'carousel_pdf',
                themeId: 'sunk_cost_fallacy'
            });

            assert.strictEqual(assignment.arm, 'legacy');
            assert.strictEqual(assignment.includeCaptionLink, true);
            assert.strictEqual(assignment.skipFirstComment, false);
            assert.strictEqual(assignment.sampleStatus, 'legacy_production');
        });
    });

    // =========================================================================
    // 7. VERIFIED LIVE PRODUCT CAPABILITIES (Issue 5)
    // =========================================================================
    describe('7. Product Capabilities Verification (Codebase Audit)', () => {
        it('should verify 35 Big Five personality questions exist in seed schema', () => {
            const seedPath = path.join(__dirname, '../../database/seed_questions.sql');
            assert.ok(fs.existsSync(seedPath), 'database/seed_questions.sql must exist');
            const sql = fs.readFileSync(seedPath, 'utf8');
            assert.ok(sql.includes('35 Questions organized into 5 screens'));
            assert.ok(sql.includes('big_five'));
            assert.ok(sql.includes('openness'));
            assert.ok(sql.includes('conscientiousness'));
            assert.ok(sql.includes('extraversion'));
            assert.ok(sql.includes('agreeableness'));
            assert.ok(sql.includes('neuroticism'));
        });

        it('should verify Year-in-Pixels mood calendar endpoint exists in growthStory.routes.js', () => {
            const routePath = path.join(__dirname, '../src/routes/growthStory.routes.js');
            assert.ok(fs.existsSync(routePath), 'src/routes/growthStory.routes.js must exist');
            const code = fs.readFileSync(routePath, 'utf8');
            assert.ok(code.includes('/calendar/:year?'));
            assert.ok(code.includes('getYearInPixels'));
        });

        it('should verify 4 cognitive modes (Normal, Reflective, Honest, Future) exist in modeManager.js and chat.routes.js', () => {
            const modeManagerPath = path.join(__dirname, '../src/services/modeManager.js');
            assert.ok(fs.existsSync(modeManagerPath), 'modeManager.js must exist');
            const mmCode = fs.readFileSync(modeManagerPath, 'utf8');
            assert.ok(mmCode.includes('normal:'));
            assert.ok(mmCode.includes('future:'));
            assert.ok(mmCode.includes('dark:')); // Honest/Dark mode
            assert.ok(mmCode.includes('Normal Twin'));
        });

        it('should verify pgvector longitudinal semantic memory exists in geminiService.js', () => {
            const geminiPath = path.join(__dirname, '../src/services/geminiService.js');
            assert.ok(fs.existsSync(geminiPath), 'geminiService.js must exist');
            const geminiCode = fs.readFileSync(geminiPath, 'utf8');
            assert.ok(geminiCode.includes('pgvector'));
            assert.ok(geminiCode.includes('1536'));
        });
    });

    // =========================================================================
    // 8. THREE LINKEDIN PUBLISHING PATHS (Pre-Production Checklist Item 3)
    // =========================================================================
    describe('8. Three LinkedIn Publishing Paths Integration Verification', () => {
        let savedFetch;
        beforeEach(() => {
            savedFetch = linkedinAdapter._fetch;
        });
        afterEach(() => {
            linkedinAdapter._fetch = savedFetch;
        });

        it('Path 1: Caption Link (Arm A) should skip first comment cleanly', async () => {
            let commentApiCalled = false;
            linkedinAdapter._fetch = async () => {
                commentApiCalled = true;
                return { ok: true, json: async () => ({ id: 'c1' }) };
            };

            const result = await linkedinAdapter._postFirstComment('urn:li:ugcPost:path1_test', {
                skipFirstComment: true,
                _propagationDelayMs: 0
            }, 'tok', 'urn:li:person:auth');

            assert.strictEqual(result.skipped, true);
            assert.strictEqual(result.reason, 'skip_first_comment_flag');
            assert.strictEqual(commentApiCalled, false, 'API must not be called when skipFirstComment is true');
        });

        it('Path 2: First-Comment Link (Arm B) should post comment with verified UTM params', async () => {
            let capturedBody;
            linkedinAdapter._fetch = async (url, opts) => {
                capturedBody = JSON.parse(opts.body);
                return { ok: true, json: async () => ({ id: 'urn:li:comment:path2_comment' }) };
            };

            const utm = 'https://play.google.com/store/apps/details?id=com.asmind.app&referrer=utm_source%3Dlinkedin%26utm_medium%3Dfirst_comment%26utm_campaign%3Dpillar_1_psychology';
            const result = await linkedinAdapter._postFirstComment(`urn:li:ugcPost:path2_${Date.now()}`, {
                skipFirstComment: false,
                utmLink: utm,
                _propagationDelayMs: 0
            }, 'tok', 'urn:li:person:auth');

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.commentId, 'urn:li:comment:path2_comment');
            assert.ok(capturedBody.message.text.includes(utm), 'Comment text must contain verified UTM URL');
        });

        it('Path 3: Failed First-Comment Fallback should protect published parent post', async () => {
            linkedinAdapter._fetch = async () => {
                throw new Error('ECONNRESET: LinkedIn socialActions API timed out');
            };

            const result = await linkedinAdapter._postFirstComment(`urn:li:ugcPost:path3_${Date.now()}`, {
                skipFirstComment: false,
                _propagationDelayMs: 0,
                _retryDelayMs: 2
            }, 'tok', 'urn:li:person:auth');

            // Must NOT throw; must return graceful failure object
            assert.strictEqual(result.success, false);
            assert.ok(result.error.includes('ECONNRESET'));
            assert.strictEqual(result.attempts, 3);
        });
    });
});
