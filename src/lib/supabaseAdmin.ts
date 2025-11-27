import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

/**
 * Create a Supabase client using the service role key.
 * Intended for Node/CLI scripts only. Do not use in browser or React components.
 */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE')
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
