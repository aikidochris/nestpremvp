'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function togglePropertyFollow(propertyId: string, isCurrentlyFollowed: boolean) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { success: false, error: authError?.message ?? 'Not authenticated' }
  }

  try {
    if (isCurrentlyFollowed) {
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('user_id', user.id)
        .eq('property_id', propertyId)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from('follows')
        .insert({ user_id: user.id, property_id: propertyId })

      if (error) throw error
    }

    revalidatePath('/')
    revalidatePath('/home/[id]')

    return { success: true }
  } catch (err: any) {
    console.error('togglePropertyFollow error', err)
    return { success: false, error: err?.message ?? 'Unknown error' }
  }
}
