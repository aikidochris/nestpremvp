# Creating an Admin User

This guide explains how to create an admin user for the BitcoinLatte application.

## Overview

As of migration `20251104071838_create_profile_trigger.sql`, the database now automatically creates a profile entry whenever a new user signs up through Supabase Auth. The profile is created with `is_admin = false` by default.

## Prerequisites

- Supabase local development environment running (`pnpx supabase start`)
- Access to the Supabase Studio dashboard (typically at http://localhost:54323)

## Method 1: Sign Up Through the App UI (Recommended)

This is the recommended approach as it ensures all authentication flows work correctly.

### Step 1: Sign Up

1. Navigate to your app's login/signup page (typically at http://localhost:3000/auth/login)
2. Create a new account using your email and password
3. Complete the email verification if required
4. A profile will be automatically created in `public.profiles` with `is_admin = false`

### Step 2: Grant Admin Access

1. Open Supabase Studio at http://localhost:54323
2. Navigate to **Table Editor** → **profiles**
3. Find your newly created profile (search by email)
4. Click on the row to edit it
5. Change the `is_admin` column from `false` to `true`
6. Click **Save**

### Step 3: Verify Admin Access

1. Log out and log back in to your application
2. Navigate to the admin page (typically at http://localhost:3000/admin)
3. You should now have access to admin features

## Method 2: Manual SQL Insert (For Existing Auth Users)

If you already have a user in `auth.users` but no corresponding profile, you can manually create one.

### Step 1: Find Your User ID

1. Open Supabase Studio at http://localhost:54323
2. Navigate to **Authentication** → **Users**
3. Find your user and copy the UUID (id column)

### Step 2: Create Admin Profile

1. Navigate to **SQL Editor** in Supabase Studio
2. Run the following SQL query (replace `YOUR_USER_ID` and `YOUR_EMAIL`):

```sql
INSERT INTO public.profiles (id, email, is_admin)
VALUES ('YOUR_USER_ID', 'YOUR_EMAIL', true)
ON CONFLICT (id) DO UPDATE
SET is_admin = true;
```

Example:
```sql
INSERT INTO public.profiles (id, email, is_admin)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'admin@example.com', true)
ON CONFLICT (id) DO UPDATE
SET is_admin = true;
```

### Step 3: Verify

1. Navigate to **Table Editor** → **profiles**
2. Confirm your profile exists with `is_admin = true`
3. Log in to the application and verify admin access

## Method 3: Using Supabase CLI (Advanced)

You can also create an admin user using the Supabase CLI:

```bash
# First, create the user through the auth system
pnpx supabase auth signup --email admin@example.com --password your-secure-password

# Then update the profile to make them an admin
pnpx supabase db execute "UPDATE public.profiles SET is_admin = true WHERE email = 'admin@example.com';"
```

## Troubleshooting

### Profile Not Created After Signup

If a profile wasn't created automatically:

1. Check that the trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

2. Verify the function exists:
```sql
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';
```

3. If missing, run the migration again:
```bash
pnpx supabase db reset
```

### Cannot Access Admin Features

1. Verify your profile has `is_admin = true`:
```sql
SELECT id, email, is_admin FROM public.profiles WHERE email = 'your-email@example.com';
```

2. Clear your browser cache and cookies
3. Log out and log back in
4. Check the browser console for any authentication errors

### RLS Policy Issues

If you're getting permission errors, verify the RLS policies are correctly set:

```sql
-- Check admin policy
SELECT * FROM pg_policies WHERE tablename = 'profiles' AND policyname LIKE '%admin%';
```

The admin policy should allow users with `is_admin = true` to perform all operations.

## Security Notes

- **Never commit admin credentials to version control**
- Use strong passwords for admin accounts
- Consider implementing 2FA for admin users in production
- Regularly audit admin access and remove unnecessary admin privileges
- In production, use environment-specific admin accounts

## Next Steps

After creating your admin user:

1. Test admin functionality by accessing `/admin`
2. Review and approve pending shop submissions
3. Manage user profiles if needed
4. Configure additional admin settings as required

## Related Documentation

- [Admin Setup Guide](./ADMIN_SETUP.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [User Flows](./USER_FLOWS.md)