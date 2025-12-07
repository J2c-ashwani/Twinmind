-- =====================================================
-- TwinMind: Check Required Tables for Orphan Services
-- Run this in Supabase SQL Editor to see which tables exist
-- =====================================================

SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status,
    CASE 
        WHEN table_name = 'life_context' THEN 'lifeContextService'
        WHEN table_name = 'shared_memories' THEN 'memoryJournalService'
        WHEN table_name = 'memory_anniversaries' THEN 'memoryJournalService'
        WHEN table_name = 'proactive_messages' THEN 'proactiveMessageService'
        WHEN table_name = 'user_activity_patterns' THEN 'proactiveMessageService'
        WHEN table_name = 'relationship_milestones' THEN 'relationshipEvolutionService'
        WHEN table_name = 'relationship_growth_metrics' THEN 'relationshipEvolutionService'
        WHEN table_name = 'user_streaks' THEN 'gamificationService'
        WHEN table_name = 'user_achievements' THEN 'gamificationService'
        WHEN table_name = 'user_levels' THEN 'gamificationService'
        ELSE 'Other'
    END as used_by_service
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
    -- Required for Orphan Services
    'life_context',
    'shared_memories',
    'memory_anniversaries',
    'proactive_messages',
    'user_activity_patterns',
    'relationship_milestones',
    'relationship_growth_metrics',
    'user_streaks',
    'user_achievements',
    'user_levels',
    -- Core tables (should already exist)
    'users',
    'conversations',
    'messages',
    'chat_history',
    'emotional_metrics'
)
ORDER BY table_name;

-- =====================================================
-- Alternative: Get ALL missing tables
-- =====================================================

-- This shows which tables are MISSING:
WITH required_tables AS (
    SELECT unnest(ARRAY[
        'life_context',
        'shared_memories', 
        'memory_anniversaries',
        'proactive_messages',
        'user_activity_patterns',
        'relationship_milestones',
        'relationship_growth_metrics',
        'user_streaks',
        'user_achievements',
        'user_levels'
    ]) as table_name
)
SELECT 
    rt.table_name,
    '❌ MISSING - Needs Migration' as status
FROM required_tables rt
LEFT JOIN information_schema.tables ist 
    ON ist.table_name = rt.table_name 
    AND ist.table_schema = 'public'
WHERE ist.table_name IS NULL;
