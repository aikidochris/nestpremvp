# Admin Setup Guide

This guide explains how to set up admin users for the BitcoinLatte application.

## Overview

Admin users have special privileges to:
- Review and approve/reject shop submissions
- Manage existing shops
- View admin dashboard with statistics

## Database Structure

Admins are defined in the `profiles` table with an `is_admin` boolean field:

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  email TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Setting Up an Admin User

### Method 1: Using Supabase Studio (Recommended)

1. **Open Supabase Studio**
   - Local: `http://127.0.0.1:54323`
   - Production: Your Supabase project dashboard

2. **Navigate to Table Editor**
   - Click on "Table Editor" in the left sidebar
   - Select the `profiles` table

3. **Find or Create User Profile**
   - If the user has already logged in, their profile should exist
   - If not, they need to log in first to create their auth record

4. **Set Admin Flag**
   - Find the user's row in the profiles table
   - Click on the `is_admin` field
   - Change it from `false` to `true`
   - Save the changes

### Method 2: Using SQL Query

1. **Open SQL Editor in Supabase Studio**

2. **Run this query** (replace with actual user email):

```sql
-- First, find the user's ID
SELECT id, email FROM auth.users WHERE email = 'admin@example.com';

-- Then update their profile
UPDATE profiles 
SET is_admin = true 
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');
```

### Method 3: Using Supabase CLI

```bash
# Connect to your local Supabase instance
supabase db reset

# Or run a migration
supabase migration new add_admin_user

# In the migration file:
# UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@example.com');

supabase db push
```

## Creating Your First Admin

### Step-by-Step Process:

1. **Start the application**
   ```bash
   pnpm dev
   ```

2. **Sign up/Login**
   - Go to `http://localhost:3000/auth/login`
   - Enter your email address
   - Check your email for the magic link
   - Click the link to authenticate

3. **Set Admin Flag in Database**
   - Open Supabase Studio: `http://127.0.0.1:54323`
   - Go to Table Editor → `profiles`
   - Find your user (by email)
   - Set `is_admin` to `true`

4. **Access Admin Dashboard**
   - Navigate to `http://localhost:3000/admin`
   - You should now see the admin dashboard

## Verifying Admin Access

To verify a user is an admin:

```sql
SELECT 
  u.email,
  p.is_admin,
  p.created_at
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE p.is_admin = true;
```

## Security Considerations

### Row Level Security (RLS)

The profiles table should have RLS policies to prevent users from making themselves admins:

```sql
-- Only allow users to read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Only allow users to update their own non-admin fields
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid())
);

-- Only service role can set admin flag
-- (This is enforced by not having an INSERT/UPDATE policy for is_admin)
```

### Admin-Only Routes

The admin dashboard checks for admin status:

```typescript
// src/app/admin/page.tsx
const { data: profile } = await supabase
  .from('profiles')
  .select('is_admin')
  .eq('id', user.id)
  .single()

if (!profile?.is_admin) {
  redirect('/')
}
```

## Production Setup

For production, you should:

1. **Use Environment Variables**
   ```env
   # .env.prod
   ADMIN_EMAILS=admin1@example.com,admin2@example.com
   ```

2. **Create a Setup Script**
   ```sql
   -- supabase/migrations/XXX_setup_admins.sql
   UPDATE profiles 
   SET is_admin = true 
   WHERE id IN (
     SELECT id FROM auth.users 
     WHERE email = ANY(ARRAY['admin1@example.com', 'admin2@example.com'])
   );
   ```

3. **Run Migration**
   ```bash
   supabase db push
   ```

## Removing Admin Access

To remove admin privileges:

```sql
UPDATE profiles 
SET is_admin = false 
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@example.com');
```

## Troubleshooting

### User Can't Access Admin Dashboard

1. **Check if user is authenticated**
   - Try logging out and back in

2. **Verify is_admin flag**
   ```sql
   SELECT email, is_admin FROM profiles 
   JOIN auth.users ON profiles.id = auth.users.id 
   WHERE email = 'user@example.com';
   ```

3. **Check RLS policies**
   - Ensure policies allow reading the is_admin field

4. **Clear browser cache**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### Profile Doesn't Exist

If a user's profile doesn't exist in the profiles table:

1. **Check if trigger exists** to auto-create profiles:
   ```sql
   -- This should be in your migrations
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.profiles (id, email)
     VALUES (NEW.id, NEW.email);
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

2. **Manually create profile**:
   ```sql
   INSERT INTO profiles (id, email, is_admin)
   VALUES (
     (SELECT id FROM auth.users WHERE email = 'admin@example.com'),
     'admin@example.com',
     true
   );
   ```

## Best Practices

1. **Limit Admin Users**: Only give admin access to trusted users
2. **Use Separate Admin Emails**: Don't use personal emails for admin accounts
3. **Audit Admin Actions**: Consider adding an audit log for admin actions
4. **Regular Reviews**: Periodically review who has admin access
5. **Two-Factor Authentication**: Consider implementing 2FA for admin accounts

## Related Files

- Admin Dashboard: [`src/app/admin/page.tsx`](../src/app/admin/page.tsx)
- Database Schema: [`supabase/migrations/001_initial_schema.sql`](../supabase/migrations/001_initial_schema.sql)
- RLS Policies: [`supabase/migrations/002_rls_policies.sql`](../supabase/migrations/002_rls_policies.sql)