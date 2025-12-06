'use client'

import clsx from 'clsx'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback, useEffect, useMemo, type ChangeEvent, useRef } from 'react'
import { MessageCircle, Home as HomeIcon, Tag, Building2, Camera, ChevronLeft, ChevronRight, Plus, Trash2, Star, StarOff, Bell, FileText, Flame } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import ShopMap from '@/components/Map/MapWrapper'
import LayerToggle, { LayerState } from '@/components/Map/LayerToggle'
import ActivityFeedDrawer from '@/components/Feed/ActivityFeedDrawer'
import type L from 'leaflet'
import { uploadHomeStoryImages } from '@/lib/storage'
import type { MapProperty } from '@/components/Map/ShopMap'
import FloatingControls from '@/components/Map/FloatingControls'
import MapLegend from '@/components/Map/MapLegend'
import InboxModal from '@/components/Messaging/InboxModal'
import { useInbox } from '@/hooks/useInbox'
import FollowButton from '@/components/Social/FollowButton'
import { usePropertyFollows } from '@/hooks/usePropertyFollows'

interface User {
  id: string
  email?: string
}

interface HomeClientProps {
  shops: MapProperty[]
  user: User | null
  isAdmin: boolean
  initialFollowedIds?: string[]
}

type OwnerStatus = 'settled' | 'open' | 'sale' | 'rent'
type MessageMode = 'direct' | 'note' | 'future'

export default function HomeClient({ shops: initialShops, user: _user, isAdmin: _isAdmin, initialFollowedIds = [] }: HomeClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()
  const enableGeolocation = false // keep code for future reintroduction
  const [searchQuery, setSearchQuery] = useState('')
  const [shops, setShops] = useState<MapProperty[]>(initialShops)
  const [followedIds, setFollowedIds] = useState<string[]>(initialFollowedIds)
  const [mapCenter, setMapCenter] = useState<[number, number]>([54.9733, -1.6139]) // Default to Newcastle upon Tyne
  const [isLocating, setIsLocating] = useState(false)
  const [selectedHome, setSelectedHome] = useState<any | null>(null)
  const [claimRecord, setClaimRecord] = useState<any | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [, setAuthLoading] = useState(true)
  const [homeStory, setHomeStory] = useState<any | null>(null)
  const [storyLoading, setStoryLoading] = useState(false)
  const [storyError, setStoryError] = useState<string | null>(null)
  const [storySummary, setStorySummary] = useState('')
  const [storyImages, setStoryImages] = useState<string[]>([])
  const [editingStory, setEditingStory] = useState(false)
  const [savingStory, setSavingStory] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [newUploads, setNewUploads] = useState<{ url: string; file: File }[]>([])
  const [imageOrder, setImageOrder] = useState<string[]>([])
  const [storyForId, setStoryForId] = useState<string | null>(null)
  const [isOpenToTalking, setIsOpenToTalking] = useState(false)
  const [isCheckingClaim, setIsCheckingClaim] = useState(false)
  const [softListingLoading, setSoftListingLoading] = useState(false)
  const [softListingSaving, setSoftListingSaving] = useState(false)
  const [softListingError, setSoftListingError] = useState<string | null>(null)
  const [localForSale, setLocalForSale] = useState(false)
  const [localForRent, setLocalForRent] = useState(false)
  const [intentForId, setIntentForId] = useState<string | null>(null)
  const [intentOverrides, setIntentOverrides] = useState<Record<string, Partial<{
    is_for_sale: boolean
    is_for_rent: boolean
    is_open_to_talking: boolean
    is_claimed: boolean
    claimed_by_user_id: string | null
  }>>>({})
  const [mapRefreshSignal, setMapRefreshSignal] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [isListOpen, setIsListOpen] = useState<boolean>(false)
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'claimed'>('all')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [messageMode, setMessageMode] = useState<MessageMode>('direct')
  const [messageHeader, setMessageHeader] = useState('Message Owner')
  const [messageSubtext, setMessageSubtext] = useState<string | null>(null)
  const [messageBody, setMessageBody] = useState('')
  const [messageSending, setMessageSending] = useState(false)
  const [messageError, setMessageError] = useState<string | null>(null)
  const [messageSuccess, setMessageSuccess] = useState<string | null>(null)
  const [pendingRequestCount, setPendingRequestCount] = useState<number>(0)
  const [pendingNotesOpen, setPendingNotesOpen] = useState(false)
  const [pendingNotes, setPendingNotes] = useState<any[]>([])
  const [pendingNotesLoading, setPendingNotesLoading] = useState(false)
  const [pendingNotesError, setPendingNotesError] = useState<string | null>(null)
  const [isInboxOpen, setIsInboxOpen] = useState(false)
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [currentBounds, setCurrentBounds] = useState<L.LatLngBounds | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const mapMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingDeepLinkRef = useRef<MapProperty | null>(null)
  const deepLinkHandledRef = useRef<string | null>(null)
  const lastPendingUserKeyRef = useRef<string | null>(null)
  const { isFollowed, toggleFollow } = usePropertyFollows()
  const [heatmapMode, setHeatmapMode] = useState<'all' | 'market' | 'social' | null>(null)
  const [layerState, setLayerState] = useState<LayerState>({
    homes: true,
    heat: false,
    schools: false,
    transport: false,
  })

  const refreshPendingRequestCount = useCallback(async (userId: string | null | undefined, propertyId: string | null | undefined) => {
    if (!userId || !propertyId) {
      setPendingRequestCount((prev) => (prev === 0 ? prev : 0))
      lastPendingUserKeyRef.current = null
      return
    }

    const key = `${userId}|${propertyId}`
    if (lastPendingUserKeyRef.current === key) return
    lastPendingUserKeyRef.current = key

    const { count, error } = await (supabase as any)
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('property_id', propertyId)
      .neq('sender_id', userId)
      .in('status', ['unread', 'pending_request'])

    if (error) {
      console.error('Error fetching pending requests count', error)
      return
    }
    setPendingRequestCount((prev) => {
      const next = count ?? 0
      return prev === next ? prev : next
    })
  }, [supabase])

  const { threads, loading: inboxLoading, partnerProfiles, sendMessage: inboxSendMessage, markThreadRead } = useInbox(currentUser?.id ?? null)

  useEffect(() => {
    let mounted = true

    async function loadUser() {
      setAuthLoading(true)
      const { data, error } = await supabase.auth.getUser()
      if (!mounted) return

      if (!error) {
        setCurrentUser(data.user ?? null)
        if (data.user) {
          refreshPendingRequestCount(data.user.id)
        }
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
        if (session?.user) {
          refreshPendingRequestCount(session.user.id)
        } else {
          setPendingRequestCount(0)
        }
      }
    )

    loadUser()

    return () => {
      mounted = false
      subscription?.subscription?.unsubscribe()
    }
  }, [refreshPendingRequestCount, supabase])

  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }, [])

  const fetchUserShops = useCallback((center: [number, number], bounds?: L.LatLngBounds) => {
    if (fetchDebounceRef.current) {
      clearTimeout(fetchDebounceRef.current)
    }

    fetchDebounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams()

        if (bounds) {
          const sw = bounds.getSouthWest()
          const ne = bounds.getNorthEast()
          params.set('south', sw.lat.toString())
          params.set('west', sw.lng.toString())
          params.set('north', ne.lat.toString())
          params.set('east', ne.lng.toString())
        } else {
          const [lat, lon] = center
          const radiusKm = 10
          const deltaLat = radiusKm / 111
          const deltaLon = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1)
          params.set('south', (lat - deltaLat).toString())
          params.set('north', (lat + deltaLat).toString())
          params.set('west', (lon - deltaLon).toString())
          params.set('east', (lon + deltaLon).toString())
        }

        const url = `/api/properties?${params.toString()}`
        const response = await fetch(url)

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Received non-JSON response from API:', await response.text())
          throw new Error('API returned invalid format')
        }

        const json = await response.json()
        if (!response.ok) {
          throw new Error(json?.error || response.statusText || 'Failed to fetch properties')
        }

        setShops(json?.data || [])
      } catch (error) {
        console.error('Error fetching properties:', error)
      }
    }, 500)
  }, [])

  const handleMapMove = useCallback((center: [number, number], bounds: L.LatLngBounds) => {
    setMapCenter(center)
    setCurrentBounds((prev) => (prev && prev.equals(bounds) ? prev : bounds))
    fetchUserShops(center, bounds)
  }, [fetchUserShops])

  const handleLocationSelect = useCallback((lat: number, lon: number) => {
    const nextCenter: [number, number] = [lat, lon]
    setMapCenter(nextCenter)
    if (mapRef.current) {
      mapRef.current.flyTo(nextCenter, 16)
    }
  }, [])

  const onMapReady = useCallback((mapInstance: L.Map) => {
    mapRef.current = mapInstance
    setMapReady(true)
    setCurrentBounds((prev) => prev ?? mapInstance.getBounds())
    const pending = pendingDeepLinkRef.current
    if (pending) {
      mapInstance.flyTo([pending.lat, pending.lon], 18)
      pendingDeepLinkRef.current = null
    }
  }, [])

  useEffect(() => {
    // When we change home, clear old claim state first
    if (!selectedHome) {
      setClaimRecord(null)
      setClaimError(null)
      setEditingStory(false)
      setIsOpenToTalking(false)
      setIsCheckingClaim(false)
      setSoftListingLoading(false)
      setSoftListingSaving(false)
      setSoftListingError(null)
      setNewUploads([])
      setImageOrder([])
      setCurrentImageIndex(0)
      setIsMessageModalOpen(false)
      setMessageBody('')
      setMessageError(null)
      setMessageMode('direct')
      setMessageHeader('Message Owner')
      setMessageSubtext(null)
      setMessageSuccess(null)
      setMessageSending(false)
      setIsInboxOpen(false)
      setPendingNotesOpen(false)
      setPendingNotes([])
      setPendingNotesLoading(false)
      setPendingNotesError(null)
      setPendingRequestCount(0)
      setLocalForSale(false)
      setLocalForRent(false)
      setIntentForId(null)
      return
    }

    let isCancelled = false

    async function loadClaim() {
      setClaimRecord(null)
      setIsCheckingClaim(true)
      setClaimError(null)
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

      if (isCancelled) {
        setIsCheckingClaim(false)
        return
      }

      if (error) {
        // Log but don't keep stale claim
        console.error('Error loading claim record', error)
        setClaimRecord(null)
        setIsCheckingClaim(false)
        return
      }

      setClaimRecord(data ?? null)
      setIsCheckingClaim(false)
    }

    loadClaim()

    return () => {
      isCancelled = true
      setIsCheckingClaim(false)
    }
  }, [selectedHome?.id, supabase])

  useEffect(() => {
    if (!selectedHome) return

    let cancelled = false

    async function loadStory() {
      setStoryLoading(true)
      setStoryError(null)
      setStoryForId(null)
      setImageOrder([])
      setStoryImages([])
      setNewUploads([])
      setCurrentImageIndex(0)
      setStorySummary('')
      setEditingStory(false)
      setIsMessageModalOpen(false)
      setMessageBody('')
      setMessageError(null)
      setPendingNotesOpen(false)
      setPendingNotes([])
      setPendingNotesError(null)

      const currentRequestId = selectedHome.id

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
        setImageOrder([])
        setStoryError(error.message)
      } else {
        setHomeStory(data ?? null)
        setStorySummary(data?.summary_text ?? '')
        setStoryImages(data?.images ?? [])
        setImageOrder(data?.images ?? [])
        setStoryForId(currentRequestId)
        setCurrentImageIndex(0)
        setNewUploads([])
      }

      setStoryLoading(false)
    }

    loadStory()

    return () => {
      cancelled = true
    }
  }, [selectedHome?.id, supabase])

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
      const selectedHomeId = selectedHome.id

      const { data, error } = await supabase
        .from('intent_flags')
        .select('soft_listing,is_for_sale,is_for_rent')
        .eq('property_id', selectedHome.id)
        .eq('owner_id', currentUserId)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Error loading conversation intent', error)
        setSoftListingError('Could not load conversation preference.')
        setIsOpenToTalking(false)
      } else {
        const nextSoft = !!data?.soft_listing
        const nextSale = !!data?.is_for_sale
        const nextRent = !!data?.is_for_rent
        setIsOpenToTalking(nextSoft)
        setLocalForSale(nextSale)
        setLocalForRent(nextRent)
        setIntentForId(selectedHomeId)
        applyIntentOverride(selectedHomeId, {
          is_open_to_talking: nextSoft,
          is_for_sale: nextSale,
          is_for_rent: nextRent,
          claimed_by_user_id: claimRecord?.user_id ?? selectedHome?.claimed_by_user_id ?? currentUserId ?? null,
          is_claimed: true,
        })
        setShops((prev) =>
          prev.map((p) =>
            p.id === selectedHomeId
              ? { ...p, is_open_to_talking: nextSoft, is_for_sale: nextSale, is_for_rent: nextRent }
              : p
          )
        )
      }

      setSoftListingLoading(false)
    }

    loadSoftListing()

    return () => {
      cancelled = true
    }
  }, [selectedHome?.id, claimRecord, currentUser?.id, supabase])

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

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const mapInstance = mapRef.current

    const updateFromMap = () => {
      if (mapMoveTimeoutRef.current) {
        clearTimeout(mapMoveTimeoutRef.current)
      }
      mapMoveTimeoutRef.current = setTimeout(() => {
        const center = mapInstance.getCenter()
        const bounds = mapInstance.getBounds()
        handleMapMove([center.lat, center.lng], bounds)
      }, 250)
    }

    // initial sync
    updateFromMap()

    mapInstance.on('move', updateFromMap)
    mapInstance.on('moveend', updateFromMap)

    return () => {
      if (mapMoveTimeoutRef.current) {
        clearTimeout(mapMoveTimeoutRef.current)
      }
      mapInstance.off('move', updateFromMap)
      mapInstance.off('moveend', updateFromMap)
    }
  }, [handleMapMove, mapReady])

  const handleShopClick = (shop: MapProperty) => {
    setSelectedHome(shop)
    mapRef.current?.flyTo([shop.lat, shop.lon], 18, { animate: true, duration: 1.5 })
  }

  const buildDisplayLabel = useCallback((property: MapProperty) => {
    const { house_number, street, postcode } = property
    if (house_number && street) return `${house_number} ${street}${postcode ? `, ${postcode}` : ''}`
    if (street) return `${street}${postcode ? `, ${postcode}` : ''}`
    if (postcode) return postcode
    return 'Home'
  }, [])

  const buildAddressLine = useCallback((property: MapProperty) => {
    return property.postcode ?? property.street ?? 'No address'
  }, [])

  const computeIntentFlags = useCallback(() => {
    if (!selectedHome) return { sale: false, rent: false, open: false }
    const override = intentOverrides[selectedHome.id] || {}
    const sale = override.is_for_sale ?? selectedHome.is_for_sale ?? false
    const rent = override.is_for_rent ?? selectedHome.is_for_rent ?? false
    const open = override.is_open_to_talking ?? selectedHome.is_open_to_talking ?? false
    return { sale, rent, open }
  }, [intentOverrides, selectedHome])

  const applyIntentOverride = useCallback((propertyId: string, override: Partial<{
    is_for_sale: boolean
    is_for_rent: boolean
    is_open_to_talking: boolean
    is_claimed: boolean
    claimed_by_user_id: string | null
  }>) => {
    setIntentOverrides((prev) => ({
      ...prev,
      [propertyId]: { ...prev[propertyId], ...override },
    }))
  }, [])

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

  const handleOpenMessageModal = async () => {
    if (!selectedHome) return
    if (!currentUser) {
      router.push('/auth/login?redirect=/')
      return
    }

    const { sale, rent, open } = computeIntentFlags()
    const nextMode: MessageMode = sale || rent || open ? 'direct' : 'note'
    const header = nextMode === 'direct' ? 'Message Owner' : 'Leave an Interest Note'
    const subtext = nextMode === 'note'
      ? 'This owner isn\'t actively looking. We will let them know you are interested, but they may not reply immediately.'
      : null

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count: sentCount, error: rateLimitError } = await (supabase as any)
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_id', currentUser.id)
      .gte('created_at', since)

    if (rateLimitError) {
      console.error('Error checking message rate limit', rateLimitError)
      setMessageError('Could not start a new conversation right now.')
      return
    }

    if ((sentCount ?? 0) >= 5) {
      alert('You have reached your daily limit for starting new conversations.')
      return
    }

    const { data: existingThread, error: existingThreadError } = await (supabase as any)
      .from('messages')
      .select('*')
      .eq('sender_id', currentUser.id)
      .eq('property_id', selectedHome.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!existingThreadError && existingThread) {
      const threadId = (existingThread as any)?.thread_id ?? (existingThread as any)?.conversation_id ?? existingThread.id
      if (threadId) {
        router.push(`/messages/${threadId}`)
        return
      }
    } else if (existingThreadError) {
      console.error('Error checking existing thread', existingThreadError)
    }

    setMessageMode(nextMode)
    setMessageHeader(header)
    setMessageSubtext(subtext)
    setMessageBody('')
    setMessageError(null)
    setIsMessageModalOpen(true)
  }

  const handleSendMessage = async () => {
    if (!selectedHome || !currentUser) return
    const body = messageBody.trim()
    if (!body) {
      setMessageError('Please enter a message.')
      return
    }
    setMessageSending(true)
    setMessageError(null)

    try {
      const status = messageMode === 'direct' ? 'unread' : 'pending_request'
      const recipientId = messageMode === 'future' ? null : (claimRecord?.user_id ?? selectedHome.claimed_by_user_id ?? null)

      await inboxSendMessage(selectedHome.id, body, recipientId ?? null, status)

      setIsMessageModalOpen(false)
      setMessageBody('')
      setMessageMode('direct')
      setMessageHeader('Message Owner')
      setMessageSubtext(null)
      if (messageMode === 'future') {
        setMessageSuccess('Your note has been saved and will be delivered when the owner joins Nest.')
        setTimeout(() => setMessageSuccess(null), 4000)
      }
    } catch (err: any) {
      setMessageError(err.message ?? 'Failed to send message')
    } finally {
      setMessageSending(false)
    }
  }

  const handleStoryFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    const selected = files ? Array.from(files) : []
    if (!selected.length) return
    const allowed = Math.max(0, 4 - imageOrder.length)
    if (allowed <= 0) {
      alert('You can upload up to 4 photos. Remove one to add another.')
      return
    }
    const newFiles = selected.slice(0, allowed)
    if (newFiles.length < selected.length) {
      alert('Only the first 4 photos were added (max 4 total).')
    }
    const additions = newFiles.map((file) => ({ url: URL.createObjectURL(file), file }))
    const additionUrls = additions.map((a) => a.url)
    setNewUploads((prev) => {
      const next = [...prev, ...additions]
      return next
    })
    setImageOrder((prev) => [...prev, ...additionUrls])
    setCurrentImageIndex(imageOrder.length) // jump to first new image
    setEditingStory(true)
  }

  const handleDeleteImage = () => {
    if (!displayImages.length) return
    setEditingStory(true)
    setImageOrder((prev) => {
      const targetUrl = prev[currentImageIndex]
      const nextOrder = prev.filter((_, idx) => idx !== currentImageIndex)
      setStoryImages((imgs) => imgs.filter((img) => img !== targetUrl))
      setNewUploads((uploads) => {
        const nextUploads = uploads.filter((u) => u.url !== targetUrl)
        return nextUploads
      })
      setCurrentImageIndex((idx) => {
        const len = nextOrder.length
        if (len === 0) return 0
        return Math.min(idx, len - 1)
      })
      return nextOrder
    })
  }

  const handleMakeMain = () => {
    if (!displayImages.length || currentImageIndex === 0) return
    setEditingStory(true)
    setImageOrder((prev) => {
      const next = [...prev]
      const [item] = next.splice(currentImageIndex, 1)
      next.unshift(item)
      return next
    })
    setCurrentImageIndex(0)
  }

  const handleViewPendingNotes = async () => {
    if (!currentUser) return
    setPendingNotesLoading(true)
    setPendingNotesError(null)
    const { data, error } = await (supabase as any)
      .from('messages')
      .select('*')
      .eq('receiver_id', currentUser.id)
      .eq('status', 'pending_request')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading pending notes', error)
      setPendingNotesError('Unable to load notes right now.')
      setPendingNotes([])
    } else {
      setPendingNotes(data ?? [])
    }
    setPendingNotesOpen(true)
    setPendingNotesLoading(false)
    setIsInboxOpen(true)
  }

  const handleReplyToPendingNote = async (note: any) => {
    if (!note || !currentUser) return

    if (note.status === 'pending_request') {
      const confirmSwitch = window.confirm('Switch your status to Open to Talking to start this conversation?')
      if (!confirmSwitch) return

      const { error: intentError } = await (supabase as any)
        .from('intent_flags')
        .upsert(
          {
            property_id: note.property_id,
            owner_id: currentUser.id,
            soft_listing: true,
            is_for_sale: false,
            is_for_rent: false,
          },
          { onConflict: 'property_id' }
        )

      if (intentError) {
        console.error('Error updating intent flags for reply', intentError)
        alert('Could not enable conversations right now.')
        return
      }

      if (selectedHome?.id === note.property_id) {
        setIsOpenToTalking(true)
        setLocalForSale(false)
        setLocalForRent(false)
        setIntentForId(note.property_id)
        applyIntentOverride(note.property_id, {
          is_open_to_talking: true,
          is_for_sale: false,
          is_for_rent: false,
          claimed_by_user_id: currentUser.id,
          is_claimed: true,
        })
      }

      setMapRefreshSignal((s) => s + 1)
    }

    const { error: markError } = await (supabase as any)
      .from('messages')
      .update({ status: 'read' })
      .eq('id', note.id)

    if (markError) {
      console.error('Error marking note as read', markError)
      alert('Could not mark this note as read.')
      return
    }

    setPendingNotes((prev) => prev.filter((n) => n.id !== note.id))
    setPendingRequestCount((count) => Math.max(0, count - 1))
    alert('Status updated to Open to Talking. You can now continue the conversation from Messages.')
  }

  const handleSetOwnerStatus = async (nextStatus: 'settled' | 'open' | 'sale' | 'rent') => {
    if (!selectedHome || !currentUser) return
    if (!claimRecord || claimRecord.property_id !== selectedHome.id || claimRecord.user_id !== currentUser.id) return

    const prevSoft = isOpenToTalking
    const prevSale = localForSale
    const prevRent = localForRent

    const nextSoft = nextStatus === 'open' || nextStatus === 'sale' || nextStatus === 'rent'
    const nextSale = nextStatus === 'sale'
    const nextRent = nextStatus === 'rent'

    setIsOpenToTalking(nextSoft)
    setLocalForSale(nextSale)
    setLocalForRent(nextRent)
    setIntentForId(selectedHome.id)
    applyIntentOverride(selectedHome.id, {
      is_open_to_talking: nextSoft,
      is_for_sale: nextSale,
      is_for_rent: nextRent,
      claimed_by_user_id: currentUser.id,
      is_claimed: true,
    })
    setSoftListingSaving(true)
    setSoftListingError(null)

    const { error } = await supabase
      .from('intent_flags')
      .upsert(
        {
          property_id: selectedHome.id,
          owner_id: currentUser.id,
          soft_listing: nextSoft,
          is_for_sale: nextSale,
          is_for_rent: nextRent,
        },
        { onConflict: 'property_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('Error updating owner status', error)
      setIsOpenToTalking(prevSoft)
      setLocalForSale(prevSale)
      setLocalForRent(prevRent)
      applyIntentOverride(selectedHome.id, {
        is_open_to_talking: prevSoft,
        is_for_sale: prevSale,
        is_for_rent: prevRent,
      })
      setSoftListingError(error.message ?? 'Failed to update preference.')
      setSoftListingSaving(false)
      return
    }

    setShops((prev) =>
      prev.map((p) =>
        p.id === selectedHome.id
          ? { ...p, is_open_to_talking: nextSoft, is_for_sale: nextSale, is_for_rent: nextRent }
          : p
      )
    )

    // Bump refresh signal so the map fetches latest flags
    setMapRefreshSignal((s) => s + 1)

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
      const uploadMap = new Map(newUploads.map((u) => [u.url, u.file]))
      const pendingUploads = imageOrder.filter((url) => uploadMap.has(url))
      const filesToUpload = pendingUploads.map((url) => uploadMap.get(url)).filter((file): file is File => !!file)

      let uploadedUrls: string[] = []
      if (filesToUpload.length) {
        uploadedUrls = await uploadHomeStoryImages(supabase, selectedHome.id, filesToUpload)
      }

      let uploadIndex = 0
      const finalImages = imageOrder
        .map((url) => {
          if (uploadMap.has(url)) {
            const uploaded = uploadedUrls[uploadIndex]
            uploadIndex += 1
            return uploaded ?? null
          }
          return url
        })
        .filter((url): url is string => !!url)

      const { data, error } = await supabase
        .from('home_story')
        .upsert(
          {
            property_id: selectedHome.id,
            summary_text: storySummary || null,
            images: finalImages.length ? finalImages : null,
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
      setStoryImages(data?.images ?? finalImages)
      setImageOrder(data?.images ?? finalImages)
      setNewUploads([])
      setCurrentImageIndex(0)
      setEditingStory(false)
    } catch (err: any) {
      setStoryError(err.message ?? 'Failed to save home story')
    } finally {
      setSavingStory(false)
    }
  }

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
  const isClaimedByYou = isOwner
  const ownerStatus: OwnerStatus = localForSale
    ? 'sale'
    : localForRent
      ? 'rent'
      : isOpenToTalking
        ? 'open'
        : 'settled'
  const displayImages = imageOrder
  const storyMatchesSelection = storyForId === selectedHome?.id

  const renderOwnershipControls = () => {
    if (claimRecord && claimRecord.property_id === selectedHome?.id && claimRecord.user_id === currentUserId) {
      return (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Owner controls</p>
              <p className="text-xs text-gray-600">Choose how you want to signal intent.</p>
              {softListingError && (
                <p className="mt-1 text-xs text-red-600">{softListingError}</p>
              )}
              {!softListingError && (softListingLoading || softListingSaving) && (
                <p className="mt-1 text-xs text-gray-500">
                  {softListingLoading ? 'Loading preference...' : 'Saving...'}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'settled', label: 'Settled', description: 'No active signals', tone: 'neutral', icon: <HomeIcon className="h-4 w-4" /> },
              { key: 'open', label: 'Open to Talking', description: 'Soft listing', tone: 'teal', icon: <MessageCircle className="h-4 w-4" /> },
              { key: 'sale', label: 'For Sale', description: 'High intent', tone: 'coral', icon: <Tag className="h-4 w-4" /> },
              { key: 'rent', label: 'For Rent', description: 'Rental interest', tone: 'rent', icon: <Building2 className="h-4 w-4" /> },
            ].map((option) => {
              const isActive = ownerStatus === option.key
              const activeClass =
                option.tone === 'teal'
                  ? 'bg-[#007C7C] border-[#007C7C] text-white'
                  : option.tone === 'coral'
                    ? 'bg-[#E65F52] border-[#E65F52] text-white'
                    : option.tone === 'rent'
                      ? 'bg-[#6366F1] border-[#6366F1] text-white'
                      : 'bg-slate-900 border-slate-900 text-white'

              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => handleSetOwnerStatus(option.key as OwnerStatus)}
                  disabled={softListingLoading || softListingSaving}
                  className={clsx(
                    'w-full rounded-xl border p-4 text-left transition-all flex flex-col items-start gap-1',
                    softListingLoading || softListingSaving ? 'opacity-60 cursor-not-allowed' : 'hover:border-slate-300',
                    isActive ? activeClass : 'bg-white border-slate-200 text-slate-600'
                  )}
                >
                  <div className="flex items-center gap-2">
                    {option.icon}
                    <p className="text-sm font-semibold">
                      {option.label}
                    </p>
                  </div>
                  <p className={clsx('text-xs', isActive ? 'text-white/90' : 'text-slate-500')}>
                    {option.description}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (claimRecord && claimRecord.property_id === selectedHome?.id) {
      return (
        <div className="w-full rounded-lg border border-amber-200 bg-amber-50 text-amber-800 px-3 py-2 text-sm font-semibold">
          Property claimed
        </div>
      )
    }

    return (
      <>
        <button
          className="w-full bg-[#007C7C] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#006868] disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={handleClaimHome}
          disabled={claiming}
        >
          {claiming ? 'Claiming...' : 'Claim this home'}
        </button>
        <button
          type="button"
          className="w-full py-3 mt-3 bg-white border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm"
          onClick={() => {
            setMessageMode('future')
            setMessageHeader('Leave a note for the future owner')
            setMessageSubtext('This home isn\'t claimed yet. We\'ll save your note and notify the owner the moment they join Nest.')
            setMessageBody('')
            setMessageError(null)
            setIsMessageModalOpen(true)
          }}
        >
          <FileText className="h-4 w-4" />
          Leave note for owner
        </button>
      </>
    )
  }
  const statusBadge = selectedHome
    ? isOpenToTalking
      ? { label: 'Open to talking', classes: 'bg-[#007C7C]/10 text-[#007C7C]' }
      : selectedHome.is_claimed
        ? { label: 'Claimed', classes: 'bg-orange-100 text-orange-800' }
        : { label: 'Unclaimed', classes: 'bg-slate-100 text-slate-700' }
    : null
  const effectiveIntentFlags = computeIntentFlags()
  const messageCtaMode: MessageMode = effectiveIntentFlags.sale || effectiveIntentFlags.rent || effectiveIntentFlags.open ? 'direct' : 'note'
  const messageButtonLabel = messageCtaMode === 'direct' ? 'Message owner' : 'Leave interest note'
  const canMessageOwner = !!(selectedHome && !isClaimedByYou && (selectedHome.is_claimed || claimRecord))

  useEffect(() => {
    const userId = currentUser?.id ?? null
    const propertyId = isClaimedByYou ? selectedHome?.id ?? null : null
    if (!userId || !propertyId) {
      setPendingRequestCount((prev) => (prev === 0 ? prev : 0))
      lastPendingUserKeyRef.current = null
      return
    }
    refreshPendingRequestCount(userId, propertyId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  const selectedHomeTitle = selectedHome
    ? (`${selectedHome?.house_number ?? ''} ${selectedHome?.street ?? ''}`.trim() ||
      selectedHome?.name ||
      'Home')
    : ''
  const selectedHomeAddress = selectedHome
    ? (selectedHome?.postcode ?? selectedHome?.street ?? 'No address')
    : ''

  // Sync displayed intent flags when selection changes
  useEffect(() => {
    if (!selectedHome) {
      setLocalForSale(false)
      setLocalForRent(false)
      setIntentForId(null)
      return
    }
    setLocalForSale(!!selectedHome.is_for_sale)
    setLocalForRent(!!selectedHome.is_for_rent)
    setIntentForId(selectedHome.id)
  }, [selectedHome?.id])

  useEffect(() => {
    setIsMessageModalOpen(false)
    setMessageBody('')
    setMessageError(null)
    setMessageMode('direct')
    setMessageHeader('Message Owner')
    setMessageSubtext(null)
    setMessageSuccess(null)
    setMessageSending(false)
  }, [selectedHome?.id])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    router.push('/')
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsListOpen(window.innerWidth >= 768)
    }
  }, [])

  useEffect(() => {
    const propertyId = searchParams?.get('propertyId')
    const openInbox = searchParams?.get('openInbox') === 'true'
    if (!propertyId) return
    if (!mapReady || !mapRef.current) return
    if (deepLinkHandledRef.current === propertyId && !openInbox) return

    const fetchProperty = async (): Promise<MapProperty | null> => {
      const existing = shops.find((s) => s.id === propertyId)
      if (existing) return existing

      const { data, error } = await supabase
        .from('properties_public_view')
        .select('*')
        .eq('id', propertyId)
        .single()

      if (error) {
        console.error('Deep link supabase error', error)
        return null
      }

      if (data) {
        const casted = data as MapProperty
        setShops((prev) => (prev.some((p) => p.id === casted.id) ? prev : [...prev, casted]))
        return casted
      }
      return null
    }

    const handleDeepLink = async () => {
      const target = await fetchProperty()

      if (!target) return

      setSelectedHome(target)
      mapRef.current?.flyTo([target.lat, target.lon], 18)
      if (openInbox) setIsInboxOpen(true)

      deepLinkHandledRef.current = propertyId

      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const url = new URL(window.location.href)
        url.searchParams.delete('propertyId')
        url.searchParams.delete('openInbox')
        const nextSearch = url.searchParams.toString()
        window.history.replaceState(null, '', nextSearch ? `${url.pathname}?${nextSearch}` : url.pathname)
      }
    }

    handleDeepLink()
  }, [searchParams, supabase, mapReady])

  const filteredShops = shops.filter((home) => {
    if (activeFilter === 'open' && !home.is_open_to_talking) return false
    if (activeFilter === 'claimed' && !home.is_claimed) return false

    if (searchQuery.trim()) {
      const haystack = [
        home.house_number ?? '',
        home.street ?? '',
        home.postcode ?? '',
        home.name ?? '',
      ]
        .join(' ')
        .toLowerCase()
      const needle = searchQuery.trim().toLowerCase()
      if (!haystack.includes(needle)) return false
    }

    return true
  })
  const visibleShops = useMemo(
    () =>
      filteredShops.filter((shop) =>
        currentBounds ? currentBounds.contains([shop.lat, shop.lon]) : true
      ),
    [filteredShops, currentBounds]
  )
  const activeShops = useMemo(
    () =>
      visibleShops.filter(
        (s) => s.is_open_to_talking || s.is_claimed || s.is_for_sale || s.is_for_rent
      ),
    [visibleShops]
  )

  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const pending = pendingDeepLinkRef.current
    if (pending) {
      mapRef.current.flyTo([pending.lat, pending.lon], 18)
      pendingDeepLinkRef.current = null
    }
  }, [mapReady])

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white">
      <div className="absolute inset-0 z-0 h-screen">
        <ShopMap
          center={mapCenter}
          zoom={13}
          onShopClick={handleShopClick}
          currentUserId={currentUserId}
          refreshSignal={mapRefreshSignal}
          activeFilter={activeFilter}
          intentOverrides={intentOverrides}
          onMapReady={onMapReady}
          heatmapMode={layerState.heat ? 'all' : null}
          activeLayers={layerState}
        />
      </div>

      <LayerToggle layers={layerState} onLayerChange={setLayerState} />

      <FloatingControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLocationSelect={handleLocationSelect}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isListOpen={isListOpen}
        onToggleList={() => setIsListOpen((prev) => !prev)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenInbox={() => setIsInboxOpen(true)}
        onOpenActivity={() => setIsActivityOpen(true)}
        heatmapMode={heatmapMode}
        onSetHeatmapMode={setHeatmapMode}
      />
      <ActivityFeedDrawer
        userId={currentUser?.id}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />
      <div className="z-40">
        <MapLegend />
      </div>

      {!isListOpen && (
        <div className="absolute left-4 top-24 z-30 hidden md:flex">
          <button
            type="button"
            onClick={() => setIsListOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md border border-white/30 px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg hover:bg-white transition"
          >
            {activeShops.length.toLocaleString('en-GB')} Active Homes
          </button>
        </div>
      )}

      {isListOpen && (
        <div
          className={clsx(
            "fixed inset-x-0 bottom-0 h-[40vh] w-full rounded-t-2xl border-t border-white/20 bg-white/90 backdrop-blur-md shadow-2xl overflow-y-auto z-20 transition-all duration-300 ease-out",
            "md:fixed md:left-4 md:top-28 md:bottom-4 md:w-80 md:h-auto md:rounded-xl md:border md:border-white/20"
          )}
        >
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Homes in view</p>
              <p className="text-xs text-slate-500">{visibleShops.length.toLocaleString('en-GB')} homes</p>
            </div>
            <button
              className="text-xs text-slate-500 hover:text-slate-700"
              onClick={() => setIsListOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50/50 border border-slate-100 backdrop-blur-sm p-3 mb-1 text-center">
              <div className="flex flex-col items-center gap-1">
                <MessageCircle className="h-4 w-4 text-[#007C7C]" />
                <p className="text-xs font-semibold text-slate-700">Open</p>
                <p className="text-sm font-bold text-slate-900">
                  {activeShops.filter((home) => home.is_open_to_talking).length}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Flame className="h-4 w-4 text-[#E65F52]" />
                <p className="text-xs font-semibold text-slate-700">Active</p>
                <p className="text-sm font-bold text-slate-900">
                  {activeShops.filter((home) => home.is_for_sale || home.is_for_rent).length}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <HomeIcon className="h-4 w-4 text-[#F5A623]" />
                <p className="text-xs font-semibold text-slate-700">Claimed</p>
                <p className="text-sm font-bold text-slate-900">
                  {activeShops.filter((home) => home.is_claimed).length}
                </p>
              </div>
            </div>

            {activeShops.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-6">
                No active signals in this view. Be the first to claim!
              </div>
            ) : (
              activeShops.map((home) => {
                const label = buildDisplayLabel(home)
                const address = buildAddressLine(home)
                const isOpen = !!home.is_open_to_talking
                const isActive = !!home.is_for_sale || !!home.is_for_rent
                const isClaimed = !!home.is_claimed
                const containerClasses = clsx(
                  "w-full text-left mb-3 p-3 rounded-xl border border-transparent transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer bg-white/60 backdrop-blur-md",
                  isOpen
                    ? "border-l-4 border-l-teal-500 bg-teal-50/30"
                    : isActive
                      ? "border-l-4 border-l-rose-500 bg-red-50/30"
                      : isClaimed
                        ? "border-l-4 border-l-slate-500"
                        : "border-l-4 border-l-gray-200"
                )
                const badgeClasses = clsx(
                  "text-[11px] px-2 py-1 rounded-full font-semibold",
                  isOpen
                    ? "bg-[#007C7C]/10 text-[#007C7C]"
                    : isActive
                      ? "bg-[#E65F52]/10 text-[#E65F52]"
                      : isClaimed
                        ? "bg-slate-100 text-slate-700 border border-slate-200"
                        : "bg-slate-100 text-slate-600"
                )
                const badgeLabel = isOpen
                  ? "Open"
                  : isActive
                    ? home.is_for_sale
                      ? "For Sale"
                      : "For Rent"
                    : isClaimed
                      ? "Claimed"
                      : "Unclaimed"

                return (
                  <button
                    key={home.id}
                    onClick={() => handleShopClick(home)}
                    className={containerClasses}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-slate-900 text-sm line-clamp-1">{label}</p>
                      <span className={badgeClasses}>{badgeLabel}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{address}</p>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      {selectedHome && (
        <div
          className="fixed inset-x-0 bottom-0 h-[60vh] w-full bg-white/95 backdrop-blur-xl shadow-2xl border border-gray-200 rounded-t-2xl p-0 z-[60] flex flex-col overflow-hidden transition-all duration-300 ease-out md:inset-auto md:right-4 md:top-24 md:bottom-4 md:w-80 md:h-auto md:rounded-2xl"
        >
          {/* Hero */}
          <div className="relative h-64 w-full bg-slate-100 group">
            <div className="absolute top-3 right-3 z-20 flex items-center gap-3">
              <FollowButton
                propertyId={selectedHome.id}
                initialIsFollowed={followedIds.includes(selectedHome.id)}
                onToggleSuccess={(isNowFollowed) => {
                  setFollowedIds((prev) => {
                    if (isNowFollowed) {
                      if (prev.includes(selectedHome.id)) return prev
                      return [...prev, selectedHome.id]
                    }
                    return prev.filter((id) => id !== selectedHome.id)
                  })
                }}
              />
              <button
                onClick={() => setSelectedHome(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            {storyLoading && !storyMatchesSelection ? (
              <div className="h-full w-full bg-slate-200 animate-pulse" />
            ) : displayImages.length === 0 ? (
              <button
                type="button"
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-500 transition"
                onClick={() => {
                  if (!isClaimedByYou) return
                  fileInputRef.current?.click()
                }}
                disabled={!isClaimedByYou}
              >
                <Camera className="h-10 w-10" />
                <span className="text-sm font-medium">Add photos of your home</span>
              </button>
            ) : (
              <div className="relative h-full w-full overflow-hidden">
                <img
                  src={displayImages[currentImageIndex]}
                  alt="Home"
                  className="h-full w-full object-cover"
                />

                {displayImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow hover:bg-white focus:outline-none"
                      onClick={() => setCurrentImageIndex((idx) => (idx === 0 ? displayImages.length - 1 : idx - 1))}
                      aria-label="Previous photo"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-slate-700 shadow hover:bg-white focus:outline-none"
                      onClick={() => setCurrentImageIndex((idx) => (idx === displayImages.length - 1 ? 0 : idx + 1))}
                      aria-label="Next photo"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                      {currentImageIndex + 1} / {displayImages.length}
                    </span>
                  </>
                )}

                {isClaimedByYou && (
                  <>
                    <button
                      type="button"
                      className="absolute top-3 right-12 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow hover:bg-white"
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Add photo"
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="absolute top-3 left-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-600 shadow hover:bg-white"
                      onClick={handleDeleteImage}
                      aria-label="Delete photo"
                      disabled={!displayImages.length}
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow hover:bg-white"
                      onClick={handleMakeMain}
                      disabled={!displayImages.length}
                    >
                      {currentImageIndex === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[#007C7C]">
                          <Star className="h-4 w-4 fill-[#007C7C] text-[#007C7C]" />
                          Main Photo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <StarOff className="h-4 w-4" />
                          Make Main
                        </span>
                      )}
                    </button>
                  </>
                )}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handleStoryFileChange}
            />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  {selectedHomeTitle}
                </h2>
                {isClaimedByYou && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
                    Verified Owner
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 mt-1">
                {selectedHomeAddress}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isCheckingClaim ? (
                <div className="h-5 w-32 bg-slate-200 rounded animate-pulse"></div>
              ) : (
                <>
                  {statusBadge && (
                    <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${statusBadge.classes}`}>
                      {statusBadge.label}
                    </span>
                  )}
                  {claimRecord && claimRecord.property_id === selectedHome.id && isClaimedByYou && (
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700">
                      Claimed by you
                    </span>
                  )}
                </>
              )}
            </div>

            {canMessageOwner && (
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:border-slate-300"
                onClick={handleOpenMessageModal}
              >
                <MessageCircle className="h-4 w-4" />
                {messageButtonLabel}
              </button>
            )}

            {isClaimedByYou && pendingRequestCount > 0 && (
              <div className="rounded-xl border border-teal-100 bg-teal-50 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-[#007C7C]">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#007C7C]">
                      {pendingRequestCount} {pendingRequestCount === 1 ? 'person has' : 'people have'} left notes for you.
                    </p>
                    <p className="text-xs text-[#007C7C]">Open them when you are ready to reply.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#007C7C] shadow-sm hover:bg-teal-100"
                  onClick={handleViewPendingNotes}
                >
                  View
                </button>
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-900">What are your plans?</h4>
              {renderOwnershipControls()}
            </div>

            {claimError && (
              <div className="text-sm text-red-600">
                {claimError}
              </div>
            )}

            {!propertyIsClaimed && (
              <p className="text-xs text-gray-500">
                Claim this home to mark it as open to conversations.
              </p>
            )}

            <div className="pt-2 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">About this home</h3>
                {homeStory && isClaimedByYou && !editingStory && (
                  <button
                    className="text-sm text-amber-700 hover:text-amber-800 font-semibold"
                    onClick={() => setEditingStory(true)}
                  >
                    Edit
                  </button>
                )}
              </div>

              {storyLoading || !storyMatchesSelection ? (
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                  <div className="h-16 w-full bg-slate-200 rounded animate-pulse"></div>
                </div>
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
                            <textarea
                              value={storySummary}
                              onChange={(e) => setStorySummary(e.target.value)}
                              rows={4}
                              className="w-full min-h-[120px] bg-slate-50 border-0 rounded-xl p-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                              placeholder="Tell neighbors what you love about living here..."
                            />
                          </div>

                          {homeStory && (
                            <div className="flex justify-end">
                              <button
                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                onClick={() => {
                                  setEditingStory(false)
                                  setStorySummary(homeStory?.summary_text ?? '')
                                  setStoryImages(homeStory?.images ?? [])
                                  setImageOrder(homeStory?.images ?? [])
                                  setNewUploads([])
                                  setCurrentImageIndex(0)
                                  setStoryError(null)
                                }}
                                type="button"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
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

            {isClaimedByYou && (editingStory || !homeStory) && (
              <button
                className="mt-4 w-full py-3.5 rounded-full font-semibold text-white bg-[#007C7C] shadow-lg transition-transform active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                onClick={handleSaveStory}
                disabled={savingStory}
              >
                {savingStory ? 'Saving...' : 'Update details'}
              </button>
            )}
          </div>
        </div>
      )}

      <InboxModal
        open={isInboxOpen}
        onClose={() => {
          setIsInboxOpen(false)
        }}
        threads={threads}
        loading={inboxLoading}
        currentUserId={currentUserId ?? null}
        partnerProfiles={partnerProfiles}
        onSend={async (propertyId, body, receiverId) => {
          await inboxSendMessage(propertyId, body, receiverId ?? null, 'unread')
        }}
        onMarkRead={(propertyId, partnerId) => markThreadRead(propertyId, partnerId)}
      />

      {messageSuccess && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[80] rounded-full bg-[#007C7C] text-white px-4 py-2 shadow-lg">
          {messageSuccess}
        </div>
      )}

      {isMessageModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 p-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{messageHeader}</h3>
                {messageSubtext && (
                  <p className="mt-1 text-xs text-slate-500">{messageSubtext}</p>
                )}
              </div>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                onClick={() => setIsMessageModalOpen(false)}
                aria-label="Close message modal"
              >
                &times;
              </button>
            </div>

            <div className="p-4 space-y-3">
              <textarea
                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-[#007C7C] focus:outline-none focus:ring-2 focus:ring-[#007C7C]/20"
                rows={4}
                placeholder={
                  messageMode === 'direct'
                    ? 'Write a message to the owner...'
                    : messageMode === 'future'
                      ? 'Leave a note for the future owner...'
                      : 'Tell the owner you are interested...'
                }
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
              />
              {messageError && (
                <p className="text-xs text-red-600">{messageError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-4">
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                onClick={() => setIsMessageModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#007C7C] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#006868] disabled:opacity-60"
                onClick={handleSendMessage}
                disabled={messageSending || !messageBody.trim()}
              >
                {messageSending
                  ? 'Sending...'
                  : messageMode === 'direct'
                    ? 'Send message'
                    : 'Send note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
