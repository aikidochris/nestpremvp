'use client'

import { useRouter } from 'next/navigation'
import { useState, useCallback, useEffect, type ChangeEvent } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import ShopMap from '@/components/Map/MapWrapper'
import type L from 'leaflet'
import { uploadHomeStoryImages } from '@/lib/storage'

interface Shop {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  crypto_accepted: string[]
  source?: 'user' | 'osm'
  shop_type?: string
  website?: string | null
  phone?: string | null
  opening_hours?: string | null
}

interface User {
  id: string
  email?: string
}

interface HomeClientProps {
  shops: Shop[]
  user: User | null
  isAdmin: boolean
}

export default function HomeClient({ shops: initialShops, user, isAdmin }: HomeClientProps) {
  const router = useRouter()
  const supabase = getSupabaseClient()
  const enableGeolocation = false // keep code for future reintroduction
  const [searchQuery, setSearchQuery] = useState('')
  const [shops, setShops] = useState<Shop[]>(initialShops)
  const [mapCenter, setMapCenter] = useState<[number, number]>([54.9733, -1.6139]) // Default to Newcastle upon Tyne
  const [isLocating, setIsLocating] = useState(false)
  const [selectedHome, setSelectedHome] = useState<any | null>(null)
  const [claimRecord, setClaimRecord] = useState<any | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [homeStory, setHomeStory] = useState<any | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)
  const [storyError, setStoryError] = useState<string | null>(null)
  const [storySummary, setStorySummary] = useState('')
  const [storyFiles, setStoryFiles] = useState<File[]>([])
  const [storyImages, setStoryImages] = useState<string[]>([])
  const [editingStory, setEditingStory] = useState(false)
  const [savingStory, setSavingStory] = useState(false)
  const [isOpenToTalking, setIsOpenToTalking] = useState(false)
  const [softListingLoading, setSoftListingLoading] = useState(false)
  const [softListingSaving, setSoftListingSaving] = useState(false)
  const [softListingError, setSoftListingError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      setAuthLoading(true)
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return

      if (!error) {
        setCurrentUser(data.user ?? null)
      } else {
        console.error('[Auth] getUser error', error)
        setCurrentUser(null)
      }
      setAuthLoading(false)
    }

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return
        console.log('[Auth] onAuthStateChange', _event, session?.user?.email)
        setCurrentUser(session?.user ?? null)
      }
    )

    loadUser()

    return () => {
      mounted = false
      subscription?.subscription?.unsubscribe()
    }
  }, [supabase])

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }, [])

  const fetchUserShops = useCallback(async (center: [number, number], bounds?: L.LatLngBounds) => {
    try {
      let url: string

      if (bounds) {
        const sw = bounds.getSouthWest()
        const ne = bounds.getNorthEast()
        url = `/api/shops?swLat=${sw.lat}&swLng=${sw.lng}&neLat=${ne.lat}&neLng=${ne.lng}`
      } else {
        url = `/api/shops?lat=${center[0]}&lng=${center[1]}&radius=10`
      }

      const response = await fetch(url)

      if (response.ok) {
        const { data } = await response.json()
        setShops(data || [])
      } else {
        console.error('Failed to fetch user shops:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching user shops:', error)
    }
  }, [])

  const handleMapMove = useCallback((center: [number, number], bounds: L.LatLngBounds) => {
    setMapCenter(center)
    fetchUserShops(center, bounds)
  }, [fetchUserShops])

  useEffect(() => {
    // When we change home, clear old claim state first
    if (!selectedHome) {
      setClaimRecord(null)
      setClaimError(null)
      setHomeStory(null)
      setStoryError(null)
      setStorySummary('')
      setStoryFiles([])
      setStoryImages([])
      setEditingStory(false)
      setIsOpenToTalking(false)
      setSoftListingLoading(false)
      setSoftListingSaving(false)
      setSoftListingError(null)
      return
    }

    let isCancelled = false

    async function loadClaim() {
      setClaimRecord(null)
      setClaimError(null)
      setHomeStory(null)
      setStoryError(null)
      setStorySummary('')
      setStoryFiles([])
      setStoryImages([])
      setEditingStory(false)
      setIsOpenToTalking(false)
      setSoftListingLoading(false)
      setSoftListingSaving(false)
      setSoftListingError(null)

      const { data, error } = await supabase
        .from('property_claims')
        .select('*')
        .eq('property_id', selectedHome.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (isCancelled) return

      if (error) {
        // Log but don’t keep stale claim
        console.error('Error loading claim record', error)
        setClaimRecord(null)
        return
      }

      setClaimRecord(data ?? null)
    }

    loadClaim()

    return () => {
      isCancelled = true
    }
  }, [selectedHome, supabase])

  useEffect(() => {
    if (!selectedHome) return

    let cancelled = false

    async function loadStory() {
      setStoryLoading(true)
      setStoryError(null)

      const { data, error } = await supabase
        .from('home_story')
        .select('*')
        .eq('property_id', selectedHome.id)
        .maybeSingle()

      if (cancelled) {
        setStoryLoading(false)
        return
      }

      if (error) {
        console.error('Error loading home story', error)
        setHomeStory(null)
        setStorySummary('')
        setStoryImages([])
        setStoryError(error.message)
      } else {
        setHomeStory(data ?? null)
        setStorySummary(data?.summary_text ?? '')
        setStoryImages(data?.images ?? [])
      }

      setStoryLoading(false)
    }

    loadStory()

    return () => {
      cancelled = true
    }
  }, [selectedHome, supabase])

  useEffect(() => {
    const currentUserId = currentUser?.id
    const propertyClaimedByCurrentUser =
      !!currentUserId &&
      !!selectedHome &&
      !!claimRecord &&
      claimRecord.property_id === selectedHome.id &&
      claimRecord.user_id === currentUserId

    if (!selectedHome || !propertyClaimedByCurrentUser) {
      setIsOpenToTalking(false)
      setSoftListingError(null)
      setSoftListingLoading(false)
      return
    }

    let cancelled = false

    async function loadSoftListing() {
      setSoftListingLoading(true)
      setSoftListingError(null)

      const { data, error } = await supabase
        .from('intent_flags')
        .select('soft_listing')
        .eq('property_id', selectedHome.id)
        .eq('owner_id', currentUserId)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Error loading conversation intent', error)
        setSoftListingError('Could not load conversation preference.')
        setIsOpenToTalking(false)
      } else {
        setIsOpenToTalking(!!data?.soft_listing)
      }

      setSoftListingLoading(false)
    }

    loadSoftListing()

    return () => {
      cancelled = true
    }
  }, [selectedHome, claimRecord, currentUser?.id, supabase])

  useEffect(() => {
    if (!enableGeolocation) {
      fetchUserShops(mapCenter)
      return
    }

    if ('geolocation' in navigator) {
      setIsLocating(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLocation: [number, number] = [
            position.coords.latitude,
            position.coords.longitude
          ]
          setMapCenter(userLocation)
          fetchUserShops(userLocation)
          setIsLocating(false)
        },
        (error) => {
          console.log('Geolocation error:', error.message, '- using default location')
          fetchUserShops(mapCenter)
          setIsLocating(false)
        },
        {
          timeout: 5000,
          maximumAge: 300000,
        }
      )
    } else {
      fetchUserShops(mapCenter)
    }
  }, []) // Only run once on mount

  const getVisibleShops = useCallback(() => {
    return shops.map(shop => ({ ...shop, source: 'user' as const }))
  }, [shops])

  const handleShopClick = (shop: Shop) => {
    router.push(`/shops/${shop.id}`)
  }

  const handleClaimHome = async () => {
    if (!selectedHome) return

    setClaimError(null)

    if (!currentUser) {
      router.push('/auth/login?redirect=/')
      return
    }

    setClaiming(true)

    const { error } = await supabase
      .from('property_claims')
      .insert({
        property_id: selectedHome.id,
        user_id: currentUser.id,
        status: 'claimed',
      })

    setClaiming(false)

    if (error) {
      setClaimError(error.message)
      return
    }

    const { data: latest, error: latestError } = await supabase
      .from('property_claims')
      .select('*')
      .eq('property_id', selectedHome.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!latestError) {
      setClaimRecord(latest ?? null)
    }
  }

  const handleStoryFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    setStoryFiles(files ? Array.from(files) : [])
  }

  const handleRemoveExistingImage = (url: string) => {
    setStoryImages((prev) => prev.filter((img) => img !== url))
  }

  const handleToggleSoftListing = async () => {
    if (!selectedHome || !currentUser) return
    if (!claimRecord || claimRecord.property_id !== selectedHome.id || claimRecord.user_id !== currentUser.id) return

    const previous = isOpenToTalking
    const next = !isOpenToTalking

    setIsOpenToTalking(next)
    setSoftListingSaving(true)
    setSoftListingError(null)

    const { error } = await supabase
      .from('intent_flags')
      .upsert(
        {
          property_id: selectedHome.id,
          owner_id: currentUser.id,
          soft_listing: next,
        },
        { onConflict: 'property_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error updating conversation intent', error)
      setIsOpenToTalking(previous)
      setSoftListingError(error.message ?? 'Failed to update conversation preference.')
    }

    setSoftListingSaving(false)
  }

  const handleSaveStory = async () => {
    if (!selectedHome) return
    if (!isClaimedByYou) {
      setStoryError('Only the claimant can edit this home story.')
      return
    }

    setSavingStory(true)
    setStoryError(null)

    try {
      let uploadedUrls: string[] = []

      if (storyFiles.length) {
        uploadedUrls = await uploadHomeStoryImages(supabase, selectedHome.id, storyFiles)
      }

      const mergedImages = [...storyImages, ...uploadedUrls]

      const { data, error } = await supabase
        .from('home_story')
        .upsert(
          {
            property_id: selectedHome.id,
            summary_text: storySummary || null,
            images: mergedImages.length ? mergedImages : null,
          },
          { onConflict: 'property_id' } // respect unique constraint for one story per property
        )
        .select('*')
        .single()

      if (error) {
        setStoryError(error.message)
        return
      }

      setHomeStory(data)
      setStoryFiles([])
      setStoryImages(data?.images ?? mergedImages)
      setEditingStory(false)
    } catch (err: any) {
      setStoryError(err.message ?? 'Failed to save home story')
    } finally {
      setSavingStory(false)
    }
  }

  const visibleShops = getVisibleShops()
  const currentUserId = currentUser?.id
  const propertyIsClaimed = !!(
    claimRecord &&
    selectedHome &&
    claimRecord.property_id === selectedHome.id
  )
  const isOwner = !!(
    propertyIsClaimed &&
    currentUserId &&
    claimRecord?.user_id === currentUserId
  )
  const canEditOpenToTalking = !!(isOwner && currentUserId)
  const isClaimedByYou = isOwner

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 to-amber-50">
      <header className="bg-white shadow-lg border-b-4 border-orange-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-6xl">�~</span>
              <div>
                <h1 className="text-4xl font-black text-gray-900">
                  Bitcoin<span className="text-orange-600">Latte</span>
                </h1>
                <p className="text-gray-600 font-semibold">Find Bitcoin-Friendly Coffee Shops</p>
              </div>
            </div>
            <div className="flex gap-3 items-center">
              {(isAdmin && currentUser) && (
                <a
                  href="/admin"
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-all hover:scale-105 shadow-lg"
                >
                  �Y'' Admin
                </a>
              )}
              <a
                href="/shops/submit"
                className="px-6 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-all hover:scale-105 shadow-lg"
              >
                �z Add Shop
              </a>
              {authLoading ? (
                <div className="px-4 py-2 bg-gray-100 border rounded-lg text-sm text-gray-600">
                  Checking session...
                </div>
              ) : currentUser ? (
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 bg-green-100 border-2 border-green-500 rounded-lg">
                    <span className="text-green-700 font-bold text-sm">
                      �o" {currentUser.email}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-6 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition-all hover:scale-105 shadow-lg"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <a
                  href="/auth/login"
                  className="px-6 py-3 bg-gray-800 text-white rounded-lg font-bold hover:bg-gray-900 transition-all hover:scale-105 shadow-lg"
                >
                  Login
                </a>
              )}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Search coffee shops, cities, or cryptocurrencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-14 text-lg border-2 border-gray-300 rounded-xl focus:border-orange-500 focus:ring-4 focus:ring-orange-200 outline-none transition-all"
            />
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">�Y"?</span>
          </div>
        </div>
      </header>

      <div className="bg-white border-b-2 border-gray-200 py-6 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-4">
                <span className="text-5xl">�Y?�</span>
                <div>
                  <p className="text-4xl font-black">{shops.length}</p>
                  <p className="text-orange-100 font-bold uppercase text-sm">Coffee Shops</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-yellow-500 text-white p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-4">
                <span className="text-5xl">�'�</span>
                <div>
                  <p className="text-3xl font-black">Bitcoin</p>
                  <p className="text-amber-100 font-bold uppercase text-sm">Accepted</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-400 text-white p-6 rounded-2xl shadow-xl">
              <div className="flex items-center gap-4">
                <span className="text-5xl">�s�</span>
                <div>
                  <p className="text-3xl font-black">Lightning</p>
                  <p className="text-yellow-100 font-bold uppercase text-sm">Fast Payments</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 flex flex-col">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col gap-6">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-orange-500 flex-1 flex flex-col relative">
            {isLocating && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                <span className="font-semibold">Finding your location...</span>
              </div>
            )}
            <div className="flex-1 w-full h-full">
              <ShopMap
                shops={[]} // data comes from /api/properties
                center={mapCenter}
                zoom={13}
                onShopClick={(shop) => setSelectedHome(shop)}
                onMapMove={handleMapMove}
                currentUserId={currentUserId}
              />
            </div>
          </div>

          {selectedHome && (
            <div className="fixed right-4 top-4 w-80 bg-white shadow-xl border border-gray-200 rounded-2xl p-5 z-[1100]">
              
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-semibold text-lg text-gray-900 leading-tight">
                  {selectedHome.name}
                </h2>
                <button
                  onClick={() => setSelectedHome(null)}
                  className="text-gray-400 hover:text-gray-600 text-sm"
                >
                  ?o
                </button>
              </div>

              {/* Address */}
              <p className="text-sm text-gray-700 mb-4">
                {selectedHome.address}
              </p>

              {/* Status */}
              <div className="mb-4">
                {!claimRecord && (
                  <span className="inline-block px-2 py-1 text-xs rounded-md bg-amber-100 text-amber-800 font-medium">
                    Unclaimed
                  </span>
                )}
                {claimRecord && isClaimedByYou && (
                  <span className="inline-block px-2 py-1 text-xs rounded-md bg-green-100 text-green-800 font-medium">
                    Claimed by you
                  </span>
                )}
                {claimRecord && !isClaimedByYou && claimRecord.property_id === selectedHome.id && (
                  <span className="inline-block px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 font-medium">
                    Already claimed
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {!claimRecord && (
                  <button
                    className="w-full bg-amber-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    onClick={handleClaimHome}
                    disabled={claiming}
                  >
                    {claiming ? 'Claiming...' : 'Claim this home'}
                  </button>
                )}

                {claimRecord && isClaimedByYou && (
                  <button
                    className="w-full bg-gray-100 text-gray-800 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                    disabled
                  >
                    You already claimed this home
                  </button>
                )}

                {claimRecord && !isClaimedByYou && claimRecord.property_id === selectedHome.id && (
                  <button
                    className="w-full bg-gray-100 text-gray-800 py-2 rounded-lg text-sm font-medium cursor-not-allowed"
                    disabled
                  >
                    Already claimed
                  </button>
                )}

                <button
                  className="w-full bg-gray-100 text-gray-800 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                  onClick={() => alert("Future: full property sheet")}
                >
                  See more ??'
                </button>
              </div>

              {claimError && (
                <div className="mt-2 text-sm text-red-600">
                  {claimError}
                </div>
              )}

              {canEditOpenToTalking && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Open to conversations about this home</p>
                      <p className="text-xs text-gray-600">
                        {isOpenToTalking
                          ? 'People can reach out to chat about this property.'
                          : 'Toggle on if you want to chat with interested people.'}
                      </p>
                      {softListingError && (
                        <p className="mt-1 text-xs text-red-600">{softListingError}</p>
                      )}
                      {!softListingError && (softListingLoading || softListingSaving) && (
                        <p className="mt-1 text-xs text-gray-500">
                          {softListingLoading ? 'Loading preference...' : 'Saving...'}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleSoftListing}
                      disabled={softListingLoading || softListingSaving}
                      className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition ${
                        softListingLoading || softListingSaving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      } ${isOpenToTalking ? 'bg-amber-600' : 'bg-gray-300'}`}
                      aria-pressed={isOpenToTalking}
                      aria-label="Open to conversations toggle"
                    >
                      <span
                        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                          isOpenToTalking ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {!propertyIsClaimed && (
                <p className="mt-4 text-xs text-gray-500">
                  Claim this home to mark it as open to conversations.
                </p>
              )}

              <div className="mt-6 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900">Home Story</h3>
                  {homeStory && isClaimedByYou && !editingStory && (
                    <button
                      className="text-sm text-amber-700 hover:text-amber-800 font-semibold"
                      onClick={() => setEditingStory(true)}
                    >
                      Edit
                    </button>
                  )}
                </div>

                {storyLoading ? (
                  <div className="text-sm text-gray-500">Loading home story...</div>
                ) : (
                  <>
                    {storyError && (
                      <div className="mb-3 text-sm text-red-600">
                        {storyError}
                      </div>
                    )}

                    {isClaimedByYou ? (
                      <>
                        {(!homeStory || editingStory) ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-gray-800 block mb-1">
                                Summary
                              </label>
                              <textarea
                                value={storySummary}
                                onChange={(e) => setStorySummary(e.target.value)}
                                rows={4}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                                placeholder="Share a short story about this home..."
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-gray-800 block mb-1">
                                Photos
                              </label>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleStoryFileChange}
                                className="w-full text-sm text-gray-700"
                              />
                              {storyFiles.length > 0 && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {storyFiles.length} file{storyFiles.length > 1 ? 's' : ''} selected
                                </div>
                              )}
                              {storyImages.length ? (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  {storyImages.map((url: string) => (
                                    <div key={url} className="relative group">
                                      <img
                                        src={url}
                                        alt="Home story"
                                        className="h-16 w-full object-cover rounded-md border"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveExistingImage(url)}
                                        className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition"
                                        aria-label="Remove image"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>

                            <div className="flex gap-2">
                              <button
                                className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={handleSaveStory}
                                disabled={savingStory}
                              >
                                {savingStory ? 'Saving...' : 'Save story'}
                              </button>
                              {homeStory && (
                                <button
                                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                  onClick={() => {
                                    setEditingStory(false)
                                    setStoryFiles([])
                                    setStorySummary(homeStory?.summary_text ?? '')
                                    setStoryImages(homeStory?.images ?? [])
                                    setStoryError(null)
                                  }}
                                  type="button"
                                >
                                  Cancel
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {homeStory?.summary_text ? (
                              <p className="text-sm text-gray-800 whitespace-pre-line">
                                {homeStory.summary_text}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500">No story added yet.</p>
                            )}
                            {homeStory?.images?.length ? (
                              <div className="grid grid-cols-3 gap-2">
                                {homeStory.images.map((url: string) => (
                                  <img
                                    key={url}
                                    src={url}
                                    alt="Home story"
                                    className="h-16 w-full object-cover rounded-md border"
                                  />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {homeStory ? (
                          <div className="space-y-2">
                            {homeStory.summary_text ? (
                              <p className="text-sm text-gray-800 whitespace-pre-line">
                                {homeStory.summary_text}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-500">No story text provided.</p>
                            )}
                            {homeStory.images?.length ? (
                              <div className="grid grid-cols-3 gap-2">
                                {homeStory.images.map((url: string) => (
                                  <img
                                    key={url}
                                    src={url}
                                    alt="Home story"
                                    className="h-16 w-full object-cover rounded-md border"
                                  />
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">No home story yet.</p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

            </div>
          )}

          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border-4 border-orange-500 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-gray-900">
                �Y"? Shops in View
              </h2>
              <div className="text-sm">
                <span className="font-bold text-gray-900">{visibleShops.length}</span>
                <span className="text-gray-600"> shops visible</span>
              </div>
            </div>

            {visibleShops.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">�Y"?</div>
                <p className="text-xl font-bold text-gray-700 mb-2">No shops found</p>
                <p className="text-gray-600">
                  Try zooming out or exploring another area to see shops
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleShops
                  .sort((a, b) => {
                    const distA = calculateDistance(mapCenter[0], mapCenter[1], a.latitude, a.longitude)
                    const distB = calculateDistance(mapCenter[0], mapCenter[1], b.latitude, b.longitude)
                    return distA - distB
                  })
                  .map((shop) => {
                    const distance = calculateDistance(
                      mapCenter[0],
                      mapCenter[1],
                      shop.latitude,
                      shop.longitude
                    )

                    return (
                      <div
                        key={shop.id}
                        className="bg-gradient-to-br from-amber-50 to-orange-100 border-orange-300 border-2 rounded-xl p-4 hover:shadow-lg transition-all cursor-pointer hover:scale-105"
                        onClick={() => handleShopClick(shop)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-lg text-gray-900 flex-1">
                            {shop.name}
                          </h3>
                          <span className="text-xs px-2 py-1 rounded-full font-semibold bg-amber-200 text-amber-800">
                            User
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                          {shop.address}
                        </p>

                        <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                          <span>�Y"?</span>
                          <span className="font-semibold">
                            {distance < 1
                              ? `${(distance * 1000).toFixed(0)}m away`
                              : `${distance.toFixed(1)}km away`}
                          </span>
                        </div>

                        {shop.shop_type && (
                          <p className="text-xs text-gray-600 mb-2">
                            <span className="font-semibold">Type:</span> {shop.shop_type}
                          </p>
                        )}

                        {shop.crypto_accepted && shop.crypto_accepted.length > 0 && (
                          <div className="flex gap-1 flex-wrap mb-3">
                            {shop.crypto_accepted.map((crypto) => (
                              <span
                                key={crypto}
                                className={`px-2 py-1 text-xs rounded-md font-bold ${
                                  crypto === 'BTC'
                                    ? 'bg-orange-200 text-orange-800'
                                    : crypto === 'BCH'
                                    ? 'bg-green-200 text-green-800'
                                    : crypto === 'LTC'
                                    ? 'bg-blue-200 text-blue-800'
                                    : crypto === 'XMR'
                                    ? 'bg-purple-200 text-purple-800'
                                    : 'bg-gray-200 text-gray-800'
                                }`}
                              >
                                {crypto}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShopClick(shop)
                          }}
                          className="w-full mt-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-bold transition-colors"
                        >
                          View Details ��'
                        </button>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-gray-900 text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">�YO?</span>
              <p className="font-bold text-lg">
                Empowering the Bitcoin economy, one coffee at a time
              </p>
            </div>
            <div className="flex gap-6">
              <a href="/about" className="font-bold hover:text-orange-400 transition-colors">
                About
              </a>
              <a
                href="https://github.com/profullstack/bitcoinlatte"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold hover:text-orange-400 transition-colors flex items-center gap-2"
              >
                GitHub <span>��-</span>
              </a>
            </div>
          </div>
          <div className="text-center text-sm text-gray-400 border-t border-gray-800 pt-4">
            &copy; 2025{' '}
            <a
              href="https://profullstack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-orange-400 transition-colors font-semibold"
            >
              Profullstack, Inc.
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
