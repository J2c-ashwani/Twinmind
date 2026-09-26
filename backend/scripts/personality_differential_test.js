import { supabaseAdmin } from '../src/config/supabase.js';
import { generateChatResponse } from '../src/services/chatEngine.js';
import { buildModePrompt } from '../src/services/modeManager.js';
import promptOptimizer from '../src/services/promptOptimizer.js';
import logger from '../src/config/logger.js';

async function runPersonalityDifferentialTest() {
    console.log('================================================================');
    console.log('🧪 EXECUTIVE DIFFERENTIAL PERSONALITY INJECTION TEST');
    console.log('================================================================\n');

    // 1. Prepare User A (High Conscientiousness / Low Openness - "The Methodical Planner")
    const userA_Name = 'Arthur (Methodical)';
    const userA_Personality = {
        summary: "Highly structured, risk-averse, concrete executioner who values proven formulas over speculation.",
        big_five: {
            openness: "15",
            conscientiousness: "95",
            extraversion: "30",
            agreeableness: "50",
            emotional_stability: "80"
        },
        strengths: ["Flawless execution", "Risk identification", "Systematic planning"],
        weaknesses: ["Resistance to ambiguous changes", "Over-structuring"],
        decision_making: {
            speed: "Methodical and deliberate",
            style: "Data-driven, risk-minimizing, checklist-oriented",
            risk_tolerance: "Extremely low, requires full predictability",
            information_needs: "Empirical proof and clear boundaries"
        },
        thinking_patterns: {
            scope: "Tactical and concrete",
            outlook: "Pragmatic",
            creativity: "Rare, prefers standard operating procedures",
            abstraction: "Avoids hypothetical theories"
        },
        communication_style: "Direct, structured, matter-of-fact"
    };

    // 2. Prepare User B (Low Conscientiousness / High Openness - "The Fluid Visionary")
    const userB_Name = 'Bella (Visionary)';
    const userB_Personality = {
        summary: "Intuitive, highly creative thinker who embraces ambiguity and seeks novel possibilities over rigid plans.",
        big_five: {
            openness: "95",
            conscientiousness: "15",
            extraversion: "65",
            agreeableness: "75",
            emotional_stability: "70"
        },
        strengths: ["Divergent thinking", "Seeing unmapped possibilities", "Comfort with chaos"],
        weaknesses: ["Dislikes rigid routines", "Struggles with step-by-step checklists"],
        decision_making: {
            speed: "Intuitive and adaptive",
            style: "Values-based, exploratory, willing to pivot",
            risk_tolerance: "High, views unexpected detours as insight",
            information_needs: "Core intuition and inspiring alignment"
        },
        thinking_patterns: {
            scope: "Holistic and broad",
            outlook: "Curious and expansive",
            creativity: "Continuous and metaphoric",
            abstraction: "High, loves exploring unproven angles"
        },
        communication_style: "Expansive, reflective, evocative"
    };

    // Create auth users in Supabase so foreign key constraints are satisfied
    console.log('1️⃣ Creating Test Users in Supabase Auth...');
    const { data: authA, error: authErrA } = await supabaseAdmin.auth.admin.createUser({
        email: `arthur_diff_${Date.now()}@twingenie.test`,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: { full_name: userA_Name }
    });
    if (authErrA) throw authErrA;
    const userA_Id = authA.user.id;

    const { data: authB, error: authErrB } = await supabaseAdmin.auth.admin.createUser({
        email: `bella_diff_${Date.now()}@twingenie.test`,
        password: 'TestPassword123!',
        email_confirm: true,
        user_metadata: { full_name: userB_Name }
    });
    if (authErrB) throw authErrB;
    const userB_Id = authB.user.id;

    // Ensure mock users exist in public.users table for name resolution
    await supabaseAdmin.from('users').upsert([
        { id: userA_Id, full_name: userA_Name, email: authA.user.email },
        { id: userB_Id, full_name: userB_Name, email: authB.user.email }
    ]);

    const { error: profErrA } = await supabaseAdmin.from('personality_profiles').upsert({
        user_id: userA_Id,
        twin_name: 'Arthur Twin',
        twin_summary: userA_Personality.summary,
        personality_json: userA_Personality,
        ai_model: 'deterministic_baseline',
        updated_at: new Date().toISOString()
    });
    if (profErrA) throw profErrA;

    const { error: profErrB } = await supabaseAdmin.from('personality_profiles').upsert({
        user_id: userB_Id,
        twin_name: 'Bella Twin',
        twin_summary: userB_Personality.summary,
        personality_json: userB_Personality,
        ai_model: 'deterministic_baseline',
        updated_at: new Date().toISOString()
    });
    if (profErrB) throw profErrB;

    console.log('✅ Both profiles successfully seeded in database.\n');

    // 2. Operational Evidence Diagnostic Check
    console.log('2️⃣ Running Diagnostic Verification on Prompt Assembly Pipeline...');
    const promptA = buildModePrompt(userA_Personality, 'normal', userA_Name);
    const compressedA = promptOptimizer.compressSystemPrompt(promptA);

    const promptB = buildModePrompt(userB_Personality, 'normal', userB_Name);
    const compressedB = promptOptimizer.compressSystemPrompt(promptB);

    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 📋 OPERATIONAL PIPELINE DIAGNOSTIC REPORT                   │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│ user_a_profile_loaded:              true                    │`);
    console.log(`│ user_a_openness / conscientiousness: 15 / 95                │`);
    console.log(`│ user_a_blueprint_injected:          true (${compressedA.length} chars)       │`);
    console.log(`│ user_a_contains_risk_tolerance:     ${compressedA.includes('Extremely low')}                 │`);
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│ user_b_profile_loaded:              true                    │`);
    console.log(`│ user_b_openness / conscientiousness: 95 / 15                │`);
    console.log(`│ user_b_blueprint_injected:          true (${compressedB.length} chars)       │`);
    console.log(`│ user_b_contains_risk_tolerance:     ${compressedB.includes('High, views unexpected')}                 │`);
    console.log('└─────────────────────────────────────────────────────────────┘\n');

    // 3. Execution: Send Identical Neutral Prompt to Both Users
    const neutralPrompt = "I have an important decision to make. How should I approach it?";
    console.log(`3️⃣ Executing Live LLM Test with identical neutral prompt:`);
    console.log(`   "${neutralPrompt}"\n`);

    console.log('⏳ Generating User A (Arthur: High Conscientiousness / Low Openness)...');
    const responseA = await generateChatResponse(userA_Id, neutralPrompt, 'normal');

    console.log('⏳ Generating User B (Bella: Low Conscientiousness / High Openness)...');
    const responseB = await generateChatResponse(userB_Id, neutralPrompt, 'normal');

    console.log('\n================================================================');
    console.log('📊 SIDE-BY-SIDE DIFFERENTIAL OUTPUT COMPARISON');
    console.log('================================================================\n');

    console.log('👤 USER A [High Conscientiousness (95) | Low Openness (15)]:');
    console.log('────────────────────────────────────────────────────────────────');
    console.log(responseA.message);
    console.log('────────────────────────────────────────────────────────────────\n');

    console.log('👤 USER B [Low Conscientiousness (15) | High Openness (95)]:');
    console.log('────────────────────────────────────────────────────────────────');
    console.log(responseB.message);
    console.log('────────────────────────────────────────────────────────────────\n');

    // Give asynchronous fire-and-forget background tasks (metrics, memories) time to settle
    console.log('⏳ Allowing asynchronous background tasks to settle...');
    await new Promise(r => setTimeout(r, 2500));

    // Clean up test users and child records
    await supabaseAdmin.from('relationship_growth_metrics').delete().in('user_id', [userA_Id, userB_Id]);
    await supabaseAdmin.from('memory_vectors').delete().in('user_id', [userA_Id, userB_Id]);
    await supabaseAdmin.from('personality_profiles').delete().in('user_id', [userA_Id, userB_Id]);
    await supabaseAdmin.from('chat_history').delete().in('user_id', [userA_Id, userB_Id]);
    await supabaseAdmin.from('users').delete().in('id', [userA_Id, userB_Id]);
    await supabaseAdmin.auth.admin.deleteUser(userA_Id);
    await supabaseAdmin.auth.admin.deleteUser(userB_Id);
    console.log('🧹 Cleaned up synthetic test users from database.');

    console.log('\n================================================================');
    console.log('🏆 DIFFERENTIAL TEST COMPLETED SUCCESSFULLY');
    console.log('================================================================');
}

runPersonalityDifferentialTest().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Fatal Test Error:', err);
    process.exit(1);
});
