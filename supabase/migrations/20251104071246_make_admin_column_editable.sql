-- Make is_admin column editable by admins
-- This migration ensures that admins can update the is_admin column for any user
-- while preventing regular users from changing their own admin status

-- The existing "Admins can update any profile" policy already allows admins to update
-- any profile using the public.is_admin() function, which checks the is_admin boolean column.
-- However, we need to ensure that regular users cannot escalate their own privileges.

-- Drop the existing "Users can update own profile" policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate the policy to allow users to update their own profile
-- but explicitly prevent them from changing their is_admin status
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from changing their own admin status
    (is_admin IS NOT DISTINCT FROM (SELECT is_admin FROM public.profiles WHERE id = auth.uid()))
  );

-- The "Admins can update any profile" policy (created in the previous migration)
-- already allows admins to update any profile including the is_admin column.
-- It uses FOR ALL which covers SELECT, INSERT, UPDATE, and DELETE operations.

-- Add a comment to document the security model
COMMENT ON COLUMN public.profiles.is_admin IS 
  'Admin status flag. Can only be modified by existing admins. Regular users cannot change their own admin status.';