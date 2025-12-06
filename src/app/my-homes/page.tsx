'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { MessageCircle, Home as HomeIcon, Tag, Building2, Bell, LogOut } from 'lucide-react'

type ClaimRecord = {
  property_id: string
  properties?: any
  home_story?: any
  intent_flags?: any
}

type PropertyCard = {
  id: string
  address: string
  postcode?: string | null
  image?: string | null
  intent: 'open' | 'sale' | 'rent' | 'claimed' | 'unclaimed'
  messageCount: number
}

function buildAddress(p?: any) {
  if (!p) return 'Home'
  const { house_number, street, postcode } = p
  if (house_number && street) return `${house_number} ${street}${postcode ? `, ${postcode}` : ''}`
  if (street) return `${street}${postcode ? `, ${postcode}` : ''}`
  if (postcode) return postcode
  return 'Home'
}

function getIntent(flags?: any): 'open' | 'sale' | 'rent' | 'claimed' | 'unclaimed' {
  if (!flags) return 'unclaimed'
  if (flags.is_for_sale) return 'sale'
  if (flags.is_for_rent) return 'rent'
  if (flags.soft_listing || flags.is_open_to_talking) return 'open'
  return 'claimed'
}

function intentBadge(intent: PropertyCard['intent']) {
  switch (intent) {
    case 'open':
      return { label: 'Open to talking', classes: 'bg-[#007C7C]/10 text-[#007C7C]' }
    case 'sale':
      return { label: 'For sale', classes: 'bg-[#E65F52]/10 text-[#E65F52]' }
    case 'rent':
      return { label: 'For rent', classes: 'bg-[#6366F1]/10 text-[#6366F1]' }
    case 'claimed':
      return { label: 'Claimed', classes: 'bg-amber-100 text-amber-700' }
    default:
      return { label: 'Unclaimed', classes: 'bg-slate-100 text-slate-600' }
  }
}

export default function MyHomesPage() {
  const supabase = getSupabaseClient()
  const [claims, setClaims] = useState<PropertyCard[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData?.user?.id ?? null
      setUserEmail(userData?.user?.email ?? null)
      if (!uid) {
        setClaims([])
        setLoading(false)
        return
      }

      const { data: claimRows, error } = await supabase
        .from('property_claims')
        .select(`
          id,
          status,
          property_id,
          property:properties (
            id,
            street,
            house_number,
            postcode,
            town,
            home_story ( images ),
            intent_flags ( soft_listing, is_for_sale, is_for_rent )
          )
        `)
        .eq('user_id', uid)

      if (error || !claimRows) {
        console.error('Error loading claims', error)
        setClaims([])
        setLoading(false)
        return
      }

      console.log('Dashboard Claims:', claimRows)

      const claimsList: ClaimRecord[] = claimRows as any

      // Fetch message counts per property (includes honey pot: receiver null)
      const counts = await Promise.all(
        claimsList.map(async (row) => {
          const propertyId = (row as any)?.property_id ?? (row as any)?.property?.id
          if (!propertyId) return 0
          const { count, error: countError } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('property_id', propertyId)
            .or(`receiver_id.eq.${uid},receiver_id.is.null`)

          if (countError) {
            console.error('Message count error', countError)
            return 0
          }
          return count ?? 0
        })
      )

      const cards: PropertyCard[] = claimsList.map((row: any, idx) => {
        const property = row.property
        const flagsRaw = property?.intent_flags
        const flags = Array.isArray(flagsRaw) ? flagsRaw[0] : flagsRaw
        const storyRaw = property?.home_story
        const story = Array.isArray(storyRaw) ? storyRaw[0] : storyRaw
        const intent = getIntent(flags)
        return {
          id: property?.id ?? row.property_id,
          address: buildAddress(property),
          postcode: property?.postcode ?? null,
          image: Array.isArray(story?.images) && story.images.length > 0 ? story.images[0] : null,
          intent,
          messageCount: counts[idx] ?? 0,
        }
      })

      if (active) {
        setClaims(cards)
        setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [supabase])

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading your homes...
        </div>
      )
    }
    if (!claims.length) {
      return (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">You haven&apos;t claimed a home yet.</p>
          <p className="mt-2 text-sm text-slate-500">Find your home on the map to get started.</p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-[#007C7C] px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-[#006868]"
          >
            Find my home on the map
          </Link>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        {claims.map((claim) => {
          const badge = intentBadge(claim.intent)
          return (
            <div
              key={claim.id}
              className="flex flex-col md:flex-row overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              <div className="w-full md:w-64 h-48 bg-slate-100 flex items-center justify-center">
                {claim.image ? (
                  <img src={claim.image} alt={claim.address} className="h-full w-full object-cover" />
                ) : (
                  <div className="text-sm text-slate-500">No image</div>
                )}
              </div>
              <div className="flex-1 p-6 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-bold text-slate-900">{claim.address}</p>
                    {claim.postcode && <p className="text-sm text-slate-500">{claim.postcode}</p>}
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.classes}`}>
                    {badge.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Bell className="h-4 w-4 text-amber-500" />
                    {claim.messageCount} Messages
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/?propertyId=${claim.id}`}
                    className="inline-flex items-center justify-center rounded-full bg-[#007C7C] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#006868]"
                  >
                    Manage Home
                  </Link>
                  <Link
                    href={`/?propertyId=${claim.id}&openInbox=true`}
                    className="inline-flex items-center justify-center rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300"
                  >
                    View Messages
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }, [claims, loading])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur border-b border-slate-100">
        <Link href="/" className="text-2xl font-bold tracking-tight text-slate-900">
          Nest
        </Link>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          {userEmail && <span className="hidden sm:inline">{userEmail}</span>}
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/'
            }}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto space-y-6">
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-3xl font-bold text-slate-900">Welcome home</p>
          <p className="mt-1 text-slate-600">Manage your properties and messages.</p>
        </section>

        <section>{content}</section>

        <section className="text-sm text-slate-600">
          Need help?{' '}
          <a href="mailto:support@nest.com" className="text-[#007C7C] font-semibold hover:underline">
            Contact Support
          </a>
        </section>
      </main>
    </div>
  )
}
