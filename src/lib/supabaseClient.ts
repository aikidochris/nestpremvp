import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'
import { type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient<Database> | null = null

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')

  if (!client) {
    client = createBrowserClient<Database>(url, key)
  }

  return client
}
