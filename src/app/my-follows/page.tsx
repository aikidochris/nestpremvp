import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { UnfollowButton } from './UnfollowButton'

type FollowedProperty = {
  property_id: string
  street?: string | null
  house_number?: string | null
  postcode?: string | null
  is_claimed?: boolean | null
  is_open_to_talking?: boolean | null
  is_for_sale?: boolean | null
  is_for_rent?: boolean | null
}

export default async function MyFollowsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirect=/my-follows')
  }

  const { data: follows, error: followsError } = await supabase
    .from('follows')
    .select('property_id')
    .eq('user_id', user.id)
    .eq('follow_type', 'property')
    .order('created_at', { ascending: false })

  if (followsError) {
    console.error('[my-follows] load follows error', followsError)
    return <div className="p-6 text-sm text-slate-600">Unable to load follows right now.</div>
  }

  const propertyIds = (follows ?? []).map((f) => f.property_id).filter(Boolean)

  let properties: FollowedProperty[] = []
  if (propertyIds.length) {
    const { data: props, error: propsError } = await supabase
      .from('property_public_view')
      .select('property_id, street, house_number, postcode, is_claimed, is_open_to_talking, is_for_sale, is_for_rent')
      .in('property_id', propertyIds)

    if (propsError) {
      console.error('[my-follows] load properties error', propsError)
    } else {
      properties = props ?? []
    }
  }

  const propertyMap = new Map(properties.map((p) => [p.property_id, p]))
  const ordered = propertyIds
    .map((id) => propertyMap.get(id))
    .filter((p): p is FollowedProperty => !!p)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Your follows</p>
            <h1 className="text-2xl font-bold text-slate-900">My Follows</h1>
          </div>
          <Link
            href="/"
            className="rounded-full bg-white/90 backdrop-blur-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-white transition"
          >
            Back to map
          </Link>
        </div>

        {ordered.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white/80 backdrop-blur-md shadow-sm p-6 text-slate-600">
            You haven&apos;t followed any homes yet.
          </div>
        ) : (
          <div className="space-y-3">
            {ordered.map((home) => {
              const address = [home.house_number, home.street].filter(Boolean).join(' ') || home.postcode || 'Home'
              const status = home.is_open_to_talking
                ? 'Open to talking'
                : home.is_for_sale
                  ? 'For sale'
                  : home.is_for_rent
                    ? 'For rent'
                    : home.is_claimed
                      ? 'Claimed'
                      : 'Unclaimed'

              return (
                <div
                  key={home.property_id}
                  className="rounded-2xl border border-slate-100 bg-white/90 backdrop-blur-md shadow-sm p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{address}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">{status}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/?propertyId=${home.property_id}`}
                      className="text-xs font-semibold text-[#007C7C] hover:underline"
                    >
                      View on map
                    </Link>
                    <UnfollowButton propertyId={home.property_id} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
