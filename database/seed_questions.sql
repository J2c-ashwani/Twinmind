-- TwinMind Personality Questions - Multiple Choice Format
-- 35 Questions organized into 5 screens (7 questions each)
-- Each question has predefined options, question 33 is open-ended text

INSERT INTO personality_questions (question_text, category, subcategory, question_order, question_type, options_json, screen_number) VALUES

-- Screen 1: Openness, Extraversion, Conscientiousness (Questions 1-7)
('How do you usually approach new experiences?', 'big_five', 'openness', 1, 'single_choice', 
 '["Curious and excited", "Cautious but willing", "Prefer familiar things", "Avoid them"]', 1),

('When plans change suddenly, how do you feel?', 'big_five', 'emotional_stability', 2, 'single_choice',
 '["Stressed", "Annoyed", "Excited", "Neutral"]', 1),

('How do you recharge after a long day?', 'big_five', 'extraversion', 3, 'single_choice',
 '["Alone", "With close friends", "In a group", "Doing hobbies"]', 1),

('In social situations, you usually:', 'big_five', 'extraversion', 4, 'single_choice',
 '["Start conversations", "Wait for others", "Stick to familiar people", "Avoid socializing"]', 1),

('Which describes your social energy?', 'big_five', 'extraversion', 5, 'single_choice',
 '["High", "Medium", "Low", "Depends on mood"]', 1),

('How organized are you day-to-day?', 'big_five', 'conscientiousness', 6, 'single_choice',
 '["Very organized", "Somewhat organized", "Not organized", "Organized only under pressure"]', 1),

('How often do you procrastinate?', 'big_five', 'conscientiousness', 7, 'single_choice',
 '["Rarely", "Sometimes", "Often", "Almost always"]', 1),

-- Screen 2: Problem-Solving, Planning, Openness (Questions 8-14)
('When solving problems, you prefer:', 'decision', 'style', 8, 'single_choice',
 '["Logic and structure", "Creativity and ideas", "A mix of both", "Delegating to others"]', 2),

('Do you plan everything or improvise?', 'decision', 'planning', 9, 'single_choice',
 '["Plan in detail", "Rough plan", "Improvise mostly", "Completely spontaneous"]', 2),

('How important is perfection to you?', 'big_five', 'conscientiousness', 10, 'single_choice',
 '["Very important", "Somewhat important", "Not important", "Depends on task"]', 2),

('When working on a project, you:', 'decision', 'planning', 11, 'single_choice',
 '["Plan ahead fully", "Plan key steps", "Start and adjust", "Improvise entirely"]', 2),

('Do you enjoy exploring new ideas, cultures, or perspectives?', 'big_five', 'openness', 12, 'single_choice',
 '["Yes, very much", "Sometimes", "Rarely", "Not at all"]', 2),

('Do you enjoy abstract thinking or philosophical discussions?', 'big_five', 'openness', 13, 'single_choice',
 '["Yes", "Sometimes", "Rarely", "No"]', 2),

('How often do you daydream?', 'big_five', 'openness', 14, 'single_choice',
 '["Very often", "Sometimes", "Rarely", "Never"]', 2),

-- Screen 3: Emotional responses, Stress, Triggers (Questions 15-21)
('When stressed, you usually:', 'emotional', 'coping', 15, 'single_choice',
 '["Take action", "Withdraw", "Overthink", "Distract yourself", "Seek support"]', 3),

('What hurts you the most?', 'emotional', 'triggers', 16, 'single_choice',
 '["Being ignored", "Being criticized", "Feeling unappreciated", "Feeling controlled", "Betrayal"]', 3),

('How intense are your emotions?', 'big_five', 'neuroticism', 17, 'single_choice',
 '["Very intense", "Moderate", "Mild", "Hard to notice"]', 3),

('When something goes wrong, you:', 'emotional', 'response', 18, 'single_choice',
 '["Expect the worst", "Stay optimistic", "Look for solutions", "Blame yourself"]', 3),

('What instantly makes you angry or upset?', 'emotional', 'triggers', 19, 'single_choice',
 '["Disrespect", "Unfairness", "Betrayal", "Chaos/lack of control", "Being ignored"]', 3),

('How often do you experience anxiety, anger, or sadness?', 'big_five', 'neuroticism', 20, 'single_choice',
 '["Very often", "Sometimes", "Rarely", "Almost never"]', 3),

('When overwhelmed, what do you usually do?', 'emotional', 'coping', 21, 'single_choice',
 '["Take action", "Shut down", "Distract myself", "Seek support", "Cry or release emotions"]', 3),

-- Screen 4: Decision-making & Motivation (Questions 22-27)
('When making big decisions, you rely on:', 'decision', 'style', 22, 'single_choice',
 '["Logic", "Intuition", "Emotions", "Advice from others"]', 4),

('Do you decide quickly or slowly?', 'decision', 'speed', 23, 'single_choice',
 '["Quickly", "After thinking", "Very slowly", "Depends on situation"]', 4),

('Are you comfortable deciding without full information?', 'decision', 'risk_tolerance', 24, 'single_choice',
 '["Yes", "Sometimes", "No", "Depends on risk"]', 4),

('What motivates you more?', 'values', 'motivation', 25, 'single_choice',
 '["Success", "Avoiding failure", "Recognition", "Freedom", "Stability"]', 4),

('What matters most in life right now?', 'values', 'priorities', 26, 'single_choice',
 '["Achievement", "Relationships", "Freedom", "Security", "Creativity"]', 4),

('What drives you more?', 'values', 'drivers', 27, 'single_choice',
 '["Achieving success", "Avoiding failure", "Helping others", "Proving yourself", "Finding meaning"]', 4),

-- Screen 5: Relationships, Trust, Fears & Vulnerabilities (Questions 28-35)
('In relationships, you are:', 'communication', 'attachment', 28, 'single_choice',
 '["Independent", "Emotionally connected", "Both", "Unsure"]', 5),

('When someone hurts you, you:', 'big_five', 'agreeableness', 29, 'single_choice',
 '["Forgive quickly", "Take time", "Hold grudges", "Cut them off"]', 5),

('Do you naturally trust people?', 'big_five', 'agreeableness', 30, 'single_choice',
 '["Yes", "Slowly", "Rarely", "No"]', 5),

('What do you fear losing the most?', 'emotional', 'fears', 31, 'single_choice',
 '["Loved ones", "Freedom", "Stability", "Respect", "Identity"]', 5),

('What do people misunderstand about you the most?', 'values', 'self_perception', 32, 'single_choice',
 '["My intentions", "My emotions", "My personality", "My goals", "My boundaries"]', 5),

('What is a weakness you rarely talk about?', 'values', 'self_awareness', 33, 'text',
 NULL, 5),

('What behavior from others hurts you the most?', 'emotional', 'triggers', 34, 'single_choice',
 '["Criticism", "Ignoring", "Controlling behavior", "Lies", "Lack of appreciation"]', 5),

('In relationships, do you fear:', 'emotional', 'relationship_fears', 35, 'single_choice',
 '["Losing people", "Being controlled", "Both", "Neither"]', 5);
