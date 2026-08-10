import {
    normalizePersonalityProfile,
    getDefaultPersonalityProfile,
    generatePersonalityDirectives
} from './src/services/personalityStyleLayer.js';

console.log('🧪 RUNNING PERSONALITY STYLE LAYER TEST SUITE\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ PASS: ${message}`);
        passCount++;
    } else {
        console.error(`  ❌ FAIL: ${message}`);
        failCount++;
    }
}

// Ensure Feature Flag is Enabled for testing
process.env.PERSONALITY_STYLE_LAYER_ENABLED = 'true';

// TEST 1: Profile A (High Conscientiousness, Low Extraversion)
console.log('--- TEST 1: Profile A (High Conscientiousness, Low Extraversion) ---');
const rawA = {
    big_five: { openness: 50, conscientiousness: 85, extraversion: 20, agreeableness: 50, emotional_stability: 60 },
    core_values: ['Structure', 'Efficiency'],
    communication_style: { directness: 'direct' },
    decision_making: { style: 'analytical' }
};
const normalizedA = normalizePersonalityProfile(rawA);
assert(normalizedA.big_five.conscientiousness === 0.85, 'Conscientiousness normalized to 0.85');
assert(normalizedA.big_five.extraversion === 0.20, 'Extraversion normalized to 0.20');

const directivesA = generatePersonalityDirectives(normalizedA, 'neutral', 'low', 50);
assert(directivesA.includes('<user_personality_profile>'), 'Contains XML delimiter start');
assert(directivesA.includes('High CONSCIENTIOUSNESS'), 'Contains High Conscientiousness directive');
assert(directivesA.includes('Low EXTRAVERSION'), 'Contains Low Extraversion directive');
assert(directivesA.includes('Structure'), 'Contains core value Structure');

// TEST 2: Profile B (High Openness, Multi-Select Core Values)
console.log('\n--- TEST 2: Profile B (High Openness, Multi-Select Core Values) ---');
const rawB = {
    big_five: { openness: 90, conscientiousness: 40, extraversion: 70, agreeableness: 80, emotional_stability: 90 },
    core_values: ['Freedom', 'Achievement', 'Loyalty', 'Honesty'],
    communication_style: { directness: 'assertive' },
    decision_making: { style: 'intuitive' }
};
const normalizedB = normalizePersonalityProfile(rawB);
assert(normalizedB.big_five.openness === 0.90, 'Openness normalized to 0.90');
assert(normalizedB.big_five.neuroticism === 0.10, 'Neuroticism correctly computed from emotional_stability 90 (100 - 90 = 10%)');
assert(normalizedB.coreValues.length === 4, 'All 4 multi-select core values extracted');

const directivesB = generatePersonalityDirectives(normalizedB, 'excited', 'high', 80);
assert(directivesB.includes('High OPENNESS'), 'Contains High Openness directive');
assert(directivesB.includes('Freedom'), 'Contains core value Freedom');
assert(directivesB.includes('Achievement'), 'Contains core value Achievement');
assert(directivesB.includes('EMOTIONAL STATE (EXCITED)'), 'Contains Excited emotional state directive');

// TEST 3: Profile C (Null / Missing Profile Fallback)
console.log('\n--- TEST 3: Profile C (Null / Missing Profile Fallback) ---');
const normalizedC = normalizePersonalityProfile(null);
assert(normalizedC.big_five.openness === 0.5, 'Fallback openness is 0.5');
assert(normalizedC.coreValues.length === 0, 'Fallback core values is empty array');

const directivesC = generatePersonalityDirectives(normalizedC, 'neutral', 'low', 50);
assert(directivesC.includes('<user_personality_profile>'), 'Generates valid XML frame even for default profile');
assert(!directivesC.includes('TRAIT SIGNALS'), 'Does not generate extreme trait signals for neutral 0.5 scores');

// TEST 4: Profile D (Conflicting Preferences Resolution)
console.log('\n--- TEST 4: Profile D (Conflicting Preferences Resolution) ---');
const rawD = {
    big_five: { openness: 85, conscientiousness: 85, extraversion: 20, agreeableness: 20, emotional_stability: 30 },
    core_values: ['Independence', 'Collaboration'],
    communication_style: { directness: 'indirect' },
    decision_making: { style: 'logic_based' }
};
const normalizedD = normalizePersonalityProfile(rawD);
const directivesD = generatePersonalityDirectives(normalizedD, 'stressed', 'medium', 40);
assert(directivesD.includes('5-TIER HIERARCHY RULES'), 'Includes explicit 5-tier priority hierarchy rules');
assert(directivesD.includes('EMOTIONAL STATE (STRESSED)'), 'Stressed emotional state takes precedence over personality preferences');

// TEST 5: Profile E (Malformed / Partial JSON Fields)
console.log('\n--- TEST 5: Profile E (Malformed / Partial JSON Fields) ---');
const rawE = {
    big_five: { openness: null, conscientiousness: undefined, extraversion: 'invalid' },
    core_values: 'not_an_array',
    communication_style: null
};
const normalizedE = normalizePersonalityProfile(rawE);
assert(normalizedE.big_five.openness === 0.5, 'Handles null openness gracefully with 0.5 fallback');
assert(normalizedE.big_five.conscientiousness === 0.5, 'Handles undefined conscientiousness gracefully with 0.5 fallback');
assert(normalizedE.coreValues.length === 0, 'Handles non-array core_values gracefully without throwing error');

// TEST 6: Feature Flag Test
console.log('\n--- TEST 6: Feature Flag Test (PERSONALITY_STYLE_LAYER_ENABLED=false) ---');
process.env.PERSONALITY_STYLE_LAYER_ENABLED = 'false';
const directivesF = generatePersonalityDirectives(normalizedB);
assert(directivesF === '', 'Returns empty string when feature flag is disabled');

console.log(`\n========================================`);
console.log(`TEST RESULTS: ${passCount} Passed, ${failCount} Failed`);
console.log(`========================================\n`);

if (failCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
