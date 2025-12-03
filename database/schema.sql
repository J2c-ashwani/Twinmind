-- TwinMind Database Schema
-- PostgreSQL with pgvector extension for Supabase

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    country TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Personality questions bank
CREATE TABLE personality_questions (
    id SERIAL PRIMARY KEY,
    question_text TEXT NOT NULL,
    category TEXT NOT NULL, -- 'big_five', 'emotional', 'decision', 'communication', 'values'
    subcategory TEXT, -- 'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'
    question_order INTEGER NOT NULL,
    question_type TEXT DEFAULT 'single_choice', -- 'single_choice', 'multiple_choice', 'text'
    options_json JSONB, -- Array of predefined answer options
    screen_number INTEGER DEFAULT 1, -- Which screen/step this question appears on
    allow_other BOOLEAN DEFAULT true, -- Allow "Other" option
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User answers to personality questions
CREATE TABLE personality_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES personality_questions(id),
    selected_option TEXT, -- The selected option from predefined choices
    answer_text TEXT, -- Optional: free text if "Other" selected or for text questions
    answer_score INTEGER, -- 1-5 scale for quantifiable questions (optional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, question_id)
);

-- Generated personality profiles
CREATE TABLE personality_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    personality_json JSONB NOT NULL, -- Complete personality model
    twin_name TEXT,
    twin_summary TEXT,
    generation_prompt TEXT, -- The prompt used to generate this profile
    ai_model TEXT, -- 'gpt-4o', 'gemini-1.5-flash', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat history
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
    mode TEXT NOT NULL DEFAULT 'normal', -- 'normal', 'future', 'dark', 'therapist'
    metadata JSONB, -- Additional context like mode settings, timestamp shown to user, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory vectors for semantic search
CREATE TABLE memory_vectors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI ada-002 produces 1536-dimension vectors
    metadata JSONB, -- {type: 'chat', 'user_info', timestamp, mode, etc}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro')),
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'trial')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage tracking for free tier limits
CREATE TABLE usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'chat_message', 'memory_store', etc.
    count INTEGER DEFAULT 1,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_personality_answers_user_id ON personality_answers(user_id);
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
CREATE INDEX idx_memory_vectors_user_id ON memory_vectors(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- Vector similarity search index (HNSW for fast approximate search)
CREATE INDEX memory_vectors_embedding_idx ON memory_vectors 
USING hnsw (embedding vector_cosine_ops);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own answers" ON personality_answers
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own personality" ON personality_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chats" ON chat_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own memories" ON memory_vectors
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription" ON subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- Functions
CREATE OR REPLACE FUNCTION match_memories(
    query_embedding vector(1536),
    match_user_id UUID,
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        memory_vectors.id,
        memory_vectors.content,
        memory_vectors.metadata,
        1 - (memory_vectors.embedding <=> query_embedding) AS similarity
    FROM memory_vectors
    WHERE memory_vectors.user_id = match_user_id
        AND 1 - (memory_vectors.embedding <=> query_embedding) > match_threshold
    ORDER BY memory_vectors.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personality_profiles_updated_at BEFORE UPDATE ON personality_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
