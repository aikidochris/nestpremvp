'use client'

import { useState } from 'react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabaseClient'

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

interface Props {
  homes: HomeRow[]
  currentUserId: string
}

export default function MyHomesClient({ homes, currentUserId }: Props) {
  const supabase = getSupabaseClient()
  const [items, setItems] = useState<HomeRow[]>(homes)
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string | null>>({})

  const handleToggleOpen = async (homeId: string, nextValue: boolean) => {
    setSavingIds((prev) => new Set(prev).add(homeId))
    setErrors((prev) => ({ ...prev, [homeId]: null }))
    setItems((prev) =>
      prev.map((h) => (h.id === homeId ? { ...h, is_open_to_talking: nextValue } : h))
    )

    const { error } = await supabase
      .from('intent_flags')
      .upsert(
        {
          property_id: homeId,
          owner_id: currentUserId,
          soft_listing: nextValue,
        },
        { onConflict: 'property_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error updating open to talking', error)
      setErrors((prev) => ({
        ...prev,
        [homeId]: error.message ?? 'Failed to update preference',
      }))
      // revert
      setItems((prev) =>
        prev.map((h) => (h.id === homeId ? { ...h, is_open_to_talking: !nextValue } : h))
      )
    }

    setSavingIds((prev) => {
      const next = new Set(prev)
      next.delete(homeId)
      return next
    })
  }

  if (!items.length) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4">
        <div className="max-w-xl w-full bg-white border border-stone-200 rounded-2xl p-6 shadow-sm text-center space-y-4">
          <h1 className="text-2xl font-bold text-stone-900">My homes</h1>
          <p className="text-stone-700">
            You haven’t claimed any homes yet. Claim a home from the map to see it here.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition"
          >
            Go to map
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-stone-900">My homes</h1>
            <p className="text-stone-600">Homes you have claimed.</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition"
          >
            Back to map
          </Link>
        </div>

        <div className="grid gap-4">
          {items.map((home) => {
            const canEdit = home.claimed_by_user_id === currentUserId
            const saving = savingIds.has(home.id)
            const error = errors[home.id]
            const title =
              (home.house_number ? `${home.house_number} ` : '') +
              (home.street ?? 'Unknown street')

            return (
              <div
                key={home.id}
                className="bg-white border border-stone-200 rounded-xl p-4 shadow-sm flex flex-col gap-3"
              >
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
                    <p className="text-sm text-stone-600">{home.postcode ?? 'No postcode'}</p>
                    {home.price_estimate !== null && (
                      <p className="text-sm text-stone-700 mt-1">Estimate: £{home.price_estimate}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Claimed
                    </span>
                    {home.is_for_sale && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                        For sale
                      </span>
                    )}
                    {home.is_for_rent && (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                        For rent
                      </span>
                    )}
                    {home.is_open_to_talking ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700">
                        Open to conversations
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-stone-100 text-stone-700">
                        Not open
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleOpen(home.id, !home.is_open_to_talking)}
                      disabled={!canEdit || saving}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                        !canEdit || saving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      } ${home.is_open_to_talking ? 'bg-emerald-600' : 'bg-stone-300'}`}
                      aria-pressed={home.is_open_to_talking}
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                          home.is_open_to_talking ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="text-sm font-semibold text-stone-900">Open to conversations</p>
                      <p className="text-xs text-stone-600">
                        {home.is_open_to_talking
                          ? 'People can reach out to chat.'
                          : 'Toggle on to allow conversations.'}
                      </p>
                    </div>
                  </div>
                  {!canEdit && (
                    <p className="text-xs text-stone-500">Read-only (not claimed by you)</p>
                  )}
                  {saving && <p className="text-xs text-stone-500">Saving...</p>}
                  {error && <p className="text-xs text-red-600">{error}</p>}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/?propertyId=${home.id}`}
                    className="px-3 py-2 rounded-lg bg-stone-100 text-stone-800 text-sm font-semibold hover:bg-stone-200 transition"
                  >
                    Edit home story
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
