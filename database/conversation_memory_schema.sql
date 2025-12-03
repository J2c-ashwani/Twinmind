-- =====================================================
-- Conversation Memory & Semantic Search
-- Fast retrieval of past conversations using vector embeddings
-- =====================================================

-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Message embeddings for semantic search
CREATE TABLE message_embeddings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast vector search
CREATE INDEX idx_message_embeddings_user ON message_embeddings(user_id);
CREATE INDEX idx_message_embeddings_conversation ON message_embeddings(conversation_id);
CREATE INDEX idx_message_embeddings_vector ON message_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Conversation summaries for quick context
CREATE TABLE conversation_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  summary TEXT,
  key_topics TEXT[],
  emotional_tone TEXT,
  message_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id)
);

CREATE INDEX idx_conversation_summaries_user ON conversation_summaries(user_id);

-- Frequently accessed topics for caching
CREATE TABLE topic_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  related_message_ids UUID[],
  access_count INTEGER DEFAULT 1,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic)
);

CREATE INDEX idx_topic_cache_user_access ON topic_cache(user_id, access_count DESC);

-- =====================================================
-- SEMANTIC SEARCH FUNCTION
-- =====================================================

-- Function to search conversations by semantic similarity
CREATE OR REPLACE FUNCTION search_conversations(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  message_id UUID,
  conversation_id UUID,
  content TEXT,
  similarity float,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    me.message_id,
    me.conversation_id,
    me.content,
    1 - (me.embedding <=> query_embedding) AS similarity,
    me.created_at
  FROM message_embeddings me
  WHERE 
    (p_user_id IS NULL OR me.user_id = p_user_id)
    AND 1 - (me.embedding <=> query_embedding) > match_threshold
  ORDER BY me.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- =====================================================
-- CONVERSATION SUMMARY FUNCTIONS
-- =====================================================

-- Function to update conversation summary
CREATE OR REPLACE FUNCTION update_conversation_summary(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id UUID;
  v_message_count INTEGER;
  v_summary TEXT;
BEGIN
  -- Get user_id and message count
  SELECT user_id, COUNT(*) INTO v_user_id, v_message_count
  FROM messages
  WHERE conversation_id = p_conversation_id
  GROUP BY user_id;
  
  -- Generate simple summary (first and last messages)
  SELECT 
    CONCAT(
      'Started with: ', 
      (SELECT content FROM messages WHERE conversation_id = p_conversation_id ORDER BY created_at ASC LIMIT 1),
      ' ... Latest: ',
      (SELECT content FROM messages WHERE conversation_id = p_conversation_id ORDER BY created_at DESC LIMIT 1)
    )
  INTO v_summary;
  
  -- Insert or update summary
  INSERT INTO conversation_summaries (
    conversation_id,
    user_id,
    summary,
    message_count
  )
  VALUES (
    p_conversation_id,
    v_user_id,
    v_summary,
    v_message_count
  )
  ON CONFLICT (conversation_id) DO UPDATE SET
    summary = EXCLUDED.summary,
    message_count = EXCLUDED.message_count,
    updated_at = NOW();
END;
$$;

-- =====================================================
-- QUICK RECALL HELPERS
-- =====================================================

-- Function to get recent conversations about a topic
CREATE OR REPLACE FUNCTION get_topic_conversations(
  p_user_id UUID,
  p_topic TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  conversation_id UUID,
  message_content TEXT,
  created_at TIMESTAMPTZ,
  relevance_score INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.conversation_id,
    m.content AS message_content,
    m.created_at,
    (
      CASE 
        WHEN LOWER(m.content) LIKE '%' || LOWER(p_topic) || '%' THEN 10
        ELSE 5
      END
    ) AS relevance_score
  FROM messages m
  WHERE 
    m.user_id = p_user_id
    AND LOWER(m.content) LIKE '%' || LOWER(p_topic) || '%'
  ORDER BY m.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to cache frequently accessed topics
CREATE OR REPLACE FUNCTION cache_topic_access(
  p_user_id UUID,
  p_topic TEXT,
  p_message_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO topic_cache (
    user_id,
    topic,
    related_message_ids,
    access_count,
    last_accessed
  )
  VALUES (
    p_user_id,
    p_topic,
    p_message_ids,
    1,
    NOW()
  )
  ON CONFLICT (user_id, topic) DO UPDATE SET
    access_count = topic_cache.access_count + 1,
    last_accessed = NOW(),
    related_message_ids = EXCLUDED.related_message_ids;
END;
$$;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_embeddings_policy ON message_embeddings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY conversation_summaries_policy ON conversation_summaries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY topic_cache_policy ON topic_cache FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update conversation summary when messages are added
CREATE OR REPLACE FUNCTION trigger_update_conversation_summary()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_conversation_summary(NEW.conversation_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_summary_on_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION trigger_update_conversation_summary();

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

-- Additional indexes for fast text search
CREATE INDEX idx_messages_content_gin ON messages USING gin(to_tsvector('english', content));
CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
