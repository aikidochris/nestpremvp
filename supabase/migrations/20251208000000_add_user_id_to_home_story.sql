-- Add user_id to home_story table
ALTER TABLE public.home_story 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Update RLS policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.home_story;

CREATE POLICY "Enable insert for users with matching user_id"
ON public.home_story
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Optionally allow users to update their own stories
CREATE POLICY "Enable update for users with matching user_id"
ON public.home_story
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure users can select their own stories or public ones (adjust as needed, keeping existing select policy if it exists or adding one)
-- Assuming there's already a select policy or it's public. If not:
-- CREATE POLICY "Enable read access for all users" ON public.home_story FOR SELECT USING (true);
