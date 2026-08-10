import { performance } from 'perf_hooks';
import { supabaseAdmin } from '../src/config/supabase.js';
import { getUserEngagementState, trackMessage } from '../src/services/behavioralEngine.js';
import { getEmotionalMetrics, detectEmotionalEvents, detectEmotionalIntensity, getEmotionalBehaviorModifiers, getUserPersonalizationContext } from '../src/services/emotionalStateEngine.js';
import { getUserPersonalityProfile, generatePersonalityDirectives, detectEmotionalState, getIntensityLevel } from '../src/services/personalityStyleLayer.js';
import { getUserStyleMode } from '../src/services/emotionalStyleAdapter.js';
import { generateChatResponse } from '../src/services/chatEngine.js';
import dotenv from 'dotenv';
dotenv.config();

process.env.PERSONALITY_STYLE_LAYER_ENABLED = 'true';

async function measureLiveChatPipeline() {
    console.log('⏱️ RUNNING EMPIRICAL COMPARATIVE LATENCY BENCHMARK FOR CHAT PIPELINE\n');

    try {
        const { data: users } = await supabaseAdmin.from('users').select('id').limit(1);
        if (!users || users.length === 0) {
            console.error('❌ No user found for benchmark');
            process.exit(1);
        }
        const userId = users[0].id;
        const testMessage = "I am thinking about starting a new project. What should I do?";

        console.log(`Test User ID: ${userId}`);
        console.log(`Test Message: "${testMessage}"\n`);

        // --- BENCHMARK A: SERIAL QUERIES ---
        const t_serial_start = performance.now();
        await getUserEngagementState(userId);
        await trackMessage(userId, testMessage, false, false);
        await getEmotionalMetrics(userId);
        await getUserPersonalizationContext(userId);
        await getUserPersonalityProfile(userId);
        await getUserStyleMode(userId);
        const t_serial_end = performance.now();
        const serialMs = t_serial_end - t_serial_start;

        // --- BENCHMARK B: PARALLEL PROMISE.ALL QUERIES ---
        const t_parallel_start = performance.now();
        const [
            _trackRes,
            emotionalMetrics,
            userContext,
            personalityProfile,
            styleMode
        ] = await Promise.all([
            trackMessage(userId, testMessage, false, false),
            getEmotionalMetrics(userId),
            getUserPersonalizationContext(userId),
            getUserPersonalityProfile(userId),
            getUserStyleMode(userId)
        ]);
        const t_parallel_end = performance.now();
        const parallelMs = t_parallel_end - t_parallel_start;

        // LLM Generation Benchmark
        const t_llm_start = performance.now();
        const response = await generateChatResponse(
            userId,
            testMessage,
            'companion',
            'test_directives',
            null
        );
        const t_llm_end = performance.now();
        const llmMs = t_llm_end - t_llm_start;

        console.log('📊 MEASURED COMPARATIVE TIMINGS (Empirical Milliseconds):');
        console.log(`  1. Serial Pre-LLM DB Queries (Original) : ${serialMs.toFixed(2)} ms (${(serialMs / 1000).toFixed(2)}s)`);
        console.log(`  2. Parallel Pre-LLM DB Queries (Optimized): ${parallelMs.toFixed(2)} ms (${(parallelMs / 1000).toFixed(2)}s)`);
        console.log(`  ─────────────────────────────────────────────────────────────`);
        console.log(`  ⚡ NET DB OVERHEAD SAVED                    : ${(serialMs - parallelMs).toFixed(2)} ms (${((serialMs - parallelMs) / 1000).toFixed(2)}s reduction!)`);
        console.log(`  3. LLM Provider Generation Time            : ${llmMs.toFixed(2)} ms (${(llmMs / 1000).toFixed(2)}s)\n`);

        const newTotalBackendTime = parallelMs + llmMs;
        console.log(`  🎯 NEW TOTAL ESTIMATED BACKEND LATENCY     : ${newTotalBackendTime.toFixed(2)} ms (${(newTotalBackendTime / 1000).toFixed(2)} seconds)\n`);

        process.exit(0);
    } catch (e) {
        console.error('❌ Error during benchmark execution:', e);
        process.exit(1);
    }
}

measureLiveChatPipeline();
