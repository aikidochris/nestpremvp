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

// Custom marker icons for different cryptocurrencies
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

// User shop icon (amber/yellow)
const userShopIcon = L.divIcon({
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
      🏪
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

// Crypto-specific icons
const cryptoIcons = {
  BTC: createCryptoIcon('#f97316', '₿'),
  BCH: createCryptoIcon('#22c55e', '💚'),
  LTC: createCryptoIcon('#3b82f6', '🔷'),
  XMR: createCryptoIcon('#a855f7', '🔒'),
}

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

interface OsmShop extends Shop {
  source: 'osm'
  osmId: number
  osmType: string
}

interface ShopMapProps {
  shops: Shop[]
  center?: [number, number]
  zoom?: number
  onShopClick?: (shop: Shop) => void
  onMapMove?: (center: [number, number], bounds: L.LatLngBounds) => void
  onOsmShopsUpdate?: (osmShops: Shop[]) => void
  onLayerChange?: (layers: LayerState) => void
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
  onLayerChange
}: ShopMapProps) {
  const [mounted, setMounted] = useState(false)
  const [osmShops, setOsmShops] = useState<OsmShop[]>([])
  const [loading, setLoading] = useState(false)
  const [currentCenter, setCurrentCenter] = useState<[number, number]>(center)
  // NEST: store homes from /api/properties
  const [propertyShops, setPropertyShops] = useState<Shop[]>([])
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
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // NEST: fetch Supabase homes
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const res = await fetch('/api/properties')
        const json = await res.json()

        const mapped: Shop[] = (json.properties || []).map((p: any) => ({
          id: p.id,
          name: `${p.house_number} ${p.street}`,
          address: `${p.house_number} ${p.street}, ${p.postcode}`,
          latitude: p.lat,
          longitude: p.lon,
          crypto_accepted: ['BTC'], // required by type, ignored
          source: 'user'
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
  const getVisibleShops = () => {
    return propertyShops
  }

  // Get appropriate icon for a shop
  const getShopIcon = (shop: Shop) => {
    if (shop.source === 'user') {
      return userShopIcon
    }
    
    // For OSM shops, use the first crypto type's icon
    const firstCrypto = shop.crypto_accepted[0] as keyof typeof cryptoIcons
    return cryptoIcons[firstCrypto] || cryptoIcons.BTC
  }

  const visibleShops = getVisibleShops()
  
  if (!mounted) {
    return (
      <div className="w-full h-full bg-stone-200 dark:bg-stone-800 animate-pulse flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
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
            position={[shop.latitude, shop.longitude]}
            icon={getShopIcon(shop)}
            eventHandlers={{
              click: () => {
                console.log('[ShopMap] Marker clicked:', {
                  id: shop.id,
                  name: shop.name,
                  source: shop.source
                })
                // Popup will open automatically - no navigation on marker click
                // Navigation happens via "View Details" button in popup for user shops
              }
            }}
          >
            <Popup>
              <div className="p-3 min-w-[220px]">
                <h3 className="font-bold text-lg text-stone-900 mb-1">
                  {shop.name}
                </h3>
                <p className="text-sm text-stone-600 mb-3">
                  {shop.address}
                </p>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onShopClick?.(shop)
                  }}
                  className="w-full px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium transition-colors"
                >
                  View home →
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

      {/* Shop Count */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white px-4 py-2 rounded-lg shadow-lg border-2 border-gray-200">
        <div className="text-sm">
          <span className="font-bold text-gray-900">{visibleShops.length}</span>
          <span className="text-gray-600"> homes visible</span>
        </div>
      </div>
    </div>
  )
}
