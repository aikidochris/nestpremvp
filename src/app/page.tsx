import { createClient } from '@/lib/supabase/server'
import HomeClient from './HomeClient'
import type { Database } from '@/lib/database.types'

export default async function Home() {
  const supabase = await createClient()
  
  // Fetch initial properties (limited sample to seed UI)
  const { data: shops } = await supabase
    .from('properties_public_view')
    .select('id,uprn,postcode,street,house_number,lat,lon,price_estimate,claimed_by_user_id,is_claimed,is_open_to_talking,is_for_sale,is_for_rent,has_recent_activity')
    .limit(200)
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch user profile to check admin status
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single<Database['public']['Tables']['profiles']['Row']>()
    
    isAdmin = profile?.role === 'admin'
  }
  
  return <HomeClient shops={shops || []} user={user} isAdmin={isAdmin} />
}
