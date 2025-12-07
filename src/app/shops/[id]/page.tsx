import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ShopDetailClient from '@/components/Shop/ShopDetailClient'
import ShopMap from '@/components/Map/MapWrapper'
import { ArrowLeft } from 'lucide-react'

// Force dynamic rendering so we always get fresh data
export const dynamic = 'force-dynamic'

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch BASIC Shop Data (Images, Comments)
  // This table ('shops') handles the user-generated content part
  const { data: shopData, error: shopError } = await supabase
    .from('shops')
    .select(`
      *,
      shop_images (*),
      comments (
        *,
        profiles (display_name, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (shopError) {
    console.error('Error fetching shop:', shopError)
  }

  // 2. Fetch WORLD CLASS Data (Price, EPC, Address)
  // This comes from our new View ('property_public_view')
  const { data: propertyData, error: propError } = await supabase
    .from('property_public_view')
    .select(`
      last_sale_price,
      last_sale_date,
      energy_rating,
      epc_floor_area,
      epc_property_type,
      display_label,
      street,
      house_number,
      postcode
    `)
    .eq('property_id', id)
    .single()

  if (propError) {
    console.error('Error fetching property insights:', propError)
  }

  // If both fail, 404
  if (!shopData && !propertyData) {
    notFound()
  }

  // 3. Merge them into one "Super Object"
  const shop = {
    ...shopData,
    ...propertyData, // Overwrite with enriched fields
    // Ensure votes exist even if null
    votes: { quality_score: 0, bitcoin_verified_score: 0, total_votes: 0 }
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-stone-900/80 backdrop-blur-md border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Map</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column: Images & Story */}
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery (Placeholder or Real) */}
            <div className="aspect-video bg-stone-200 dark:bg-stone-800 rounded-2xl overflow-hidden relative group">
              {shop.shop_images && shop.shop_images.length > 0 ? (
                <img
                  src={shop.shop_images[0].image_url}
                  alt={shop.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-stone-400">
                  <div className="text-center">
                    <p className="text-4xl mb-2">🏠</p>
                    <p>No photos yet</p>
                  </div>
                </div>
              )}
            </div>

            {/* Title & Address */}
            <div>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 mb-2">
                {shop.display_label || shop.name}
              </h1>
              <p className="text-lg text-stone-500 dark:text-stone-400 flex items-center gap-2">
                📍 {shop.street}, {shop.postcode}
              </p>
            </div>

            {/* Client Component: Insights, Votes, Comments */}
            <ShopDetailClient
              shopId={id}
              votes={shop.votes}
              shop={shop}
            />
          </div>

          {/* Right Column: Sidebar (Location & Meta) */}
          <div className="space-y-6">
            <div className="glass-effect rounded-2xl shadow-lg p-6 border border-stone-200 dark:border-stone-800 sticky top-24">
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mb-4">Location</h3>
              <div className="h-48 rounded-xl overflow-hidden mb-4 border border-stone-100 dark:border-stone-700">
                <ShopMap shops={[shop]} center={[shop.latitude || 55.0, shop.longitude || -1.5]} zoom={15} />
              </div>

              {/* Quick Actions */}
              <button className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95">
                Is this your home?
              </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}