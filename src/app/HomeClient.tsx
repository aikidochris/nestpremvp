'use client'

import clsx from 'clsx'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useCallback, useEffect, useMemo, type ChangeEvent, useRef } from 'react'
import { MessageCircle, Home as HomeIcon, Tag, Building2, Camera, ChevronLeft, ChevronRight, Plus, Trash2, Star, StarOff, Bell, FileText, Edit2, MapPin, Save, X } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import ShopMap from '@/components/Map/MapWrapper'
import ActivityFeedDrawer from '@/components/Feed/ActivityFeedDrawer'
import type L from 'leaflet'
import { uploadHomeStoryImages } from '@/lib/storage'
import type { MapProperty } from '@/types/models'
import type { Database } from '../lib/database.types'
import FloatingControls from '@/components/Map/FloatingControls'
import InboxModal from '@/components/Messaging/InboxModal'
import { useInbox } from '@/hooks/useInbox'
import FollowButton from '@/components/Social/FollowButton'
import { usePropertyFollows } from '@/hooks/usePropertyFollows'
import FilterModal, { FilterState } from '@/components/UI/FilterModal'
import AreaPulsePanel from '@/components/Map/AreaPulsePanel'
import PropertyInsights from '@/components/Shop/PropertyInsights'
import { useProperties } from '@/hooks/useProperties'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import HomeStorySection from '@/components/Shop/HomeStorySection'
import MessageModal from '@/components/Messaging/MessageModal'
import OwnerChecklist from '@/components/Shop/OwnerChecklist'
import HomeFactsEditor from '@/components/Shop/HomeFactsEditor'
import FlagModal from '@/components/UI/FlagModal'
import { useConfetti } from '@/hooks/useConfetti'
import { calculateProfileStrength } from '@/lib/profileLogic'
import HomeStoryDisplay from '@/components/Shop/HomeStoryDisplay'




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

export default function HomeClient({ shops: initialShops, user: _user, isAdmin, initialFollowedIds = [] }: HomeClientProps) {

  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = getSupabaseClient()
  const { fireCelebration } = useConfetti()
  const enableGeolocation = false // keep code for future reintroduction
  const [searchQuery, setSearchQuery] = useState('')
  const [claimToast, setClaimToast] = useState<string | null>(null)

  // Hook Integration
  const { shops, setShops, fetchProperties: fetchUserShops } = useProperties(initialShops)
  const { currentUser, setCurrentUser } = useCurrentUser()

  const [followedIds, setFollowedIds] = useState<string[]>(initialFollowedIds)
  const [mapCenter, setMapCenter] = useState<[number, number]>([55.035, -1.470]) // Default to Shiremoor/Monkseaton for Pilot
  const [mapZoom, setMapZoom] = useState<number>(13)
  const [showLegend, setShowLegend] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [selectedHome, setSelectedHome] = useState<MapProperty | null>(null)
  const [claimRecord, setClaimRecord] = useState<Database['public']['Tables']['property_claims']['Row'] | null>(null)
  const [claiming, setClaiming] = useState(false)
  const [claimError, setClaimError] = useState<string | null>(null)
  // currentUser handled by hook

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
    status_confirmed: boolean // NEW: track explicit intent confirmation locally
  }>>>({})
  const [mapRefreshSignal, setMapRefreshSignal] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const [isListOpen, setIsListOpen] = useState<boolean>(false)

  // Admin God Mode State
  const [adminEditMode, setAdminEditMode] = useState(false)
  const [adminEditData, setAdminEditData] = useState<any>(null)
  const [adminSaving, setAdminSaving] = useState(false)

  // Hero Image State (Progressive Delight)
  const [heroImage, setHeroImage] = useState<string | null>(null)
  const [heroUploading, setHeroUploading] = useState(false)
  const heroFileInputRef = useRef<HTMLInputElement | null>(null)
  const statusSelectorRef = useRef<HTMLDivElement | null>(null)

  // Graduation State
  const [hasInteracted, setHasInteracted] = useState(false) // Track if user has touched controls this session
  const [isEditingFacts, setIsEditingFacts] = useState(false) // For post-graduation editing logic


  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [messageModalMode, setMessageModalMode] = useState<MessageMode | undefined>(undefined)
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false)

  // Message state moved to MessageModal, we just track open state here

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
  // fetchDebounceRef removed as it is in useProperties
  const pendingDeepLinkRef = useRef<MapProperty | null>(null)
  const deepLinkHandledRef = useRef<string | null>(null)
  const lastPendingUserKeyRef = useRef<string | null>(null)
  const { isFollowed, toggleFollow } = usePropertyFollows()
  const [heatmapMode, setHeatmapMode] = useState<'all' | 'market' | 'social' | null>(null)

  interface LayerState {
    homes: boolean
    heat: boolean
    schools: boolean
    transport: boolean
  }



  // Admin State
  const [isAddingHome, setIsAddingHome] = useState(false)

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

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    showAll: true,
    openToTalking: false,
    forSale: false,
    forRent: false,
    claimed: false,
  })

  useEffect(() => {
    if (currentUser) {
      refreshPendingRequestCount(currentUser.id, undefined)
    } else {
      setPendingRequestCount(0)
    }
  }, [currentUser, refreshPendingRequestCount])

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

  // fetchUserShops is now handled by useProperties hook

  const handleMapMove = useCallback((center: [number, number], zoom: number, bounds: L.LatLngBounds) => {
    setMapCenter(center)
    setMapZoom(zoom)
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
      setIsOpenToTalking(false)
      setIsCheckingClaim(false)
      setSoftListingLoading(false)
      setSoftListingSaving(false)
      setSoftListingError(null)
      setHasInteracted(false) // Reset interaction state
      setIsEditingFacts(false) // Reset editing state
      setIsMessageModalOpen(false)
      setMessageModalMode(undefined)
      setAdminEditMode(false)
      setAdminEditData(null)
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
      setIsOpenToTalking(false)
      setSoftListingLoading(false)
      setSoftListingSaving(false)
      setSoftListingError(null)

      const { data, error } = await supabase
        .from('property_claims')
        .select('*')
        .eq('property_id', selectedHome!.id)
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

  // Story loading handled by HomeStorySection component

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
      const selectedHomeId = selectedHome!.id

      const { data, error } = await supabase
        .from('intent_flags')
        .select('soft_listing,is_for_sale,is_for_rent')
        .eq('property_id', selectedHome!.id)
        .eq('owner_id', currentUserId!)
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Error loading conversation intent', error)
        setSoftListingError('Could not load conversation preference.')
        setIsOpenToTalking(false)
      } else {
        const intentData = data as any
        const nextSoft = !!intentData?.soft_listing
        const nextSale = !!intentData?.is_for_sale
        const nextRent = !!intentData?.is_for_rent
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
          status_confirmed: false // Initial load - status is NOT visually confirmed yet unless we tracked it in DB (we don't yet)
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
        const zoom = mapInstance.getZoom()
        const bounds = mapInstance.getBounds()
        handleMapMove([center.lat, center.lng], zoom, bounds)
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
    status_confirmed: boolean
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
      .insert([{
        property_id: selectedHome.id,
        user_id: currentUser.id,
        status: 'claimed',
      }] as any)

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
      // Immediately update selectedHome so hero transitions to "Add a photo"
      setSelectedHome(prev => prev ? { ...prev, is_claimed: true, claimed_by_user_id: currentUser.id } : prev)
      // Also update in the shops array for map consistency
      setShops(prev => prev.map(p => p.id === selectedHome.id ? { ...p, is_claimed: true, claimed_by_user_id: currentUser.id } : p))
      // 🎉 Celebration effect!
      fireCelebration()
      setClaimToast('Welcome Home! You now own this pin.')
      setTimeout(() => setClaimToast(null), 4000)
    }
  }

  const handleOpenMessageModal = () => {
    if (!selectedHome) return
    if (!currentUser) {
      router.push('/auth/login?redirect=/')
      return
    }
    setMessageModalMode(undefined) // Auto-detect
    setIsMessageModalOpen(true)
  }

  // Image handlers moved to HomeStorySection

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

  // Use centralized logic
  const strengthResult = calculateProfileStrength(selectedHome, intentOverrides[selectedHome?.id || ''] || {}, heroImage)
  const profileStrength = strengthResult.total
  const isGraduated = profileStrength === 100

  const statusSet = !!intentOverrides[selectedHome?.id || '']?.status_confirmed

  const handleVerifyFactsClick = () => {
    // Scroll to editor (it's right there, maybe just focus?)
    const el = document.getElementById('home-facts-editor')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSetStatusClick = () => {
    const el = document.getElementById('owner-controls')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSaveFacts = async (data: { bedrooms: number; type: string; story: string }) => {
    if (!selectedHome || !currentUser) return
    setAdminSaving(true) // Reuse saving state or make new one

    // 1. Update Property fields
    const { error: propError } = await supabase
      .from('properties')
      .update({
        bedroom_estimate: data.bedrooms,
        home_type: data.type
      } as any)
      .eq('id', selectedHome.id)

    // 2. Update Story (if provided)
    if (data.story) {
      const { error: storyError } = await supabase
        .from('home_story')
        .upsert({
          property_id: selectedHome.id,
          summary_text: data.story,
          // user_id: currentUser.id // Optional depending on schema
        } as any, { onConflict: 'property_id' })
    }

    if (propError) {
      console.error('Error saving facts', propError)
      alert('Failed to save facts')
      setAdminSaving(false)
      return
    }

    // Update local state
    setShops(prev => prev.map(p => p.id === selectedHome.id ? { ...p, bedroom_estimate: data.bedrooms, home_type: data.type } : p))
    setSelectedHome(prev => prev ? { ...prev, bedroom_estimate: data.bedrooms, home_type: data.type } : prev)

    // Stop editing if in graduated mode
    setIsEditingFacts(false)

    setAdminSaving(false)
  }

  const handleSetOwnerStatus = async (nextStatus: 'settled' | 'open' | 'sale' | 'rent') => {
    if (!selectedHome || !currentUser) return
    if (!claimRecord || claimRecord.property_id !== selectedHome.id || claimRecord.user_id !== currentUser.id) return

    setHasInteracted(true) // Mark as interacted!

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
      status_confirmed: true // also confirm here if triggered by function
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
        } as any,
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

  // Story Save logic moved to HomeStorySection

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

  /* const effectiveIntentFlags = computeIntentFlags() */

  const renderOwnershipControls = () => {
    if (claimRecord && claimRecord.property_id === selectedHome?.id && claimRecord.user_id === currentUserId) {
      // Calculate checklist completion
      /* Using centralized strengthResult for checklist props */

      return (
        <>
          {/* OWNER CHECKLIST OR GRADUATED DISPLAY */}
          {isOwner && (
            <>
              {/* IF Graduated (100%), show Story Display. Otherwise show checklist/editor or if editing explicitly */}
              {isGraduated && !isEditingFacts ? (
                <div className="mb-6">
                  <HomeStoryDisplay
                    story={null}
                    bedroomCount={selectedHome?.bedroom_estimate ?? null}
                    homeType={selectedHome?.home_type ?? null}
                    onEdit={() => setIsEditingFacts(true)}
                  />
                </div>
              ) : (
                <>
                  {!isGraduated && (
                    <OwnerChecklist
                      hasPhoto={strengthResult.breakdown.hasPhoto}
                      hasFacts={strengthResult.breakdown.hasFacts}
                      hasStatusSet={strengthResult.breakdown.hasIntent}
                      onAddPhotoClick={() => heroFileInputRef.current?.click()}
                      onVerifyFactsClick={handleVerifyFactsClick}
                      onSetStatusClick={handleSetStatusClick}
                    />
                  )}

                  <div id="home-facts-editor" className="mb-6">
                    <HomeFactsEditor
                      bedroomCount={selectedHome?.bedroom_estimate ?? null}
                      homeType={selectedHome?.home_type ?? null}
                      oneLiner={""}
                      onSave={handleSaveFacts}
                      isSaving={adminSaving}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {/* PROPERTY DATA GRID */}
          <div ref={statusSelectorRef} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
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
                // Ghost Logic: If not active, not interacted yet, and profile incomplete -> Show Ghost (Clean/Empty)
                const isGhost = !hasInteracted && profileStrength < 100 && !isActive

                // Visuals
                let buttonClass = ""
                if (isGhost) {
                  // Clean/Empty look (User Override: White bg, Slate-200 border, Slate-400 text)
                  buttonClass = "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500"
                } else if (isActive) {
                  // Active Colors
                  if (option.tone === 'teal') buttonClass = "bg-[#007C7C] border-[#007C7C] text-white shadow-md ring-1 ring-[#007C7C]"
                  else if (option.tone === 'coral') buttonClass = "bg-[#E65F52] border-[#E65F52] text-white shadow-md ring-1 ring-[#E65F52]"
                  else if (option.tone === 'rent') buttonClass = "bg-[#6366F1] border-[#6366F1] text-white shadow-md ring-1 ring-[#6366F1]"
                  else buttonClass = "bg-slate-800 border-slate-800 text-white shadow-md ring-1 ring-slate-800" // Settled Active
                } else {
                  // Initial / Inactive but Interactive (Standard)
                  buttonClass = "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600"
                }

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleSetOwnerStatus(option.key as OwnerStatus)}
                    disabled={softListingLoading || softListingSaving}
                    className={clsx(
                      'w-full rounded-xl border p-4 text-left transition-all flex flex-col items-start gap-1',
                      softListingLoading || softListingSaving ? 'opacity-60 cursor-not-allowed' : '',
                      buttonClass
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <p className="text-sm font-semibold">
                        {option.label}
                      </p>
                    </div>
                    <p className={clsx('text-xs', isActive ? 'text-white/90' : isGhost ? 'text-slate-400' : 'text-slate-500')}>
                      {option.description}
                    </p>
                    {isActive && (
                      <div className="absolute top-2 right-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/90 animate-pulse shadow-sm" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </>
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
            setMessageModalMode('future')
            setIsMessageModalOpen(true)
          }}
        >
          <FileText className="h-4 w-4" />
          Leave note for owner
        </button>
      </>
    )
  }
  // Primary Badge: Mirrors Map Pin Priority Exactly
  // Sale > Rent > Open > Claimed > Unclaimed
  const primaryBadge = selectedHome
    ? localForSale
      ? { label: 'For Sale', classes: 'bg-rose-100 text-rose-700' }
      : localForRent
        ? { label: 'For Rent', classes: 'bg-indigo-100 text-indigo-700' }
        : isOpenToTalking
          ? { label: 'Open to Talking', classes: 'bg-[#007C7C]/10 text-[#007C7C]' }
          : selectedHome.is_claimed || claimRecord?.property_id === selectedHome.id
            ? { label: 'Claimed', classes: 'bg-amber-100 text-amber-700' }
            : { label: 'Unclaimed', classes: 'bg-slate-100 text-slate-600' }
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
    ? (`${selectedHome?.house_number ?? ''} ${selectedHome?.street ?? ''} `.trim() ||
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
      setIsOpenToTalking(false) // Ensure this is reset
      setIntentForId(null)
      return
    }
    setLocalForSale(!!selectedHome.is_for_sale)
    setLocalForRent(!!selectedHome.is_for_rent)
    setIsOpenToTalking(!!selectedHome.is_open_to_talking) // Sync this too
    setIntentForId(selectedHome.id)
  }, [selectedHome?.id])

  // Fetch hero image from home_story when selectedHome changes
  useEffect(() => {
    if (!selectedHome?.id) {
      setHeroImage(null)
      return
    }

    let cancelled = false
    const fetchHeroImage = async () => {
      const { data, error } = await supabase
        .from('home_story')
        .select('images')
        .eq('property_id', selectedHome.id)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        console.error('Error fetching hero image', error)
        setHeroImage(null)
        return
      }

      const images = data?.images as string[] | null
      setHeroImage(images && images.length > 0 ? images[0] : null)
    }

    fetchHeroImage()
    return () => { cancelled = true }
  }, [selectedHome?.id, supabase])

  // Handle hero image upload (Direct Action)
  const handleHeroUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length || !selectedHome || !currentUser) return
    setHeroUploading(true)

    try {
      const files = Array.from(e.target.files)
      const urls = await uploadHomeStoryImages(supabase, selectedHome.id, files)

      // Upsert to home_story
      const { data: existing } = await supabase
        .from('home_story')
        .select('images')
        .eq('property_id', selectedHome.id)
        .maybeSingle()

      const existingImages = (existing?.images as string[]) || []
      const newImages = [...existingImages, ...urls]

      await supabase
        .from('home_story')
        .upsert({
          property_id: selectedHome.id,
          user_id: currentUser.id,
          images: newImages,
          summary_text: ''
        }, { onConflict: 'property_id' })

      setHeroImage(newImages[0])
    } catch (error) {
      console.error('Hero upload failed:', error)
      alert('Failed to upload photo')
    } finally {
      setHeroUploading(false)
      if (heroFileInputRef.current) heroFileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    setIsMessageModalOpen(false)
    setMessageModalMode(undefined)
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
        .from('property_public_view')
        .select('*')
        .eq('id', propertyId)
        .single()

      if (error) {
        console.error('Deep link supabase error', JSON.stringify(error, null, 2))
        return null
      }

      if (data) {
        const casted = data as unknown as MapProperty
        setShops((prev) => (prev.some((p) => p.id === casted.id) ? prev : [...prev, casted]))
        return casted
      }
      return null
    }

    const handleDeepLink = async () => {
      const target = await fetchProperty()

      if (!target) return

      setSelectedHome(target)
      mapRef.current?.flyTo([target.lat, target.lon], 16, { animate: true, duration: 1 })
      if (openInbox) setIsInboxOpen(true)

      deepLinkHandledRef.current = propertyId

      if (typeof window !== 'undefined' && window.history?.replaceState) {
        const url = new URL(window.location.href)
        url.searchParams.delete('propertyId')
        url.searchParams.delete('openInbox')
        const nextSearch = url.searchParams.toString()
        window.history.replaceState(null, '', nextSearch ? `${url.pathname}?${nextSearch} ` : url.pathname)
      }
    }

    handleDeepLink()
  }, [searchParams, supabase, mapReady])

  const filteredShops = shops.filter((home) => {
    if (searchQuery.trim()) {
      const haystack = [
        home.house_number ?? '',
        home.street ?? '',
        home.postcode ?? '',
      ]
        .join(' ')
        .toLowerCase()
      const needle = searchQuery.trim().toLowerCase()
      if (!haystack.includes(needle)) return false
    }

    // Apply FilterModal filters
    if (!filters.showAll) {
      const isSale = home.is_for_sale
      const isRent = home.is_for_rent
      const isOpen = home.is_open_to_talking
      const isClaimed = home.is_claimed

      // Logic: if any tag matches, keep it. Since we are in an OR block of enabled filters?
      // Usually multiple filters means OR relation in this UI context (e.g. show "For Sale" AND "Open").
      // Wait, "Show For Sale AND Open" -> homes that match any of selected?
      // Let's assume OR between selected properties.
      let match = false
      if (filters.openToTalking && isOpen) match = true
      if (filters.forSale && isSale) match = true
      if (filters.forRent && isRent) match = true
      if (filters.claimed && isClaimed) match = true

      if (!match) return false
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

  const activeShops = visibleShops

  // Ghost Search Logging
  const lastLoggedQuery = useRef<string | null>(null)

  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) return

    const timeout = setTimeout(async () => {
      // Only log if 0 results and we are stable (not loading generic map data)
      // Note: isLoading check removed. Relies on debounce.
      // If filteredShops is 0, it means either:
      // 1. We have data but filter matched nothing (Valid Ghost Search)
      // 2. We moved map but found no homes in that area (Valid Ghost Search)
      if (filteredShops.length === 0 && searchQuery !== lastLoggedQuery.current) {
        console.log('[Ghost Search Detected]', searchQuery)
        lastLoggedQuery.current = searchQuery

        await (supabase.from('search_logs') as any).insert({
          query: searchQuery,
          found_count: 0,
          user_id: currentUser?.id ?? null
        })
      }
    }, 2000) // Debounce: Wait for typing to finish and fetch to potentially complete

    return () => clearTimeout(timeout)
  }, [searchQuery, filteredShops.length, currentUser?.id, supabase])


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
      {isAddingHome && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[5000] flex items-center gap-4 bg-red-600 text-white px-6 py-3 rounded-full shadow-xl animate-in fade-in slide-in-from-top-4">
          <span className="font-semibold">📍 Click location to add home</span>
          <button
            onClick={() => setIsAddingHome(false)}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-sm font-medium transition"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="absolute inset-0 z-0 h-screen">
        <ShopMap
          center={mapCenter}
          zoom={13}
          onShopClick={handleShopClick}
          currentUserId={currentUserId}
          refreshSignal={mapRefreshSignal}
          filters={filters}
          intentOverrides={intentOverrides}
          onMapReady={onMapReady}
          heatmapMode={layerState.heat ? 'all' : null}
          activeLayers={layerState}
          isAdmin={isAdmin}
          isAddingHome={isAddingHome}
          onSetIsAddingHome={setIsAddingHome}
          draggablePropertyId={adminEditMode && selectedHome ? selectedHome.id : null}
          onPinDragEnd={(id, lat, lon) => {
            if (adminEditMode && selectedHome && id === selectedHome.id) {
              setAdminEditData((prev: any) => ({ ...prev, lat, lon }))
            }
          }}
        />
      </div>




      <FloatingControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLocationSelect={handleLocationSelect}
        isListOpen={isListOpen}
        onToggleList={() => setIsListOpen((prev) => !prev)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenInbox={() => setIsInboxOpen(true)}
        onOpenActivity={() => setIsActivityOpen(true)}
        layers={layerState}
        onLayerChange={(newLayers) => {
          setLayerState(newLayers)
          // Map heat -> 'all' | null
          setHeatmapMode(newLayers.heat ? 'all' : null)
        }}
        onOpenFilters={() => setShowFilters(true)}
        isAdmin={isAdmin}
        onAddHomeClick={() => setIsAddingHome(true)}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend(prev => !prev)}
        onZoomIn={() => mapRef.current?.zoomIn()}
        onZoomOut={() => mapRef.current?.zoomOut()}
        onLocateMe={() => {
          if ('geolocation' in navigator) {
            setIsLocating(true)
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userLocation: [number, number] = [
                  position.coords.latitude,
                  position.coords.longitude
                ]
                setMapCenter(userLocation)
                mapRef.current?.flyTo(userLocation, 16)
                setIsLocating(false)
              },
              (error) => {
                console.error('Locate failed', error)
                alert('Could not locate you. Please enable permissions.')
                setIsLocating(false)
              }
            )
          } else {
            alert('Geolocation is not supported by your browser.')
          }
        }}
      />
      <ActivityFeedDrawer
        userId={currentUser?.id}
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        onFlyToProperty={(lat, lon, propertyId) => {
          // Explicitly close drawer to avoid race conditions
          setIsActivityOpen(false)

          const existingProp = shops.find(s => s.id === propertyId)
          if (existingProp) {
            handleShopClick(existingProp)
          } else {
            // Fetch and fly
            supabase
              .from('property_public_view')
              .select('*')
              .eq('id', propertyId)
              .single()
              .then(({ data, error }) => {
                if (!error && data) {
                  // Ensure numeric types and constructed object matches MapProperty
                  const row = data as any
                  const prop: MapProperty = {
                    ...row,
                    lat: Number(row.lat),
                    lon: Number(row.lon),
                    input_source: row.input_source ?? 'user',
                    created_at: row.created_at ?? new Date().toISOString()
                  } as unknown as MapProperty

                  setShops(prev => prev.some(p => p.id === prop.id) ? prev : [...prev, prop])
                  handleShopClick(prop)
                }
              })
          }
        }}
      />





      {
        !isListOpen && (
          <div className="absolute left-4 top-24 z-30 hidden md:flex">
            <button
              type="button"
              onClick={() => setIsListOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-md border border-white/30 px-4 py-2 text-sm font-semibold text-slate-800 shadow-lg hover:bg-white transition"
            >
              {activeShops.length.toLocaleString('en-GB')} Active Homes
            </button>
          </div>
        )
      }

      {/* Area Insights Panel */}
      {
        <div className="absolute top-24 left-4 bottom-24 w-80 z-[60] pointer-events-none flex flex-col">
          <AreaPulsePanel
            currentCenter={mapCenter}
            currentZoom={mapZoom}
            className="pointer-events-auto"
            onLocationSelect={handleLocationSelect}
            onFlyToProperty={(lat, lon, propertyId) => {
              const existingProp = shops.find(s => s.id === propertyId)
              if (existingProp) {
                handleShopClick(existingProp)
              } else {
                // Fetch and fly
                supabase
                  .from('property_public_view')
                  .select('*')
                  .eq('id', propertyId)
                  .single()
                  .then(({ data, error }) => {
                    if (!error && data) {
                      const row = data as any
                      const prop: MapProperty = {
                        ...row,
                        lat: Number(row.lat),
                        lon: Number(row.lon),
                        input_source: row.input_source ?? 'user',
                        created_at: row.created_at ?? new Date().toISOString()
                      } as unknown as MapProperty

                      setShops(prev => prev.some(p => p.id === prop.id) ? prev : [...prev, prop])
                      handleShopClick(prop)
                    }
                  })
              }
            }}
          />
        </div>
      }


      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFilterChange={setFilters}
      />

      {
        selectedHome && (
          <div
            className="fixed inset-x-0 bottom-0 h-[60vh] w-full bg-white/40 backdrop-blur-xl shadow-2xl border border-gray-200 rounded-t-2xl p-0 z-[1050] flex flex-col overflow-hidden transition-all duration-300 ease-out md:inset-auto md:right-4 md:top-24 md:bottom-4 md:w-80 md:h-auto md:rounded-2xl"
          >
            {/* Hero */}
            <div className="relative h-48 w-full bg-slate-100 group">
              <div className="absolute top-3 right-3 z-20 flex items-center gap-3">
                <FollowButton
                  propertyId={selectedHome.id}
                  isFollowed={followedIds.includes(selectedHome.id)}
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


              {/* Progressive Delight Hero Image */}
              {(() => {
                const hasPhoto = heroImage || (selectedHome as any)?.image_url || (selectedHome as any)?.market_image_url
                const isClaimed = selectedHome?.is_claimed
                const canUpload = isClaimedByYou

                // Hidden file input for direct upload
                const fileInput = canUpload && (
                  <input
                    ref={heroFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleHeroUpload}
                  />
                )

                // State 3: Showcase (Has Photo)
                if (hasPhoto) {
                  return (
                    <>
                      {fileInput}
                      <img
                        src={heroImage || (selectedHome as any)?.image_url || (selectedHome as any)?.market_image_url}
                        className={`w-full h-full object-cover ${canUpload ? 'cursor-pointer' : ''} `}
                        alt="Home"
                        onClick={() => canUpload && heroFileInputRef.current?.click()}
                      />
                      {heroUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-medium">Uploading...</span>
                        </div>
                      )}
                    </>
                  )
                }

                // State 2: Vibe Gradient (Claimed, No Photo)
                if (isClaimed) {
                  const postcode = selectedHome?.postcode || ''
                  const gradientClass = postcode.startsWith('NE26') || postcode.startsWith('NE30')
                    ? 'bg-gradient-to-br from-teal-400 to-blue-500'
                    : postcode.startsWith('NE28') || postcode.startsWith('NE29')
                      ? 'bg-gradient-to-br from-slate-400 to-slate-600'
                      : 'bg-gradient-to-br from-emerald-400 to-teal-500'

                  return (
                    <>
                      {fileInput}
                      <div
                        className={`w-full h-full flex flex-col items-center justify-center ${gradientClass} ${canUpload ? 'cursor-pointer' : ''} `}
                        onClick={() => canUpload && heroFileInputRef.current?.click()}
                      >
                        <Camera className="text-white/70" size={36} />
                        <span className="text-white/90 text-sm mt-2 font-semibold">
                          {heroUploading ? 'Uploading...' : 'Add a photo'}
                        </span>
                      </div>
                    </>
                  )
                }

                // State 1: Ghost Map (Unclaimed)
                return (
                  <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex flex-col items-center justify-center">
                    <MapPin className="text-slate-400" size={32} />
                    <span className="text-slate-500 text-sm mt-2 font-medium">Claim this home to add photos</span>
                  </div>
                )
              })()}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 space-y-4">


              {/* Admin Edit Form */}
              {adminEditMode && adminEditData ? (
                <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">House Number</label>
                    <input
                      className="w-full p-2 border rounded text-sm"
                      value={adminEditData.house_number || ''}
                      onChange={e => setAdminEditData({ ...adminEditData, house_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Street</label>
                    <input
                      className="w-full p-2 border rounded text-sm"
                      value={adminEditData.street || ''}
                      onChange={e => setAdminEditData({ ...adminEditData, street: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Postcode</label>
                    <input
                      className="w-full p-2 border rounded text-sm"
                      value={adminEditData.postcode || ''}
                      onChange={e => setAdminEditData({ ...adminEditData, postcode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Price Estimate</label>
                    <input
                      className="w-full p-2 border rounded text-sm"
                      value={adminEditData.price_estimate || ''}
                      onChange={e => setAdminEditData({ ...adminEditData, price_estimate: e.target.value })}
                    />
                  </div>

                  <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-100 flex items-center gap-2">
                    <MapPin size={16} />
                    <div>Drag the pin on the map to allow moving.</div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      className="flex-1 py-2 bg-emerald-600 text-white rounded font-semibold text-sm hover:bg-emerald-700 flex items-center justify-center gap-2"
                      onClick={async () => {
                        setAdminSaving(true)
                        try {
                          // Update details
                          const { error: updateError } = await supabase.rpc('admin_update_property', {
                            property_id: selectedHome.id,
                            update_data: {
                              house_number: adminEditData.house_number,
                              street: adminEditData.street,
                              postcode: adminEditData.postcode,
                              price_estimate: adminEditData.price_estimate
                            }
                          } as any)
                          if (updateError) throw updateError

                          // Update location if changed
                          if (adminEditData.lat !== selectedHome.lat || adminEditData.lon !== selectedHome.lon) {
                            const { error: moveError } = await supabase.rpc('admin_move_pin', {
                              target_property_id: selectedHome.id,
                              new_lat: adminEditData.lat,
                              new_lon: adminEditData.lon
                            } as any)
                            if (moveError) throw moveError
                          }

                          alert('Saved successfully')
                          setAdminEditMode(false)
                          // Force map refresh logic here if possible, or reload page
                          window.location.reload()
                        } catch (e: any) {
                          alert('Error saving: ' + e.message)
                        } finally {
                          setAdminSaving(false)
                        }
                      }}
                      disabled={adminSaving}
                    >
                      <Save size={16} /> {adminSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      className="px-3 py-2 bg-red-100 text-red-700 rounded font-semibold text-sm hover:bg-red-200"
                      onClick={async () => {
                        if (confirm('Are you sure you want to DELETE this property? This cannot be undone.')) {
                          setAdminSaving(true)
                          try {
                            const { error } = await supabase.rpc('admin_delete_property', {
                              target_property_id: selectedHome.id
                            } as any)
                            if (error) throw error
                            alert('Property deleted.')
                            setSelectedHome(null)
                            window.location.reload()
                          } catch (e: any) {
                            alert('Error deleting: ' + e.message)
                          } finally {
                            setAdminSaving(false)
                          }
                        }
                      }}
                      disabled={adminSaving}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ) : (
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
              )}

              <div className="flex items-center gap-2">
                {isCheckingClaim ? (
                  <div className="h-5 w-32 bg-slate-200 rounded animate-pulse"></div>
                ) : (
                  <>
                    {/* Primary Badge: Mirrors Map Pin Signal */}
                    {primaryBadge && (
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${primaryBadge.classes}`}>
                        {primaryBadge.label}
                      </span>
                    )}
                    {/* Secondary: Claimed by you indicator */}
                    {isClaimedByYou && (
                      <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">
                        Claimed by you
                      </span>
                    )}
                  </>
                )}
              </div>

              <PropertyInsights property={selectedHome} />

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

              <HomeStorySection
                selectedHome={selectedHome!}
                currentUser={currentUser}
                isClaimedByYou={isClaimedByYou}
              />

              <div className="mt-8 text-center">
                <button
                  onClick={() => setIsFlagModalOpen(true)}
                  className="text-xs text-slate-400 hover:text-rose-500 underline cursor-pointer"
                >
                  Flag this home
                </button>
              </div>
            </div>
          </div>
        )
      }

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

      {selectedHome && (
        <MessageModal
          isOpen={isMessageModalOpen}
          initialMode={messageModalMode}
          onClose={() => setIsMessageModalOpen(false)}
          selectedHome={selectedHome}
          currentUser={currentUser}
          intentFlags={computeIntentFlags()}
        />
      )}

      {selectedHome && (
        <FlagModal
          isOpen={isFlagModalOpen}
          onClose={() => setIsFlagModalOpen(false)}
          propertyId={selectedHome.id}
          userId={currentUser?.id}
        />
      )}

      {/* Claim Toast */}
      {claimToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
            <span className="text-xl">🏠</span>
            <span className="font-semibold">{claimToast}</span>
          </div>
        </div>
      )}
    </div>
  )
}