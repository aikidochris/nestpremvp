-- Migration: Enable RLS and policies for follows table
-- This allows server-side auth to work with the follows table

-- Enable RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own follows" ON follows;
DROP POLICY IF EXISTS "Users can create follows" ON follows;
DROP POLICY IF EXISTS "Users can delete own follows" ON follows;

-- 1. View: Users can see their own follows
CREATE POLICY "Users can view own follows" ON follows 
FOR SELECT USING (auth.uid() = user_id);

-- 2. Insert: Users can follow properties
CREATE POLICY "Users can create follows" ON follows 
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Delete: Users can unfollow
CREATE POLICY "Users can delete own follows" ON follows 
FOR DELETE USING (auth.uid() = user_id);
