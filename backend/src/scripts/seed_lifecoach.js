import { supabaseAdmin } from '../config/supabase.js';

const programs = [
    {
        title: '7-Day Anxiety Reset',
        description: 'A gentle, guided journey to understand and manage your anxiety triggers.',
        duration_days: 7,
        category: 'anxiety',
        is_premium: false,
        days: [
            { day_number: 1, title: 'Understanding Triggers', goal: 'Identify what sparks your anxiety', initial_prompt: "Welcome to Day 1. To start, I'd like to understand your experience. Can you tell me about the last time you felt anxious? What was happening around you?", exercise_instructions: 'Write down 3 specific situations that made you anxious today.' },
            { day_number: 2, title: 'Physical Sensations', goal: 'Connect mind and body', initial_prompt: 'Anxiety often shows up in the body first. When you feel anxious, where do you feel it? Chest, stomach, shoulders?', exercise_instructions: 'Do a 2-minute body scan. Close your eyes and notice tension.' },
            { day_number: 3, title: 'The "What If" Game', goal: 'Challenge catastrophic thinking', initial_prompt: 'We often worry about worst-case scenarios. What is one "what if" worry that has been on your mind lately?', exercise_instructions: 'Write down your "what if" and then write 3 positive alternatives.' },
            { day_number: 4, title: 'Grounding Techniques', goal: 'Learn to stabilize in the moment', initial_prompt: 'Today is about tools. Have you ever tried the 5-4-3-2-1 grounding technique?', exercise_instructions: 'Practice the 5-4-3-2-1 technique: Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.' },
            { day_number: 5, title: 'Self-Compassion', goal: 'Be kind to yourself', initial_prompt: 'We are often our own harshest critics. What would you say to a dear friend who was feeling the anxiety you feel?', exercise_instructions: 'Write a compassionate letter to yourself.' },
            { day_number: 6, title: 'Exposure Steps', goal: 'Face fears gently', initial_prompt: 'Avoidance makes anxiety stronger. Is there a small, safe situation you have been avoiding that we could discuss?', exercise_instructions: 'Do one small thing today that you usually avoid due to anxiety.' },
            { day_number: 7, title: 'Reflection & Growth', goal: 'Celebrate progress', initial_prompt: 'You have made it to Day 7! Looking back, what is the most important thing you learned about yourself this week?', exercise_instructions: 'Create a "Coping Card" with your top 3 strategies to carry with you.' }
        ]
    },
    {
        title: '5-Day Confidence Boost',
        description: 'Quick, actionable steps to build self-belief and assertive energy.',
        duration_days: 5,
        category: 'growth',
        is_premium: false,
        days: [
            { day_number: 1, title: 'Your Strengths', goal: 'Recognize your value', initial_prompt: 'Confidence starts with knowing your worth. What are three things you are naturally good at, even small things?', exercise_instructions: 'List 10 things you like about yourself.' },
            { day_number: 2, title: 'Body Language', goal: 'Project power', initial_prompt: "Your posture affects your mind. How are you sitting or standing right now? Let's try a power pose.", exercise_instructions: 'Stand in a "Wonder Woman" or "Superman" pose for 2 minutes before a task.' },
            { day_number: 3, title: 'Speaking Up', goal: 'Assertiveness practice', initial_prompt: 'Think of a recent time you stayed silent when you wanted to speak. What stopped you?', exercise_instructions: "Share an opinion in a conversation today, even if it's just about a movie." },
            { day_number: 4, title: 'Handling Failure', goal: 'Reframing mistakes', initial_prompt: 'Confident people fail often; they just handle it differently. Tell me about a recent "failure".', exercise_instructions: 'Re-write that failure story as a learning story.' },
            { day_number: 5, title: 'The Future You', goal: 'Visualization', initial_prompt: 'Imagine the most confident version of yourself one year from now. What are they doing differently?', exercise_instructions: 'Visualize your confident self for 5 minutes.' }
        ]
    },
    {
        title: 'Daily Gratitude Practice',
        description: 'Shift your mindset by focusing on the positive.',
        duration_days: 30,
        category: 'growth',
        is_premium: false,
        days: [
            { day_number: 1, title: 'The Basics', goal: 'Start noticing the good', initial_prompt: "Welcome! Let's start simple. What is one thing that made you smile today?", exercise_instructions: 'Write down 3 things you are grateful for right now.' },
            { day_number: 2, title: 'People', goal: 'Appreciate relationships', initial_prompt: 'Who is someone in your life that makes it better just by being there?', exercise_instructions: 'Send a quick text of appreciation to someone.' },
            { day_number: 3, title: 'Challenges', goal: 'Finding silver linings', initial_prompt: 'Even challenges can be gifts. What is a difficult situation that taught you something valuable?', exercise_instructions: 'Find one positive aspect of a current struggle.' }
        ]
    }
];

async function seed() {
    console.log('🌱 Checking Life Coach Programs...');
    try {
        const { count, error } = await supabaseAdmin.from('life_coach_programs').select('*', { count: 'exact', head: true });

        if (error) {
            // If error is 42P01 (relation does not exist), we can't seed.
            console.error('❌ Error checking programs:', error.message);
            console.log('⚠️ It seems the tables do not exist. Please run the migration "src/db/life_coach_schema.sql" in Supabase SQL Editor.');
            return;
        }

        if (count > 0) {
            console.log(`✅ Programs already exist (${count}). Skipping seed.`);
            // Optional: Check if days exist?
            return;
        }

        console.log('🌱 Seeding programs...');
        for (const prog of programs) {
            const { days, ...progData } = prog;
            const { data: pData, error: pError } = await supabaseAdmin.from('life_coach_programs').insert(progData).select().single();
            if (pError) {
                console.error('❌ Error inserting program:', pError.message);
                continue;
            }

            console.log(`   Created Program: ${prog.title}`);

            const daysWithId = days.map(d => ({ ...d, program_id: pData.id }));
            const { error: dError } = await supabaseAdmin.from('program_days').insert(daysWithId);
            if (dError) {
                console.error('❌ Error inserting days:', dError.message);
            } else {
                console.log(`   Added ${days.length} days.`);
            }
        }
        console.log('✨ Seeding complete!');
    } catch (e) {
        console.error('❌ Unexpected error:', e);
    }
}

seed();
