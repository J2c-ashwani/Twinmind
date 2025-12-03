-- Migration script to update existing TwinMind database to multiple-choice format
-- Run this if you already have the old schema deployed

-- Step 1: Add new columns to personality_questions table
ALTER TABLE personality_questions 
ADD COLUMN IF NOT EXISTS question_type TEXT DEFAULT 'single_choice',
ADD COLUMN IF NOT EXISTS options_json JSONB,
ADD COLUMN IF NOT EXISTS screen_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS allow_other BOOLEAN DEFAULT true;

-- Step 2: Update personality_answers table to support multiple choice
ALTER TABLE personality_answers 
ADD COLUMN IF NOT EXISTS selected_option TEXT,
ALTER COLUMN answer_text DROP NOT NULL;

-- Step 3: Delete old questions (if you want to start fresh)
DELETE FROM personality_answers; -- Remove all existing answers first
DELETE FROM personality_questions; -- Then remove questions

-- Step 4: Now run the updated seed_questions.sql to insert the new 21 questions

-- Note: If you have existing user data you want to preserve, you'll need to:
-- 1. Backup the data first
-- 2. Map old answers to new format manually
-- 3. Or keep both old and new questions and let users re-take the assessment
