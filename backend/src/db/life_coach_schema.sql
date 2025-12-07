-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Programs Table
CREATE TABLE IF NOT EXISTS life_coach_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    duration_days INTEGER NOT NULL,
    category TEXT, -- 'anxiety', 'career', 'relationships', 'growth'
    is_premium BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Program Days (Content)
CREATE TABLE IF NOT EXISTS program_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_id UUID REFERENCES life_coach_programs(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    goal TEXT,
    initial_prompt TEXT NOT NULL, -- The first message the AI sends
    exercise_instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_id, day_number)
);

-- 3. User Progress
CREATE TABLE IF NOT EXISTS user_program_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL, -- References auth.users or personality_profiles
    program_id UUID REFERENCES life_coach_programs(id) ON DELETE CASCADE,
    current_day INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, program_id)
);

-- 4. Daily Completions (Track specific day completion)
CREATE TABLE IF NOT EXISTS user_daily_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    progress_id UUID REFERENCES user_program_progress(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_notes TEXT,
    ai_feedback TEXT
);

-- SEED DATA: 3 Starter Programs

-- Program 1: 7-Day Anxiety Reset
DO $$
DECLARE
    p_id UUID;
BEGIN
    INSERT INTO life_coach_programs (title, description, duration_days, category, is_premium)
    VALUES ('7-Day Anxiety Reset', 'A gentle, guided journey to understand and manage your anxiety triggers.', 7, 'anxiety', false)
    RETURNING id INTO p_id;

    INSERT INTO program_days (program_id, day_number, title, goal, initial_prompt, exercise_instructions) VALUES
    (p_id, 1, 'Understanding Triggers', 'Identify what sparks your anxiety', 'Welcome to Day 1. To start, I''d like to understand your experience. Can you tell me about the last time you felt anxious? What was happening around you?', 'Write down 3 specific situations that made you anxious today.'),
    (p_id, 2, 'Physical Sensations', 'Connect mind and body', 'Anxiety often shows up in the body first. When you feel anxious, where do you feel it? Chest, stomach, shoulders?', 'Do a 2-minute body scan. Close your eyes and notice tension.'),
    (p_id, 3, 'The "What If" Game', 'Challenge catastrophic thinking', 'We often worry about worst-case scenarios. What is one "what if" worry that has been on your mind lately?', 'Write down your "what if" and then write 3 positive alternatives.'),
    (p_id, 4, 'Grounding Techniques', 'Learn to stabilize in the moment', 'Today is about tools. Have you ever tried the 5-4-3-2-1 grounding technique?', 'Practice the 5-4-3-2-1 technique: Name 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.'),
    (p_id, 5, 'Self-Compassion', 'Be kind to yourself', 'We are often our own harshest critics. What would you say to a dear friend who was feeling the anxiety you feel?', 'Write a compassionate letter to yourself.'),
    (p_id, 6, 'Exposure Steps', 'Face fears gently', 'Avoidance makes anxiety stronger. Is there a small, safe situation you have been avoiding that we could discuss?', 'Do one small thing today that you usually avoid due to anxiety.'),
    (p_id, 7, 'Reflection & Growth', 'Celebrate progress', 'You have made it to Day 7! Looking back, what is the most important thing you learned about yourself this week?', 'Create a "Coping Card" with your top 3 strategies to carry with you.');
END $$;

-- Program 2: 5-Day Confidence Boost
DO $$
DECLARE
    p_id UUID;
BEGIN
    INSERT INTO life_coach_programs (title, description, duration_days, category, is_premium)
    VALUES ('5-Day Confidence Boost', 'Quick, actionable steps to build self-belief and assertive energy.', 5, 'growth', false)
    RETURNING id INTO p_id;

    INSERT INTO program_days (program_id, day_number, title, goal, initial_prompt, exercise_instructions) VALUES
    (p_id, 1, 'Your Strengths', 'Recognize your value', 'Confidence starts with knowing your worth. What are three things you are naturally good at, even small things?', 'List 10 things you like about yourself.'),
    (p_id, 2, 'Body Language', 'Project power', 'Your posture affects your mind. How are you sitting or standing right now? Let''s try a power pose.', 'Stand in a "Wonder Woman" or "Superman" pose for 2 minutes before a task.'),
    (p_id, 3, 'Speaking Up', 'Assertiveness practice', 'Think of a recent time you stayed silent when you wanted to speak. What stopped you?', 'Share an opinion in a conversation today, even if it''s just about a movie.'),
    (p_id, 4, 'Handling Failure', 'Reframing mistakes', 'Confident people fail often; they just handle it differently. Tell me about a recent "failure".', 'Re-write that failure story as a learning story.'),
    (p_id, 5, 'The Future You', 'Visualization', 'Imagine the most confident version of yourself one year from now. What are they doing differently?', 'Visualize your confident self for 5 minutes.');
END $$;

-- Program 3: Gratitude Journal
DO $$
DECLARE
    p_id UUID;
BEGIN
    INSERT INTO life_coach_programs (title, description, duration_days, category, is_premium)
    VALUES ('Daily Gratitude Practice', 'Shift your mindset by focusing on the positive.', 30, 'growth', false)
    RETURNING id INTO p_id;

    INSERT INTO program_days (program_id, day_number, title, goal, initial_prompt, exercise_instructions) VALUES
    (p_id, 1, 'The Basics', 'Start noticing the good', 'Welcome! Let''s start simple. What is one thing that made you smile today?', 'Write down 3 things you are grateful for right now.'),
    (p_id, 2, 'People', 'Appreciate relationships', 'Who is someone in your life that makes it better just by being there?', 'Send a quick text of appreciation to someone.'),
    (p_id, 3, 'Challenges', 'Finding silver linings', 'Even challenges can be gifts. What is a difficult situation that taught you something valuable?', 'Find one positive aspect of a current struggle.');
    -- (Add more days as needed)
END $$;
