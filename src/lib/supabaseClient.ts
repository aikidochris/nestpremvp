import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

let client: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  if (!client) {
    client = createClient<Database>(url, key)
  }

  return client
}
