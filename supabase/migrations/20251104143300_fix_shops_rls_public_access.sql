-- Fix shops RLS policy to allow public access to approved shops
-- This fixes the 404 error on shop details pages for unauthenticated users

-- Drop the existing policy
DROP POLICY IF EXISTS "Approved shops are viewable by everyone" ON public.shops;

-- Create new policy that allows everyone to view approved shops
-- and authenticated users to view all shops (including unapproved ones)
CREATE POLICY "Approved shops are viewable by everyone"
  ON public.shops FOR SELECT
  USING (
    approved = true 
    OR 
    (auth.role() = 'authenticated')
  );

-- Note: The key fix is ensuring the logic allows unauthenticated users
-- to view shops where approved = true, regardless of authentication status