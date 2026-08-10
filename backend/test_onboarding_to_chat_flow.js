import { supabaseAdmin } from './src/config/supabase.js';
import { getUserPersonalityProfile, generatePersonalityDirectives } from './src/services/personalityStyleLayer.js';
import { generateChatResponse } from './src/services/chatEngine.js';
import dotenv from 'dotenv';
dotenv.config();

process.env.PERSONALITY_STYLE_LAYER_ENABLED = 'true';

async function testFullOnboardingToChatFlow() {
    console.log('🧪 RUNNING FULL ONBOARDING -> MULTI-SELECT -> PROFILE -> CHAT E2E TEST\n');

    try {
        // Step 1: Simulate Onboarding submission with multi-select choices
        const testUserId = 'da55e47a-a913-4d5c-b83b-ef135db4505b'; // Known test user
        console.log(`📌 STEP 1: Simulating multi-select submission for user ${testUserId}...`);

        const multiSelectAnswers = [
            {
                user_id: testUserId,
                question_id: 4, // Interests (multi-select)
                selected_option: 'Technology, Reading, Travel',
                answer_text: null
            },
            {
                user_id: testUserId,
                question_id: 8, // Core Values (multi-select)
                selected_option: 'Honesty, Creativity, Independence',
                answer_text: null
            }
        ];

        const { error: upsertErr } = await supabaseAdmin
            .from('personality_answers')
            .upsert(multiSelectAnswers, { onConflict: 'user_id,question_id' });

        if (upsertErr) {
            console.error('❌ Error saving multi-select answers:', upsertErr);
            process.exit(1);
        }
        console.log('  ✅ PASS: Multi-select answers saved to personality_answers table!');

        // Step 2: Simulate generated personality_profile with core_values array
        console.log('\n📌 STEP 2: Verifying/Updating personality_profile with core_values...');
        const mockProfileJson = {
            summary: "Creative and independent thinker who values honesty and freedom.",
            big_five: {
                openness: 85,
                conscientiousness: 75,
                extraversion: 40,
                agreeableness: 60,
                emotional_stability: 70
            },
            core_values: ["Honesty", "Creativity", "Independence"],
            communication_style: {
                directness: "direct",
                tone: "warm and honest"
            },
            decision_making: {
                style: "analytical"
            }
        };

        const { error: profileErr } = await supabaseAdmin
            .from('personality_profiles')
            .upsert({
                user_id: testUserId,
                personality_json: mockProfileJson,
                twin_name: "TwinGenie Test Twin",
                twin_summary: mockProfileJson.summary,
                updated_at: new Date().toISOString()
            });

        if (profileErr) {
            console.error('❌ Error upserting personality_profile:', profileErr);
            process.exit(1);
        }
        console.log('  ✅ PASS: Generated personality profile stored with core_values!');

        // Step 3: Call chat pipeline and verify directives
        console.log('\n📌 STEP 3: Executing live chat personalization pipeline...');
        const normalized = await getUserPersonalityProfile(testUserId);
        const directives = generatePersonalityDirectives(normalized, 'neutral', 'low', 50);

        console.log('\n--- Generated System Directives for Onboarded User ---');
        console.log(directives);
        console.log('------------------------------------------------------\n');

        if (!directives.includes('Honesty') || !directives.includes('Creativity') || !directives.includes('Independence')) {
            console.error('❌ FAIL: Directives missing multi-select core values!');
            process.exit(1);
        }
        console.log('  ✅ PASS: All multi-select core values (Honesty, Creativity, Independence) present in system prompt!');

        // Step 4: Execute live chat call
        console.log('\n📌 STEP 4: Calling generateChatResponse()...');
        const response = await generateChatResponse(
            testUserId,
            "How should I structure my work today?",
            "companion",
            directives,
            null
        );

        console.log('\n--- Live AI Response ---');
        console.log(response.message || response);
        console.log('------------------------\n');

        console.log('✅ PASS: Complete Onboarding -> Multi-select -> Profile -> Chat E2E test passed successfully!');
        process.exit(0);

    } catch (e) {
        console.error('❌ FAIL: Onboarding to Chat E2E Test threw exception:', e);
        process.exit(1);
    }
}

testFullOnboardingToChatFlow();
