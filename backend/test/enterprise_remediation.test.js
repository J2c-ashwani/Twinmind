import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    safeCompare,
    pickAllowlistedFields,
    isValidPurchaseToken,
} from '../src/utils/security.js';
import { forEachPage } from '../src/utils/supabasePagination.js';
import { filterRetrievedMemories } from '../src/services/memoryEngine.js';
import {
    buildConversationHistory,
    getCachedConversation,
} from '../src/services/conversationMemoryService.js';
import huggingfaceService from '../src/services/huggingfaceService.js';
import cloudflareService from '../src/services/cloudflareService.js';
import geminiService from '../src/services/geminiService.js';
import aiService from '../src/services/aiService.js';
import responseCache from '../src/services/responseCache.js';
import authRoutes from '../src/routes/auth.routes.js';
import subscriptionRoutes from '../src/routes/subscription.routes.js';
import adminRoutes from '../src/routes/admin.routes.js';
import { supabaseAdmin } from '../src/config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dispatch = (router, { method = 'GET', url = '/', headers = {}, body = {}, query = {} }) =>
    new Promise((resolve) => {
        const req = {
            method,
            url,
            originalUrl: url,
            headers: Object.fromEntries(
                Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
            ),
            body,
            query,
            ip: '127.0.0.1',
        };

        const res = {
            statusCode: 200,
            status(code) {
                this.statusCode = code;
                return this;
            },
            json(data) {
                resolve({ status: this.statusCode, body: data });
            },
            send(data) {
                resolve({ status: this.statusCode, body: data });
            },
        };

        router(req, res, (err) => {
            if (err) resolve({ status: 500, error: err });
            else resolve({ status: 404, body: { error: 'Not found' } });
        });
    });

test('Enterprise Security Hardening', async (t) => {
    await t.test('server.js contains zero hardcoded admin secret fallbacks', () => {
        const serverSrc = fs.readFileSync(path.join(__dirname, '../src/server.js'), 'utf8');
        assert.equal(/ADMIN_API_KEY\s*\|\|\s*['"`]/.test(serverSrc), false);
        assert.equal(/['"`]tg_[a-z0-9_]+['"`]/i.test(serverSrc), false);
        assert.equal(serverSrc.includes("req.path.includes('/admin')"), false);
        assert.ok(serverSrc.includes("app.use('/api/admin/verify-password', adminVerifyLimiter)"));
        assert.ok(serverSrc.includes("app.use('/api/auth/signup', authLimiter)"));
        assert.ok(serverSrc.includes("app.use('/api/chat/stream', chatLimiter)"));
    });

    await t.test('safeCompare handles equal, unequal, and differing lengths safely', () => {
        assert.equal(safeCompare('secret-123', 'secret-123'), true);
        assert.equal(safeCompare('secret-123', 'secret-124'), false);
        assert.equal(safeCompare('short', 'much-longer-secret'), false);
        assert.equal(safeCompare(null, 'secret'), false);
    });

    await t.test('pickAllowlistedFields strips & reports disallowed fields on profile update', () => {
        const { updates, rejectedKeys } = pickAllowlistedFields(
            { full_name: 'Alice', email: 'hacked@evil.com', id: '000' },
            ['full_name', 'country', 'avatar_url']
        );
        assert.deepEqual(updates, { full_name: 'Alice' });
        assert.deepEqual(rejectedKeys, ['email', 'id']);
    });

    await t.test('PUT /api/auth/profile/:userId rejects disallowed fields & invalid UUIDs', async () => {
        const origGetUser = supabaseAdmin.auth.getUser;
        const userId = '11111111-1111-4111-8111-111111111111';
        supabaseAdmin.auth.getUser = async () => ({
            data: { user: { id: userId, email: 'test@twingenie.app', role: 'authenticated' } },
            error: null,
        });

        try {
            const badUuidRes = await dispatch(authRoutes, {
                method: 'PUT',
                url: '/profile/not-a-uuid',
                headers: { authorization: 'Bearer mock.jwt.token' },
                body: { full_name: 'Test User' },
            });
            assert.equal(badUuidRes.status, 400);

            const massAssignRes = await dispatch(authRoutes, {
                method: 'PUT',
                url: `/profile/${userId}`,
                headers: { authorization: 'Bearer mock.jwt.token' },
                body: { full_name: 'Legit', email: 'spoof@evil.com' },
            });
            assert.equal(massAssignRes.status, 400);
            assert.match(massAssignRes.body.error, /Disallowed profile fields/);
        } finally {
            supabaseAdmin.auth.getUser = origGetUser;
        }
    });

    await t.test('POST /google-play/rtdn fails closed when secret unset and rejects filter-injection tokens', async () => {
        const prevSecret = process.env.GOOGLE_PLAY_RTDN_SECRET;
        delete process.env.GOOGLE_PLAY_RTDN_SECRET;

        try {
            const unconfiguredRes = await dispatch(subscriptionRoutes, {
                method: 'POST',
                url: '/google-play/rtdn',
                body: {},
            });
            assert.equal(unconfiguredRes.status, 503);

            process.env.GOOGLE_PLAY_RTDN_SECRET = 'rtdn_test_secret_xyz';
            const badAuthRes = await dispatch(subscriptionRoutes, {
                method: 'POST',
                url: '/google-play/rtdn',
                headers: { 'x-rtdn-secret': 'wrong' },
                body: {},
            });
            assert.equal(badAuthRes.status, 401);

            const maliciousToken = 'tok,id.neq.null';
            assert.equal(isValidPurchaseToken(maliciousToken), false);
            const payloadB64 = Buffer.from(JSON.stringify({
                subscriptionNotification: { purchaseToken: maliciousToken, subscriptionId: 'pro_monthly' },
            })).toString('base64');

            const injRes = await dispatch(subscriptionRoutes, {
                method: 'POST',
                url: '/google-play/rtdn',
                headers: { 'x-rtdn-secret': 'rtdn_test_secret_xyz' },
                body: { message: { data: payloadB64 } },
            });
            assert.equal(injRes.status, 400);
            assert.match(injRes.body.error, /Invalid purchaseToken/);
        } finally {
            if (prevSecret === undefined) delete process.env.GOOGLE_PLAY_RTDN_SECRET;
            else process.env.GOOGLE_PLAY_RTDN_SECRET = prevSecret;
        }
    });

    await t.test('Admin JWT check trusts app_metadata.role=admin and rejects user_metadata.role=admin', async () => {
        const prevEmail = process.env.ADMIN_EMAIL;
        const prevKey = process.env.ADMIN_API_KEY;
        const prevPass = process.env.ADMIN_PASSWORD;
        const origGetUser = supabaseAdmin.auth.getUser;

        process.env.ADMIN_EMAIL = 'admin@twingenie.app';
        delete process.env.ADMIN_API_KEY;
        delete process.env.ADMIN_PASSWORD;

        try {
            supabaseAdmin.auth.getUser = async () => ({
                data: {
                    user: {
                        id: 'user-spoof',
                        email: 'attacker@gmail.com',
                        user_metadata: { role: 'admin' },
                        app_metadata: {},
                    },
                },
                error: null,
            });
            const rejectedRes = await dispatch(adminRoutes, {
                method: 'GET',
                url: '/me',
                headers: { authorization: 'Bearer a.b.c' },
            });
            assert.equal(rejectedRes.status, 401);

            supabaseAdmin.auth.getUser = async () => ({
                data: {
                    user: {
                        id: 'user-real-admin',
                        email: 'staff@twingenie.app',
                        user_metadata: {},
                        app_metadata: { role: 'admin' },
                    },
                },
                error: null,
            });
            const allowedRes = await dispatch(adminRoutes, {
                method: 'GET',
                url: '/me',
                headers: { authorization: 'Bearer a.b.c' },
            });
            assert.equal(allowedRes.status, 200);
            assert.equal(allowedRes.body.isAdmin, true);
        } finally {
            supabaseAdmin.auth.getUser = origGetUser;
            if (prevEmail === undefined) delete process.env.ADMIN_EMAIL; else process.env.ADMIN_EMAIL = prevEmail;
            if (prevKey === undefined) delete process.env.ADMIN_API_KEY; else process.env.ADMIN_API_KEY = prevKey;
            if (prevPass === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = prevPass;
        }
    });
});

test('Semantic Vector Memory & AI Provider Fixes', async (t) => {
    await t.test('Gemini uses active gemini-embedding-001 (1536 dims) instead of removed text-embedding-004', () => {
        assert.equal(geminiService.embeddingModelName, 'gemini-embedding-001');
        assert.equal(geminiService.embeddingDimensions, 1536);
    });

    await t.test('filterRetrievedMemories isolates Gemini queries away from untagged legacy OpenAI vectors & mismatched models', () => {
        const rows = [
            { id: 'legacy', metadata: { conversation_id: 'c1' } },
            { id: 'openai_row', metadata: { embedding_provider: 'openai', embedding_model: 'text-embedding-3-small' } },
            { id: 'gemini_old', metadata: { embedding_provider: 'gemini', embedding_model: 'text-embedding-004' } },
            { id: 'gemini_new', metadata: { embedding_provider: 'gemini', embedding_model: 'gemini-embedding-001' } },
        ];

        const geminiFiltered = filterRetrievedMemories(rows, {
            queryProvider: 'gemini',
            queryModel: 'gemini-embedding-001',
        });
        assert.deepEqual(geminiFiltered.map((r) => r.id), ['gemini_new']);

        const openaiFiltered = filterRetrievedMemories(rows, { queryProvider: 'openai' });
        assert.deepEqual(openaiFiltered.map((r) => r.id), ['legacy', 'openai_row']);
    });

    await t.test('buildConversationHistory & getCachedConversation fail safe without userId', async () => {
        assert.deepEqual(await buildConversationHistory(null, 'conv-123'), []);
        assert.deepEqual(await getCachedConversation(null, 'conv-123'), []);
        assert.deepEqual(await getCachedConversation('conv-only-single-arg'), []);
    });

    await t.test('Cloudflare uses non-deprecated Llama 3.3 model default', () => {
        assert.notEqual(cloudflareService.model, '@cf/meta/llama-3-8b-instruct');
        assert.ok(cloudflareService.model.includes('llama-3.3-70b-instruct'));
    });

    await t.test('HuggingFace accepts unified object contract without TypeError', async () => {
        const origHf = huggingfaceService.hf;
        const origEnabled = huggingfaceService.isEnabled;
        huggingfaceService.isEnabled = true;
        huggingfaceService.hf = {
            chatCompletion: async ({ messages }) => ({
                choices: [{ message: { content: `ok:${messages.length}` } }],
            }),
        };

        try {
            const reply = await huggingfaceService.generateChatResponse({
                systemPrompt: 'Be concise.',
                messages: [{ role: 'user', content: 'Hello' }],
                userMessage: 'Hello',
            });
            assert.equal(reply, 'ok:1');
        } finally {
            huggingfaceService.hf = origHf;
            huggingfaceService.isEnabled = origEnabled;
        }
    });

    await t.test('aiService.markProviderError recognizes all billing & deprecated model failures', () => {
        const saveStatus = (name) => ({ ...aiService.providerStatus[name] });
        const claudeBefore = saveStatus('Claude');
        const cfBefore = saveStatus('Cloudflare');

        try {
            aiService.markProviderError('Claude', new Error('400 Your credit balance is too low to access the Anthropic API'));
            assert.equal(aiService.providerStatus.Claude.isExhausted, true);

            aiService.markProviderError('Cloudflare', new Error('AiError: Model has been deprecated (5028)'));
            assert.equal(aiService.providerStatus.Cloudflare.isExhausted, true);
        } finally {
            aiService.providerStatus.Claude = claudeBefore;
            aiService.providerStatus.Cloudflare = cfBefore;
        }
    });
});

test('Scaling, Pagination & Bounded Cache', async (t) => {
    await t.test('forEachPage streams across multiple pages beyond 1,000 rows without truncation', async () => {
        const fakeRows = Array.from({ length: 2500 }, (_, i) => ({ id: i + 1 }));
        const seen = [];
        await forEachPage(
            () => ({
                range: async (from, to) => ({
                    data: fakeRows.slice(from, to + 1),
                    error: null,
                }),
            }),
            (pageRows) => {
                seen.push(...pageRows);
            },
            { pageSize: 1000 }
        );
        assert.equal(seen.length, 2500);
    });

    await t.test('responseCache evicts oldest entries cleanly when over maxEntries', async () => {
        const prevMax = responseCache.maxEntries;
        await responseCache.clear();
        responseCache.maxEntries = 3;

        try {
            await responseCache.set('k1', 'v1', 60);
            await responseCache.set('k2', 'v2', 60);
            await responseCache.set('k3', 'v3', 60);
            await responseCache.set('k4', 'v4', 60);
            assert.equal(responseCache.cache.size, 3);
            assert.equal(await responseCache.get('k1'), null);
            assert.equal(await responseCache.get('k4'), 'v4');
        } finally {
            await responseCache.clear();
            responseCache.maxEntries = prevMax;
        }
    });

    await t.test('reserveDailyQuota fallback retries on optimistic CAS conflict and succeeds cleanly', async () => {
        const { reserveDailyQuota } = await import('../src/middleware/subscriptionMiddleware.js');
        const origFrom = supabaseAdmin.from;
        const origRpc = supabaseAdmin.rpc;

        let selectReads = 0;
        let casAttempts = 0;
        supabaseAdmin.rpc = async () => ({ data: null, error: { code: 'PGRST202', message: 'missing rpc' } });
        supabaseAdmin.from = (table) => {
            assert.equal(table, 'usage_tracking');
            return {
                select() {
                    return {
                        eq() { return this; },
                        async maybeSingle() {
                            selectReads++;
                            return { data: { id: 'ut-1', count: selectReads === 1 ? 1 : 2 }, error: null };
                        },
                    };
                },
                update() {
                    return {
                        eq() { return this; },
                        select() {
                            return {
                                async maybeSingle() {
                                    casAttempts++;
                                    if (casAttempts === 1) {
                                        return { data: null, error: null }; // Lost race -> retry
                                    }
                                    return { data: { count: 3 }, error: null };
                                },
                            };
                        },
                    };
                },
            };
        };

        try {
            const quota = await reserveDailyQuota('user-cas-1', 'chat_message', 10);
            assert.equal(quota.allowed, true);
            assert.equal(quota.current, 3);
            assert.equal(casAttempts, 2);
        } finally {
            supabaseAdmin.from = origFrom;
            supabaseAdmin.rpc = origRpc;
        }
    });

    await t.test('emotionalStateEngine uses verified chat_history, get_engagement_state RPC, and updated_at column', async () => {
        const { updateEmotionalMetrics } = await import('../src/services/emotionalStateEngine.js');
        const origFrom = supabaseAdmin.from;
        const origRpc = supabaseAdmin.rpc;

        const queriedTables = [];
        const calledRpcs = [];
        let updatedPayload = null;

        supabaseAdmin.rpc = async (fn) => {
            calledRpcs.push(fn);
            if (fn === 'get_engagement_state') {
                return { data: [{ consecutive_days: 3 }], error: null };
            }
            return { data: null, error: { code: 'PGRST202', message: 'not found' } };
        };

        supabaseAdmin.from = (table) => {
            queriedTables.push(table);
            return {
                select() { return this; },
                eq() { return this; },
                gte() { return this; },
                order() { return this; },
                limit: async () => ({ data: [{ id: 'm1' }], error: null }),
                maybeSingle: async () => {
                    if (table === 'user_engagement') return { data: { last_active_date: '2026-11-25' }, error: null };
                    if (table === 'emotional_metrics') {
                        return {
                            data: {
                                user_id: 'u1',
                                trust_level: 10,
                                openness_level: 10,
                                dependency_score: 10,
                                vulnerability_level: 10,
                                engagement_frequency: 20,
                                goal_progress: 10,
                                emotional_valence: 50,
                                relationship_depth: 10,
                                emotional_state: 'new_user',
                            },
                            error: null,
                        };
                    }
                    return { data: null, error: null };
                },
                update(payload) {
                    updatedPayload = payload;
                    return {
                        async eq() { return { error: null }; },
                    };
                },
            };
        };

        try {
            await updateEmotionalMetrics('u1', 'I feel grateful today', true, false, 1, 'Glad to hear');
            assert.equal(queriedTables.includes('chat_messages'), false);
            assert.ok(queriedTables.includes('chat_history'));
            assert.ok(calledRpcs.includes('get_engagement_state'));
            assert.ok(updatedPayload?.updated_at);
            assert.equal('last_updated' in updatedPayload, false);
        } finally {
            supabaseAdmin.from = origFrom;
            supabaseAdmin.rpc = origRpc;
        }
    });

    await t.test('twinMatchService retries cleanly without is_shared when live schema lacks is_shared column', async () => {
        const { comparePersonalities } = await import('../src/services/twinMatchService.js');
        const origFrom = supabaseAdmin.from;
        const origGen = aiService.generateChatResponse;

        const upsertPayloads = [];
        aiService.generateChatResponse = async () => ({
            text: JSON.stringify(['Insight 1', 'Insight 2', 'Insight 3']),
        });

        supabaseAdmin.from = (table) => {
            if (table === 'personality_profiles') {
                return {
                    select() { return this; },
                    eq() { return this; },
                    async maybeSingle() {
                        return { data: { twin_name: 'Twin', personality_json: { big_five: { openness: 80 } } }, error: null };
                    },
                };
            }
            if (table === 'twin_matches') {
                return {
                    upsert(payload) {
                        upsertPayloads.push(payload);
                        return {
                            select() {
                                return {
                                    async maybeSingle() {
                                        if ('is_shared' in payload) {
                                            return { data: null, error: { code: 'PGRST204', message: "Could not find the 'is_shared' column" } };
                                        }
                                        return { data: { id: 'match-ok-1' }, error: null };
                                    },
                                };
                            },
                        };
                    },
                };
            }
            return {
                select() { return this; },
                eq() { return this; },
                maybeSingle: async () => ({ data: null, error: null }),
            };
        };

        try {
            const result = await comparePersonalities('u1', 'u2', { bypassConsentCheck: true });
            assert.equal(result.comparison_id, 'match-ok-1');
            assert.equal(upsertPayloads.length, 2);
            assert.equal('is_shared' in upsertPayloads[0], true);
            assert.equal('is_shared' in upsertPayloads[1], false);
        } finally {
            supabaseAdmin.from = origFrom;
            aiService.generateChatResponse = origGen;
        }
    });

    await t.test('twinMatchService legacy 42P10 fallback consolidates duplicate pairs cleanly', async () => {
        const { comparePersonalities } = await import('../src/services/twinMatchService.js');
        const origFrom = supabaseAdmin.from;
        const origGen = aiService.generateChatResponse;

        const deletedIds = [];
        let updatedId = null;
        aiService.generateChatResponse = async () => ({ text: JSON.stringify(['A', 'B', 'C']) });

        supabaseAdmin.from = (table) => {
            if (table === 'personality_profiles') {
                return {
                    select() { return this; },
                    eq() { return this; },
                    async maybeSingle() {
                        return { data: { twin_name: 'Twin', personality_json: { big_five: { openness: 80 } } }, error: null };
                    },
                };
            }
            if (table === 'twin_matches') {
                return {
                    upsert() {
                        return {
                            select() {
                                return {
                                    async maybeSingle() {
                                        return { data: null, error: { code: '42P10', message: 'no unique constraint' } };
                                    },
                                };
                            },
                        };
                    },
                    select() { return this; },
                    eq() { return this; },
                    order: async () => ({
                        data: [{ id: 'keep-newest' }, { id: 'dup-old-1' }, { id: 'dup-old-2' }],
                        error: null,
                    }),
                    update() {
                        return {
                            eq(_col, id) {
                                updatedId = id;
                                return {
                                    select() {
                                        return {
                                            async single() {
                                                return { data: { id }, error: null };
                                            },
                                        };
                                    },
                                };
                            },
                        };
                    },
                    delete() {
                        return {
                            async in(_col, ids) {
                                deletedIds.push(...ids);
                                return { error: null };
                            },
                        };
                    },
                };
            }
            return { select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null, error: null }) };
        };

        try {
            const res = await comparePersonalities('u1', 'u2', { bypassConsentCheck: true });
            assert.equal(res.comparison_id, 'keep-newest');
            assert.equal(updatedId, 'keep-newest');
            assert.deepEqual(deletedIds, ['dup-old-1', 'dup-old-2']);
        } finally {
            supabaseAdmin.from = origFrom;
            aiService.generateChatResponse = origGen;
        }
    });

    await t.test('conversationMemoryService stores actual provider/model and passes pre-ranking RPC filters', async () => {
        const {
            storeMessageWithEmbedding,
            searchSimilarConversations,
        } = await import('../src/services/conversationMemoryService.js');
        const origFrom = supabaseAdmin.from;
        const origRpc = supabaseAdmin.rpc;
        const origEmb = aiService.generateEmbeddingWithMeta;

        let insertedRow = null;
        let rpcArgs = null;

        aiService.generateEmbeddingWithMeta = async (_txt, opts) => ({
            vector: [0.25, 0.75],
            provider: 'openai',
            model: 'text-embedding-3-small',
            dimensions: 1536,
            taskType: opts?.taskType,
        });
        supabaseAdmin.from = (table) => {
            assert.equal(table, 'message_embeddings');
            return {
                async insert(row) {
                    insertedRow = row;
                    return { error: null };
                },
            };
        };
        supabaseAdmin.rpc = async (fn, args) => {
            assert.equal(fn, 'search_conversations');
            rpcArgs = args;
            return { data: [{ id: 'hit-1', embedding_provider: 'openai', embedding_model: 'text-embedding-3-small', similarity: 0.9 }], error: null };
        };

        try {
            await storeMessageWithEmbedding('msg-1', 'user-1', 'Actual OpenAI embedding text', 'conv-1');
            assert.equal(insertedRow.embedding_provider, 'openai');
            assert.equal(insertedRow.embedding_model, 'text-embedding-3-small');
            assert.equal(insertedRow.embedding_dimensions, 1536);

            const hits = await searchSimilarConversations('user-1', 'find text', 5);
            assert.equal(hits.length, 1);
            assert.equal(rpcArgs.p_embedding_provider, 'openai');
            assert.equal(rpcArgs.p_embedding_model, 'text-embedding-3-small');
        } finally {
            supabaseAdmin.from = origFrom;
            supabaseAdmin.rpc = origRpc;
            aiService.generateEmbeddingWithMeta = origEmb;
        }
    });

    await t.test('reembed_memory_vectors enforces exact limit, aligns active target, and preserves legacy vectors', async () => {
        const { runBackfill } = await import('../scripts/reembed_memory_vectors.js');
        const rows = Array.from({ length: 50 }, (_, i) => ({
            id: `mv-${i + 1}`,
            content: `Memory item ${i + 1}`,
            embedding: [0.1, 0.2],
            metadata: { conversation_id: 'c1' },
        }));

        const rangeCalls = [];
        const updatedPayloads = [];
        const mockDb = {
            from() {
                return {
                    select() { return this; },
                    order() { return this; },
                    async range(from, to) {
                        rangeCalls.push({ from, to });
                        return { data: rows.slice(from, to + 1), error: null };
                    },
                    update(payload) {
                        updatedPayloads.push(payload);
                        return { async eq() { return { error: null }; } };
                    },
                };
            },
        };

        // 1. Misaligned active target must abort unless force=true
        await assert.rejects(
            () => runBackfill({
                db: mockDb,
                activeTarget: { provider: 'openai', model: 'text-embedding-3-small', dimensions: 1536 },
                dryRun: true,
                maxRows: 1,
            }),
            /does not match backfill target/
        );

        // 2. Limit=1 must fetch & scan strictly 1 row (never 50)
        const drySummary = await runBackfill({
            db: mockDb,
            activeTarget: { provider: 'gemini', model: 'gemini-embedding-001', dimensions: 1536 },
            dryRun: true,
            maxRows: 1,
            batchSize: 50,
        });
        assert.deepEqual(rangeCalls[0], { from: 0, to: 0 });
        assert.equal(drySummary.scanned, 1);
        assert.equal(drySummary.candidates, 1);
        assert.equal(drySummary.updated, 0);

        // 3. Write mode preserves old vector both in backup file and legacy_embedding column
        const backupFile = path.join(os.tmpdir(), `reembed_test_${Date.now()}.jsonl`);
        try {
            const writeSummary = await runBackfill({
                db: mockDb,
                embedder: async () => Array(1536).fill(0.01),
                activeTarget: { provider: 'gemini', model: 'gemini-embedding-001', dimensions: 1536 },
                dryRun: false,
                maxRows: 1,
                batchSize: 50,
                backupFile,
            });
            assert.equal(writeSummary.scanned, 1);
            assert.equal(writeSummary.updated, 1);
            assert.deepEqual(updatedPayloads[0].legacy_embedding, [0.1, 0.2]);
            const backupLines = fs.readFileSync(backupFile, 'utf8').trim().split('\n');
            assert.equal(backupLines.length, 1);
            assert.deepEqual(JSON.parse(backupLines[0]).embedding, [0.1, 0.2]);
        } finally {
            if (fs.existsSync(backupFile)) fs.unlinkSync(backupFile);
        }
    });

    await t.test('SQL migration preserves emotional-state recovery transitions, nullable provenance, and pre-index dedup', () => {
        const sql = fs.readFileSync(
            path.join(__dirname, '../../database/migrations/20261126_enterprise_remediation.sql'),
            'utf8'
        );
        assert.ok(sql.includes('FIRST_VALUE(id) OVER'));
        assert.ok(sql.includes('COALESCE(v_row.vulnerability_level, 0) < 25'));
        assert.ok(sql.includes('COALESCE(v_row.dependency_score, 0) < 20'));
        assert.ok(sql.includes('COALESCE(v_row.trust_level, 0) < 5'));
        assert.equal(/ADD COLUMN IF NOT EXISTS embedding_provider TEXT DEFAULT/i.test(sql), false);
        assert.ok(sql.includes('p_embedding_provider text DEFAULT NULL'));
        assert.ok(sql.includes('AND (p_embedding_provider IS NULL OR me.embedding_provider = p_embedding_provider)'));
    });

    await t.test('POST /api/chat/stream refunds reserved daily quota when persistence fails after SSE headers sent', async () => {
        const chatRoutes = (await import('../src/routes/chat.routes.js')).default;
        const origGetUser = supabaseAdmin.auth.getUser;
        const origFrom = supabaseAdmin.from;
        const origRpc = supabaseAdmin.rpc;

        const userId = '22222222-2222-4222-8222-222222222222';
        let refunded = false;

        supabaseAdmin.auth.getUser = async () => ({
            data: { user: { id: userId, email: 'stream@twingenie.app', role: 'authenticated' } },
            error: null,
        });
        supabaseAdmin.rpc = async (fn) => {
            if (fn === 'reserve_daily_quota') return { data: { allowed: true, current: 1 }, error: null };
            if (fn === 'get_engagement_state') return { data: [{ current_state: 'new_user', total_messages: 1 }], error: null };
            return { data: null, error: null };
        };
        supabaseAdmin.from = (table) => {
            if (table === 'usage_tracking') {
                return {
                    select() { return this; },
                    eq() { return this; },
                    async maybeSingle() { return { data: { id: 'ut-refund', count: 1 }, error: null }; },
                    update(payload) {
                        if (payload.count === 0) refunded = true;
                        return { eq() { return this; }, then(cb) { return Promise.resolve(cb({ error: null })); } };
                    },
                };
            }
            if (table === 'conversations') {
                return {
                    select() { return this; },
                    eq() { return this; },
                    order() { return this; },
                    limit: async () => ({ data: [{ id: '33333333-3333-4333-8333-333333333333' }], error: null }),
                };
            }
            if (table === 'chat_history') {
                return {
                    select() { return this; },
                    eq() { return this; },
                    order() { return this; },
                    limit: async () => ({ data: [], error: null }),
                    insert() {
                        return {
                            async select() {
                                return { data: null, error: { message: 'simulated insert failure' } };
                            },
                        };
                    },
                };
            }
            if (table === 'personality_profiles') {
                return {
                    select() { return this; },
                    eq() { return this; },
                    single: async () => ({ data: { personality_json: { traits: [] } }, error: null }),
                    maybeSingle: async () => ({ data: { personality_json: { traits: [] } }, error: null }),
                };
            }
            return {
                select() { return this; },
                eq() { return this; },
                order() { return this; },
                limit() { return this; },
                upsert: async () => ({ error: null }),
                insert: async () => ({ error: null }),
                single: async () => ({ data: null, error: null }),
                maybeSingle: async () => ({ data: null, error: null }),
            };
        };

        try {
            await new Promise((resolve) => {
                const sseChunks = [];
                const req = {
                    method: 'POST',
                    url: '/stream',
                    originalUrl: '/api/chat/stream',
                    headers: { authorization: 'Bearer stream.jwt.token' },
                    body: { message: 'hi' }, // pure greeting -> fast deterministic stream yield without live LLM call
                    ip: '127.0.0.1',
                };
                const res = {
                    statusCode: 200,
                    writeHead(code) { this.statusCode = code; },
                    write(chunk) { sseChunks.push(chunk); },
                    end() { resolve({ sseChunks }); },
                    status(code) { this.statusCode = code; return this; },
                    json(d) { resolve({ status: this.statusCode, d }); },
                };
                chatRoutes(req, res, () => resolve({ nextCalled: true }));
            });
            assert.equal(refunded, true);
        } finally {
            supabaseAdmin.auth.getUser = origGetUser;
            supabaseAdmin.from = origFrom;
            supabaseAdmin.rpc = origRpc;
        }
    });

    await t.test('permits admin authentication headers in CORS preflight for browser admin dashboard', async () => {
        const { default: app } = await import('../src/server.js');
        const resHeaders = {};
        let ended = false;
        let statusCode = 200;
        const req = {
            method: 'OPTIONS',
            url: '/api/admin/stats',
            originalUrl: '/api/admin/stats',
            headers: {
                origin: 'https://www.twingenie.app',
                'access-control-request-method': 'GET',
                'access-control-request-headers': 'authorization,content-type,x-admin-key,x-admin-password,x-admin-secret',
            },
            ip: '127.0.0.1',
            socket: { remoteAddress: '127.0.0.1' },
        };
        const res = {
            setHeader(k, v) { resHeaders[String(k).toLowerCase()] = v; },
            getHeader(k) { return resHeaders[String(k).toLowerCase()]; },
            removeHeader(k) { delete resHeaders[String(k).toLowerCase()]; },
            writeHead(code) { statusCode = code; this.statusCode = code; },
            status(code) { statusCode = code; this.statusCode = code; return this; },
            end() { ended = true; },
            send() { ended = true; },
        };

        await new Promise((resolve) => {
            res.end = () => { ended = true; resolve(); };
            res.send = () => { ended = true; resolve(); };
            app(req, res, () => resolve());
        });

        assert.equal(ended, true);
        assert.equal(res.statusCode, 204);
        const allowHeaders = String(resHeaders['access-control-allow-headers'] || '').toLowerCase();
        assert.ok(allowHeaders.includes('x-admin-key'), `expected x-admin-key in ${allowHeaders}`);
        assert.ok(allowHeaders.includes('x-admin-password'), `expected x-admin-password in ${allowHeaders}`);
        assert.ok(allowHeaders.includes('x-admin-secret'), `expected x-admin-secret in ${allowHeaders}`);
    });

    await t.test('deleteUserAccount cascades memory_anniversaries by memory_id without 42703 user_id error', async () => {
        const { deleteUserAccount } = await import('../src/services/accountDeletionService.js');
        const ops = [];
        const db = {
            from(table) {
                return {
                    select() {
                        return {
                            eq(col, val) {
                                ops.push({ op: 'select', table, col, val });
                                if (table === 'shared_memories') {
                                    return Promise.resolve({ data: [{ id: 'mem-1' }], error: null });
                                }
                                if (table === 'memory_anniversaries') {
                                    throw new Error('Should not select memory_anniversaries');
                                }
                                return Promise.resolve({ data: [], error: null });
                            },
                        };
                    },
                    delete() {
                        return {
                            eq(col, val) {
                                ops.push({ op: 'delete_eq', table, col, val });
                                if (table === 'memory_anniversaries' && col === 'user_id') {
                                    return Promise.resolve({
                                        error: { code: '42703', message: 'column memory_anniversaries.user_id does not exist' },
                                    });
                                }
                                return Promise.resolve({ error: null });
                            },
                            in(col, vals) {
                                ops.push({ op: 'delete_in', table, col, vals });
                                return Promise.resolve({ error: null });
                            },
                        };
                    },
                };
            },
        };
        const storage = { from: () => ({ list: async () => ({ data: [], error: null }), remove: async () => ({ error: null }) }) };
        const authAdmin = { async deleteUser() { return { error: null }; } };

        const res = await deleteUserAccount({ userId: 'user-cascade-test', db, storage, authAdmin });
        assert.equal(res.success, true);
        assert.ok(
            ops.some((o) => o.op === 'delete_in' && o.table === 'memory_anniversaries' && o.col === 'memory_id' && o.vals.includes('mem-1'))
        );
        assert.equal(ops.some((o) => o.table === 'memory_anniversaries' && o.col === 'user_id'), false);
    });
});
