-- ================================================================
-- SUPABASE STORAGE PERMISSIONS FOR VOICE RESPONSES
-- Purpose: Fix "AI audio upload to Supabase failed" error
-- ================================================================

-- Enable RLS on storage.objects (should already be enabled, but ensure)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload voice files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to voice files" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role full access to voice files" ON storage.objects;

-- 1. UPLOAD POLICY (Authenticated users can upload to voice-responses bucket)
CREATE POLICY "Allow authenticated users to upload voice files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-responses'
);

-- 2. READ POLICY (Anyone can read/download voice files)
CREATE POLICY "Allow public read access to voice files"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'voice-responses'
);

-- 3. SERVICE ROLE POLICY (Backend can do everything)
-- This is critical for server-side uploads
CREATE POLICY "Allow service role full access to voice files"
ON storage.objects
FOR ALL
TO service_role
USING (
  bucket_id = 'voice-responses'
);

-- 4. UPDATE/DELETE POLICIES (Optional, for cleanup)
CREATE POLICY "Allow authenticated users to delete their voice files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-responses'
);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND policyname LIKE '%voice%'
ORDER BY policyname;
