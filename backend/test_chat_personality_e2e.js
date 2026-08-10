import { supabaseAdmin } from './src/config/supabase.js';
import { getUserPersonalityProfile, generatePersonalityDirectives } from './src/services/personalityStyleLayer.js';
import { generateChatResponse } from './src/services/chatEngine.js';
import dotenv from 'dotenv';
dotenv.config();

// Ensure feature flag is enabled
process.env.PERSONALITY_STYLE_LAYER_ENABLED = 'true';

async function runE2EIntegrationTest() {
    console.log('🧪 RUNNING END-TO-END CHAT PERSONALIZATION INTEGRATION TEST\n');

    try {
        // Step 1: Query a known user with a production personality profile
        console.log('📌 STEP 1: Querying user with existing personality_profile...');
        const { data: profiles, error } = await supabaseAdmin
            .from('personality_profiles')
            .select('user_id, twin_name, personality_json')
            .limit(1);

        if (error || !profiles || profiles.length === 0) {
            console.error('❌ Could not find test personality profile in DB:', error);
            process.exit(1);
        }

        const testProfileRecord = profiles[0];
        const userId = testProfileRecord.user_id;
        console.log(`  ✅ Selected Test User ID: ${userId}`);
        console.log(`  ✅ Twin Name: ${testProfileRecord.twin_name}`);
        console.log(`  ✅ Openness: ${testProfileRecord.personality_json?.big_five?.openness}`);
        console.log(`  ✅ Conscientiousness: ${testProfileRecord.personality_json?.big_five?.conscientiousness}`);
        console.log(`  ✅ Core Values:`, testProfileRecord.personality_json?.core_values);

        // Step 2: Test getUserPersonalityProfile and generatePersonalityDirectives pipeline
        console.log('\n📌 STEP 2: Executing getUserPersonalityProfile() & generatePersonalityDirectives()...');
        const normalizedProfile = await getUserPersonalityProfile(userId);
        console.log('  Normalized Profile Big Five:', normalizedProfile.big_five);
        console.log('  Normalized Core Values:', normalizedProfile.coreValues);

        const directives = generatePersonalityDirectives(normalizedProfile, 'neutral', 'low', 50);
        console.log('\n--- Generated System Directives snippet ---');
        console.log(directives);
        console.log('-------------------------------------------\n');

        if (!directives.includes('<user_personality_profile>')) {
            console.error('❌ FAIL: Directives do not contain <user_personality_profile> tag!');
            process.exit(1);
        }
        console.log('  ✅ PASS: Directives properly contain XML-delimited user personality profile!');

        // Step 3: Trigger live chat response generation using real AI engine
        console.log('\n📌 STEP 3: Triggering generateChatResponse() with test message...');
        const userMessage = "I am thinking about starting a new project. What should I do?";
        console.log(`  User Message: "${userMessage}"`);

        const chatResponse = await generateChatResponse(
            userId,
            userMessage,
            'companion',
            directives, // Pass personality directives into combinedModifiers
            null
        );

        console.log('\n--- Live AI Chat Response ---');
        console.log(chatResponse.message || chatResponse);
        console.log('-----------------------------\n');

        console.log('✅ PASS: Dynamic personality-aware chat personalization E2E integration test completed successfully!');
        process.exit(0);

    } catch (e) {
        console.error('❌ FAIL: E2E Integration Test threw exception:', e);
        process.exit(1);
    }
}

runE2EIntegrationTest();
