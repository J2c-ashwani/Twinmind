
import { buildModePrompt } from './src/services/modeManager.js';

const dummyPersonality = {
    openness: 80,
    conscientiousness: 60,
    extraversion: 70,
    agreeableness: 50,
    neuroticism: 40
};

const memories = [
    "User hates avocados.",
    "User loves coding at night."
];

try {
    console.log("Testing Normal Mode...");
    const prompt = buildModePrompt(dummyPersonality, 'normal', 'TestUser', memories);
    console.log("SUCCESS. Prompt length:", prompt.length);
    console.log("Snippet:", prompt.substring(0, 100));

    if (prompt.includes('User hates avocados')) {
        console.log("✅ Memory injection working");
    } else {
        console.error("❌ Memory injection FAILED");
    }

    if (prompt.includes('Brooo 💀')) {
        console.log("✅ Normal mode example found");
    } else {
        console.error("❌ Normal mode example MISSING");
    }

} catch (error) {
    console.error("CRASH:", error);
    process.exit(1);
}
