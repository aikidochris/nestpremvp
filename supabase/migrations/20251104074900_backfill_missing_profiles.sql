-- Backfill Missing Profiles Migration
-- This migration creates profile entries for any auth.users that don't have a corresponding profile
-- This is needed because the trigger only fires on INSERT, not for existing users

-- Insert profiles for users that don't have one yet
INSERT INTO public.profiles (id, email, is_admin)
SELECT 
  au.id,
  au.email,
  false as is_admin
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Add comment for documentation
COMMENT ON TABLE public.profiles IS 'User profiles - automatically created via trigger for new users, or backfilled for existing users';