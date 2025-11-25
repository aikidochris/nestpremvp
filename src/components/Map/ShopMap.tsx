'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import LayerToggle, { LayerState } from './LayerToggle'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Custom marker icons for different cryptocurrencies (legacy; OSM disabled pre-MVP)
const createCryptoIcon = (color: string, emoji: string) => {
  return L.divIcon({
    className: 'custom-crypto-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        ${emoji}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  })
}

// Marker variants
const yourHomeIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      background-color: #f59e0b;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      H
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

const forSaleIcon = L.divIcon({
  className: 'custom-sale-marker',
  html: `
    <div style="
      background-color: #ef4444;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      S
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

const forRentIcon = L.divIcon({
  className: 'custom-rent-marker',
  html: `
    <div style="
      background-color: #3b82f6;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      R
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

const openHomeIcon = L.divIcon({
  className: 'custom-open-marker',
  html: `
    <div style="
      background-color: #22c55e;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      O
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

const claimedHomeIcon = L.divIcon({
  className: 'custom-claimed-marker',
  html: `
    <div style="
      background-color: #a855f7;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      C
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

const unclaimedHomeIcon = L.divIcon({
  className: 'custom-other-marker',
  html: `
    <div style="
      background-color: #6b7280;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      U
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

// Crypto-specific icons (legacy; kept for completeness)
const cryptoIcons = {
  BTC: createCryptoIcon('#f97316', 'B'),
  BCH: createCryptoIcon('#22c55e', 'C'),
  LTC: createCryptoIcon('#3b82f6', 'L'),
  XMR: createCryptoIcon('#a855f7', 'M'),
}

export type MapProperty = {
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

type PropertyStatus = 'for-sale' | 'for-rent' | 'open' | 'claimed' | 'unclaimed'

interface OsmShop extends MapProperty {
  source: 'osm'
  osmId: number
  osmType: string
}

interface ShopMapProps {
  shops: MapProperty[]
  center?: [number, number]
  zoom?: number
  onShopClick?: (shop: Shop) => void
  onMapMove?: (center: [number, number], bounds: L.LatLngBounds) => void
  onOsmShopsUpdate?: (osmShops: Shop[]) => void
  onLayerChange?: (layers: LayerState) => void
  currentUserId?: string | null
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center, map])
  
  return null
}

// Component to handle map movement events with debouncing
function MapEventHandler({
  onMapMove
}: {
  onMapMove?: (center: [number, number], bounds: L.LatLngBounds) => void
}) {
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const hasInitializedRef = useRef(false)
  
  const map = useMapEvents({
    moveend: () => {
      console.log('[MapEventHandler] moveend event fired')
      
      // Trigger immediately on first load, then debounce subsequent moves
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true
        const center = map.getCenter()
        const bounds = map.getBounds()
        console.log('[MapEventHandler] Initial load - triggering immediately:', {
          center: [center.lat, center.lng],
          bounds: bounds.toBBoxString()
        })
        onMapMove?.([center.lat, center.lng], bounds)
        return
      }
      
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      
      // Set new timer for debounced callback
      debounceTimerRef.current = setTimeout(() => {
        const center = map.getCenter()
        const bounds = map.getBounds()
        console.log('[MapEventHandler] Debounced callback executing:', {
          center: [center.lat, center.lng],
          bounds: bounds.toBBoxString()
        })
        onMapMove?.([center.lat, center.lng], bounds)
      }, 500) // 500ms debounce
    }
  })
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])
  
  return null
}

export default function ShopMap({
  shops,
  center = [37.7749, -122.4194], // Default to San Francisco
  zoom = 13,
  onShopClick,
  onMapMove,
  onOsmShopsUpdate,
  onLayerChange,
  currentUserId
}: ShopMapProps) {
  const [mounted, setMounted] = useState(false)
  const [osmShops, setOsmShops] = useState<OsmShop[]>([])
  const [loading, setLoading] = useState(false)
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(center)
  // NEST: store homes from /api/properties
  const [propertyShops, setPropertyShops] = useState<MapProperty[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const [layers, setLayers] = useState<LayerState>(() => {
    // Load layer preferences from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mapLayers')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse saved layers:', e)
        }
      }
    }
    // Default: all layers enabled
    return {
      BTC: true,
      BCH: true,
      LTC: true,
      XMR: true,
      userShops: true,
    }
  })
  const [showOnlyOpenToTalking, setShowOnlyOpenToTalking] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // NEST: fetch Supabase homes
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch('/api/properties')
        const json = await res.json()

        const mapped: MapProperty[] = (json.properties || []).map((p: any) => ({
          id: p.id,
          uprn: p.uprn ?? null,
          postcode: p.postcode ?? null,
          street: p.street ?? null,
          house_number: p.house_number ?? null,
          lat: Number(p.lat),
          lon: Number(p.lon),
          price_estimate:
            p.price_estimate !== null && p.price_estimate !== undefined ? Number(p.price_estimate) : null,
          claimed_by_user_id: p.claimed_by_user_id ?? null,
          is_claimed: !!p.is_claimed,
          is_open_to_talking: !!p.is_open_to_talking,
          is_for_sale: !!p.is_for_sale,
          is_for_rent: !!p.is_for_rent,
          has_recent_activity: !!p.has_recent_activity,
        }))

        setPropertyShops(mapped)
      } catch (err) {
        console.error('Failed to fetch properties', err)
      }
    }

    fetchProperties()
  }, [])

  // NEST: OSM disabled for pre-MVP
  const fetchOsmShops = useCallback(async (_bounds: L.LatLngBounds) => {
    return
  }, [])

  // Handle map movement
  const handleMapMove = useCallback((newCenter: [number, number], bounds: L.LatLngBounds) => {
    console.log('[ShopMap] handleMapMove called:', { newCenter, bounds: bounds.toBBoxString() })
    setCurrentCenter(newCenter)
    fetchOsmShops(bounds)
    onMapMove?.(newCenter, bounds)
  }, [fetchOsmShops, onMapMove])

  // Initial fetch on mount - need to get bounds from map
  useEffect(() => {
    if (!mounted) return
    // We can't fetch on mount without bounds, so we'll wait for the first moveend event
    // which fires automatically when the map initializes
  }, [mounted])

  // Cleanup: abort any pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        console.log('[ShopMap] Component unmounting - aborting pending request')
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Save layer preferences to localStorage and notify parent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mapLayers', JSON.stringify(layers))
    }
    // Notify parent component of layer changes
    onLayerChange?.(layers)
  }, [layers, onLayerChange])

  // NEST: only show homes from Supabase
  const derivePropertyStatus = (p: MapProperty): PropertyStatus => {
    const isClaimed = !!p.is_claimed || !!p.claimed_by_user_id
    const isOpen = p.is_open_to_talking === true
    const isForSale = p.is_for_sale === true
    const isForRent = p.is_for_rent === true

    if (isForSale) return 'for-sale'
    if (isForRent) return 'for-rent'
    if (isOpen) return 'open'
    if (isClaimed) return 'claimed'
    return 'unclaimed'
  }

  const getVisibleShops = () => {
    const base = propertyShops
    return showOnlyOpenToTalking ? base.filter((p) => p.is_open_to_talking === true) : base
  }

  // Get appropriate icon for a shop
  const getShopIcon = (shop: MapProperty) => {
    const isClaimedByMe = !!currentUserId && shop.claimed_by_user_id === currentUserId
    const status = derivePropertyStatus(shop)

    if (isClaimedByMe) return yourHomeIcon

    switch (status) {
      case 'for-sale':
        return forSaleIcon
      case 'for-rent':
        return forRentIcon
      case 'open':
        return openHomeIcon
      case 'claimed':
        return claimedHomeIcon
      case 'unclaimed':
      default:
        return unclaimedHomeIcon
    }
  }

  const visibleShops = getVisibleShops()
  
  if (!mounted) {
    return (
      <div className="w-full h-full bg-stone-200 dark:bg-stone-800 animate-pulse flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">...</div>
          <p className="text-stone-600 dark:text-stone-400 font-medium">Loading map...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapUpdater center={center} />
        <MapEventHandler onMapMove={handleMapMove} />
        
        {visibleShops.map((shop) => (
          <Marker
            key={shop.id}
            position={[shop.lat, shop.lon]}
            icon={getShopIcon(shop)}
            eventHandlers={{
              click: () => {
                console.log('[ShopMap] Marker clicked:', {
                  id: shop.id,
                  title: `${shop.house_number ?? ''} ${shop.street ?? ''}`.trim(),
                })
                // Popup will open automatically - no navigation on marker click
                // Navigation happens via "View Details" button in popup for user shops
              }
            }}
          >
            <Popup>
              <div className="p-3 min-w-[220px]">
                <h3 className="font-bold text-lg text-stone-900 mb-1">
                  {`${shop.house_number ?? ''} ${shop.street ?? ''}`.trim() || 'Home'}
                </h3>
                <p className="text-sm text-stone-600 mb-3">
                  {shop.postcode ?? 'No postcode'}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onShopClick?.(shop)
                  }}
                  className="w-full px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium transition-colors"
                >
                  View home
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Layer Toggle Control */}
      {/* NEST: no crypto layers */}

      {/* Loading Indicator */}
      {/* NEST: no OSM loading indicator */}

      {/* Shop Count + Filters */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2 items-end">
        <div className="bg-white px-4 py-2 rounded-lg shadow-lg border-2 border-gray-200 w-full text-right">
          <div className="text-sm">
            <span className="font-bold text-gray-900">{visibleShops.length}</span>
            <span className="text-gray-600"> homes visible</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowOnlyOpenToTalking((prev) => !prev)}
          className={`bg-white px-4 py-2 rounded-lg shadow-lg border-2 text-sm font-semibold transition text-left w-full max-w-xs ${
            showOnlyOpenToTalking ? 'border-green-500 text-green-700' : 'border-gray-200 text-gray-700'
          }`}
          aria-pressed={showOnlyOpenToTalking}
        >
          Open to talking {showOnlyOpenToTalking ? '✓' : ''}
          <span className="block text-xs font-normal text-gray-500">Show only homes open to conversations</span>
        </button>
      </div>
    </div>
  )
}
