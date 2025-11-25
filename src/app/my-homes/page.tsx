import Link from 'next/link'
import MyHomesClient from './MyHomesClient'
import { createClient } from '@/lib/supabase/server'

type HomeRow = {
  id: string
  uprn: string | null
  postcode: string | null
  street: string | null
  house_number: string | null
  lat: number
  lon: number
  price_estimate: number | null
  claimed_by_user_id: string | null
  is_claimed: boolean
  is_open_to_talking: boolean
  is_for_sale: boolean
  is_for_rent: boolean
  has_recent_activity: boolean
}

export default async function MyHomesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-stone-200 rounded-2xl p-6 shadow-sm text-center space-y-4">
          <h1 className="text-2xl font-bold text-stone-900">My homes</h1>
          <p className="text-stone-700">Sign in to view your homes.</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition"
          >
            Back to map
          </Link>
        </div>
      </div>
    )
  }

  const { data, error } = await supabase
    .from('properties_public_view')
    .select(
      `
      id,
      uprn,
      postcode,
      street,
      house_number,
      lat,
      lon,
      price_estimate,
      claimed_by_user_id,
      is_claimed,
      is_open_to_talking,
      is_for_sale,
      is_for_rent,
      has_recent_activity
    `
    )
    .eq('claimed_by_user_id', user.id)

  if (error) {
    console.error('Error loading homes for dashboard', error)
  }

  const homes = (data as HomeRow[] | null) ?? []

  return <MyHomesClient homes={homes} currentUserId={user.id} />
}
