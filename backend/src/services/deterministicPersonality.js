/**
 * deterministicPersonality.js
 * 
 * Computes an authentic, scientifically-grounded Big Five (OCEAN) personality profile
 * directly from the user's 35 onboarding questionnaire answers.
 * 
 * DESIGN PRINCIPLE:
 * Real user answers -> Deterministic scoring algorithm -> Valid personality profile.
 * AI availability must NEVER block a user from having an active, personalized Twin.
 */

export function calculateDeterministicPersonality(answers, userData = {}) {
    const userName = userData.name || 'User';
    
    // Build answer map: question_id -> { option, text }
    const answerMap = {};
    if (Array.isArray(answers)) {
        answers.forEach(a => {
            const qId = a.question_id || a.questionId || (typeof a.question === 'number' ? a.question : null);
            const opt = (a.selected_option || a.selectedOption || a.answer || '').toString().trim();
            const text = (a.answer_text || a.answerText || '').toString().trim();
            if (qId) {
                answerMap[qId] = { option: opt, text: text };
            }
        });
    }

    // Helper to get answer option safely
    const getOpt = (id) => (answerMap[id]?.option || '').toLowerCase();
    const getText = (id) => answerMap[id]?.text || '';

    // =========================================================================
    // 1. BIG FIVE (OCEAN) SCORING (Scale 10 - 95, neutral baseline 50)
    // =========================================================================
    let openness = 50;
    let conscientiousness = 50;
    let extraversion = 50;
    let agreeableness = 50;
    let emotionalStability = 50; // Low Neuroticism

    // --- OPENNESS TO EXPERIENCE ---
    // Q1: Approach new experiences
    if (getOpt(1).includes('curious') || getOpt(1).includes('excited')) openness += 18;
    else if (getOpt(1).includes('cautious')) openness += 6;
    else if (getOpt(1).includes('familiar')) openness -= 12;
    else if (getOpt(1).includes('avoid')) openness -= 20;

    // Q8: Problem solving
    if (getOpt(8).includes('creativity') || getOpt(8).includes('ideas')) openness += 14;
    else if (getOpt(8).includes('mix')) openness += 6;
    else if (getOpt(8).includes('logic')) openness += 2;

    // Q12: Exploring new ideas/cultures
    if (getOpt(12).includes('yes') || getOpt(12).includes('very')) openness += 16;
    else if (getOpt(12).includes('sometimes')) openness += 5;
    else if (getOpt(12).includes('no') || getOpt(12).includes('rarely')) openness -= 15;

    // Q13: Abstract thinking / philosophy
    if (getOpt(13).includes('yes') || getOpt(13).includes('love')) openness += 14;
    else if (getOpt(13).includes('sometimes')) openness += 4;
    else if (getOpt(13).includes('no') || getOpt(13).includes('prefer')) openness -= 12;

    // Q14: Daydreaming
    if (getOpt(14).includes('often') || getOpt(14).includes('frequently')) openness += 8;
    else if (getOpt(14).includes('rarely')) openness -= 6;

    // --- CONSCIENTIOUSNESS ---
    // Q6: Organized day-to-day
    if (getOpt(6).includes('very organized')) conscientiousness += 22;
    else if (getOpt(6).includes('somewhat')) conscientiousness += 8;
    else if (getOpt(6).includes('pressure')) conscientiousness += 0;
    else if (getOpt(6).includes('not organized')) conscientiousness -= 18;

    // Q7: Procrastination
    if (getOpt(7).includes('rarely')) conscientiousness += 20;
    else if (getOpt(7).includes('sometimes')) conscientiousness += 4;
    else if (getOpt(7).includes('often')) conscientiousness -= 14;
    else if (getOpt(7).includes('almost always')) conscientiousness -= 22;

    // Q9: Plan or improvise
    if (getOpt(9).includes('detail') || getOpt(9).includes('plan everything')) conscientiousness += 18;
    else if (getOpt(9).includes('rough')) conscientiousness += 6;
    else if (getOpt(9).includes('improvise')) conscientiousness -= 10;
    else if (getOpt(9).includes('spontaneous')) conscientiousness -= 18;

    // Q10: Perfectionism
    if (getOpt(10).includes('very important')) conscientiousness += 12;
    else if (getOpt(10).includes('somewhat')) conscientiousness += 4;
    else if (getOpt(10).includes('not important')) conscientiousness -= 10;

    // Q11: Project execution
    if (getOpt(11).includes('step') || getOpt(11).includes('plan')) conscientiousness += 12;
    else if (getOpt(11).includes('burst')) conscientiousness += 2;
    else if (getOpt(11).includes('deadline')) conscientiousness -= 6;

    // --- EXTRAVERSION ---
    // Q3: Recharging
    if (getOpt(3).includes('group')) extraversion += 22;
    else if (getOpt(3).includes('friends')) extraversion += 12;
    else if (getOpt(3).includes('hobbies')) extraversion -= 4;
    else if (getOpt(3).includes('alone')) extraversion -= 20;

    // Q4: Social situations
    if (getOpt(4).includes('start')) extraversion += 22;
    else if (getOpt(4).includes('wait')) extraversion += 0;
    else if (getOpt(4).includes('familiar')) extraversion -= 12;
    else if (getOpt(4).includes('avoid')) extraversion -= 24;

    // Q5: Social energy
    if (getOpt(5).includes('high')) extraversion += 20;
    else if (getOpt(5).includes('medium')) extraversion += 6;
    else if (getOpt(5).includes('depends')) extraversion += 0;
    else if (getOpt(5).includes('low')) extraversion -= 20;

    // --- AGREEABLENESS ---
    // Q28: In relationships
    if (getOpt(28).includes('giving') || getOpt(28).includes('empathetic')) agreeableness += 18;
    else if (getOpt(28).includes('collaborative')) agreeableness += 12;
    else if (getOpt(28).includes('independent')) agreeableness += 2;
    else if (getOpt(28).includes('guarded')) agreeableness -= 12;

    // Q29: When someone hurts you
    if (getOpt(29).includes('talk') || getOpt(29).includes('forgive')) agreeableness += 18;
    else if (getOpt(29).includes('distance')) agreeableness += 0;
    else if (getOpt(29).includes('cut them off')) agreeableness -= 16;

    // Q30: Naturally trust people
    if (getOpt(30).includes('yes')) agreeableness += 16;
    else if (getOpt(30).includes('sometimes') || getOpt(30).includes('cautious')) agreeableness += 4;
    else if (getOpt(30).includes('no') || getOpt(30).includes('rarely')) agreeableness -= 16;

    // --- EMOTIONAL STABILITY (Inverse Neuroticism) ---
    // Q2: When plans change suddenly
    if (getOpt(2).includes('excited')) emotionalStability += 16;
    else if (getOpt(2).includes('neutral')) emotionalStability += 12;
    else if (getOpt(2).includes('annoyed')) emotionalStability -= 6;
    else if (getOpt(2).includes('stressed')) emotionalStability -= 16;

    // Q15: When stressed
    if (getOpt(15).includes('solution') || getOpt(15).includes('fix')) emotionalStability += 16;
    else if (getOpt(15).includes('distract')) emotionalStability += 4;
    else if (getOpt(15).includes('overthink')) emotionalStability -= 14;
    else if (getOpt(15).includes('shut down') || getOpt(15).includes('freeze')) emotionalStability -= 20;

    // Q17: Intensity of emotions
    if (getOpt(17).includes('calm') || getOpt(17).includes('steady')) emotionalStability += 18;
    else if (getOpt(17).includes('moderate')) emotionalStability += 6;
    else if (getOpt(17).includes('intense')) emotionalStability -= 12;
    else if (getOpt(17).includes('very intense')) emotionalStability -= 20;

    // Q18: When something goes wrong
    if (getOpt(18).includes('solution') || getOpt(18).includes('analyze')) emotionalStability += 14;
    else if (getOpt(18).includes('frustrated')) emotionalStability -= 10;
    else if (getOpt(18).includes('blame')) emotionalStability -= 18;

    // Q20: Anxiety/sadness frequency
    if (getOpt(20).includes('rarely')) emotionalStability += 20;
    else if (getOpt(20).includes('sometimes')) emotionalStability += 4;
    else if (getOpt(20).includes('often') || getOpt(20).includes('frequently')) emotionalStability -= 16;
    else if (getOpt(20).includes('almost always')) emotionalStability -= 24;

    // Clamp all traits to 15-95 range
    const clamp = (val) => Math.max(15, Math.min(95, Math.round(val)));
    openness = clamp(openness);
    conscientiousness = clamp(conscientiousness);
    extraversion = clamp(extraversion);
    agreeableness = clamp(agreeableness);
    emotionalStability = clamp(emotionalStability);

    // =========================================================================
    // 2. DECISION MAKING & MOTIVATIONS
    // =========================================================================
    const decisionSpeed = getOpt(23).includes('quick') ? 'Decisive' : 
                          getOpt(23).includes('slow') ? 'Deliberate & Analytical' : 'Situational';
    const decisionStyle = getOpt(22).includes('logic') ? 'Rational & Analytical' :
                          getOpt(22).includes('intuition') ? 'Intuitive & Gut-driven' :
                          getOpt(22).includes('advice') ? 'Consultative & Collaborative' : 'Balanced';
    const riskTolerance = getOpt(24).includes('comfortable') || getOpt(24).includes('high') ? 'High' :
                          getOpt(24).includes('depends') ? 'Calculated' : 'Risk-averse';

    const coreValues = [];
    if (getOpt(26).length > 0) coreValues.push(answerMap[26]?.option);
    if (getOpt(31).length > 0) coreValues.push(`Preserving ${answerMap[31]?.option}`);
    if (coreValues.length === 0) coreValues.push('Growth', 'Authenticity', 'Independence');

    const motivations = [];
    if (getOpt(25).length > 0) motivations.push(answerMap[25]?.option);
    if (getOpt(27).length > 0) motivations.push(answerMap[27]?.option);
    if (motivations.length === 0) motivations.push('Personal Achievement', 'Meaningful Impact');

    // =========================================================================
    // 3. STRENGTHS & VULNERABILITIES
    // =========================================================================
    const strengths = [];
    if (openness >= 65) strengths.push('High curiosity and creative problem-solving');
    if (conscientiousness >= 65) strengths.push('Strong focus, disciplined execution, and reliability');
    if (extraversion >= 60) strengths.push('Natural social connector and expressive communicator');
    if (agreeableness >= 60) strengths.push('High empathy, loyalty, and relationship depth');
    if (emotionalStability >= 65) strengths.push('High emotional resilience under pressure');
    if (strengths.length < 3) {
        strengths.push('Independent thinker with clear personal values');
        strengths.push('Adaptable and introspective mindset');
    }

    const weaknesses = [];
    if (conscientiousness < 45) weaknesses.push('Tendency to procrastinate on routine administrative tasks');
    if (emotionalStability < 45) weaknesses.push('Susceptibility to overthinking and intense emotional triggers');
    if (agreeableness < 40) weaknesses.push('Guarded boundaries; quick to cut off relationships when trust wavers');
    if (extraversion < 40) weaknesses.push('Can withdraw when socially overwhelmed');
    if (getText(33).length > 0 && !getText(33).toLowerCase().includes("don't know")) {
        weaknesses.push(getText(33));
    } else if (weaknesses.length < 2) {
        weaknesses.push('Demands full clarity before committing to complex choices');
    }

    // =========================================================================
    // 4. EMOTIONAL & COMMUNICATION DIRECTIVES
    // =========================================================================
    const emotionalTriggers = [];
    if (getOpt(16).length > 0) emotionalTriggers.push(answerMap[16]?.option);
    if (getOpt(19).length > 0) emotionalTriggers.push(answerMap[19]?.option);
    if (getOpt(34).length > 0) emotionalTriggers.push(answerMap[34]?.option);
    if (emotionalTriggers.length === 0) emotionalTriggers.push('Injustice', 'Being ignored', 'Dishonesty');

    const stressResponse = getOpt(15).includes('overthink') ? 'Overthinking and mental replay' :
                           getOpt(15).includes('distract') ? 'Distraction and task switching' :
                           getOpt(15).includes('solution') ? 'Active solution seeking' : 'Reflection';

    const attachmentStyle = getOpt(28).includes('independent') ? 'Independent & Self-reliant' :
                            getOpt(28).includes('giving') ? 'Deeply bonded & Empathetic' : 'Selective & Thoughtful';

    // =========================================================================
    // 5. NARRATIVE TWIN SUMMARY
    // =========================================================================
    const opennessLabel = openness >= 70 ? 'highly creative and exploratory' : openness >= 50 ? 'open-minded and pragmatic' : 'grounded and traditional';
    const energyLabel = extraversion >= 65 ? 'socially energized and outgoing' : extraversion >= 45 ? 'balanced and ambiverted' : 'introspective and self-contained';
    const driveLabel = motivations.length > 0 ? motivations.join(' and ') : 'purpose and growth';

    const summary = `${userName} is ${opennessLabel} and ${energyLabel}, driven primarily by ${driveLabel.toLowerCase()}. Decisions are approached with a ${decisionSpeed.toLowerCase()} pace and a ${decisionStyle.toLowerCase()} mindset. Emotional depth is strong with key sensitivity around ${emotionalTriggers[0] || 'trust'}, navigating stress through ${stressResponse.toLowerCase()} while maintaining an ${attachmentStyle.toLowerCase()} relational foundation.`;

    const twinName = `${userName}'s Twin`;
    const twinSummary = `${userName}'s AI Digital Twin — ${opennessLabel}, ${decisionStyle.toLowerCase()}`;

    return {
        summary,
        big_five: {
            openness: String(openness),
            extraversion: String(extraversion),
            agreeableness: String(agreeableness),
            conscientiousness: String(conscientiousness),
            emotional_stability: String(emotionalStability)
        },
        strengths,
        weaknesses,
        core_values: coreValues,
        motivations: motivations,
        decision_making: {
            speed: decisionSpeed,
            style: decisionStyle,
            risk_tolerance: riskTolerance,
            information_needs: getOpt(24).includes('full') ? 'Full information' : 'Sufficient signal'
        },
        thinking_patterns: {
            scope: openness >= 65 ? 'Broad & visionary' : 'Focused & actionable',
            outlook: emotionalStability >= 55 ? 'Optimistic & solution-oriented' : 'Realistic & vigilant',
            creativity: openness >= 60 ? 'High' : 'Practical',
            abstraction: getOpt(13).includes('yes') ? 'High' : 'Moderate'
        },
        emotional_patterns: {
            triggers: emotionalTriggers,
            stress_response: stressResponse,
            regulation_style: emotionalStability >= 60 ? 'Measured and self-correcting' : 'Deeply felt, benefits from grounding',
            typical_reactions: `Sensitive to ${emotionalTriggers.join(', ')}`
        },
        communication_style: {
            tone: extraversion >= 60 ? 'Warm and direct' : 'Thoughtful and measured',
            formality: 'Natural and conversational',
            directness: getOpt(29).includes('cut') ? 'Clear and bounded' : 'Empathetic and diplomatic',
            expressiveness: emotionalStability < 50 ? 'Emotionally nuanced' : 'Calm and steady',
            conflict_handling: getOpt(29).includes('cut') ? 'Firm boundary setting' : 'Open dialogue'
        },
        relationship_patterns: {
            boundaries: getOpt(29).includes('cut') ? 'Firm boundaries with zero tolerance for betrayal' : 'Open and trusting',
            social_needs: extraversion >= 65 ? 'High social engagement' : 'Quality over quantity',
            attachment_style: attachmentStyle,
            connection_depth: 'Prefers deep, authentic relationships over superficial connections'
        },
        twin_name: twinName,
        twin_summary: twinSummary
    };
}
