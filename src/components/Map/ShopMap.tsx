'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Supercluster from 'supercluster'
import type { LatLngBounds } from 'leaflet'

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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

interface ShopMapProps {
  center?: [number, number]
  zoom?: number
  onShopClick?: (property: MapProperty) => void
  currentUserId?: string | null
  refreshSignal?: number
  activeFilter?: 'all' | 'open' | 'claimed'
  intentOverrides?: Record<string, Partial<Pick<MapProperty, 'is_for_sale' | 'is_for_rent' | 'is_open_to_talking' | 'is_claimed' | 'claimed_by_user_id'>>>
  onMapReady?: (map: L.Map) => void
}

function MapInstanceCatcher({ onReady }: { onReady: (map: L.Map) => void }) {
  const m = useMap()
  useEffect(() => {
    onReady(m)
  }, [m, onReady])
  return null
}

const INDIVIDUAL_MARKER_ZOOM = 16

function buildDisplayLabel(property: MapProperty) {
  const { house_number, street, postcode } = property
  if (house_number && street) {
    return `${house_number} ${street}${postcode ? `, ${postcode}` : ''}`
  }
  if (street) {
    return `${street}${postcode ? `, ${postcode}` : ''}`
  }
  if (postcode) {
    return postcode
  }
  return 'Home'
}

export default function ShopMap({
  center = [54.9749, -1.6103],
  zoom = 14,
  onShopClick,
  currentUserId,
  refreshSignal = 0,
  activeFilter = 'all',
  intentOverrides = {},
  onMapReady,
}: ShopMapProps) {
  console.log('[ShopMap] render')
  const [map, setMap] = useState<L.Map | null>(null)
  const [properties, setProperties] = useState<MapProperty[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showLoadingBadge, setShowLoadingBadge] = useState(false)

  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  const filterForSale = false
  const filterForRent = false
  const [filterClaimed, setFilterClaimed] = useState<'all' | 'claimed' | 'unclaimed'>('all')

  const [viewport, setViewport] = useState<{ north: number; south: number; east: number; west: number; zoom: number } | null>(null)
  const hasFitBounds = useRef(false)
  const lastFetchKey = useRef<string | null>(null)
  const fetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressFetchUntil = useRef<number>(0)

  useEffect(() => {
    setFilterOpen(activeFilter === 'open')
    setFilterClaimed(activeFilter === 'claimed' ? 'claimed' : 'all')
    lastFetchKey.current = null
  }, [activeFilter])

  useEffect(() => {
    if (map && onMapReady) {
      onMapReady(map)
    }
  }, [map, onMapReady])

  const buildBoundsKey = useCallback(
    (bounds: LatLngBounds, zoomValue: number) => {
      const north = bounds.getNorth().toFixed(6)
      const south = bounds.getSouth().toFixed(6)
      const east = bounds.getEast().toFixed(6)
      const west = bounds.getWest().toFixed(6)
      return `${north}|${south}|${east}|${west}|${zoomValue}|${filterOpen}|${filterForSale}|${filterForRent}|${filterClaimed}`
    },
    [filterClaimed, filterForRent, filterForSale, filterOpen]
  )

  const propertyMap = useMemo(() => {
    const m = new Map<string, MapProperty>()
    properties.forEach((p) => m.set(p.id, p))
    return m
  }, [properties])

  const geojsonPoints = useMemo(
    () =>
      properties.map((p) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [p.lon, p.lat],
        },
        properties: {
          id: p.id,
          is_claimed: p.is_claimed,
          is_open_to_talking: p.is_open_to_talking,
          is_for_sale: p.is_for_sale,
          is_for_rent: p.is_for_rent,
          has_recent_activity: p.has_recent_activity,
        },
      })),
    [properties]
  )

  const clusterIndex = useMemo(() => {
    const index = new Supercluster({ radius: 30, maxZoom: 19, minZoom: 0 })
    return index.load(geojsonPoints as any)
  }, [geojsonPoints])

  const zoomLevel = map ? map.getZoom() : 0

  const clusters = useMemo(() => {
    if (!map || zoomLevel >= INDIVIDUAL_MARKER_ZOOM) return []

    const bounds = map.getBounds()
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()

    return clusterIndex.getClusters([west, south, east, north], zoomLevel)
  }, [clusterIndex, map, viewport, zoomLevel])

  // Delay showing the loading badge to avoid flicker on quick pans/zooms
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null
    if (isLoading) {
      timeout = setTimeout(() => setShowLoadingBadge(true), 180)
    } else {
      setShowLoadingBadge(false)
      if (timeout) clearTimeout(timeout)
    }
    return () => {
      if (timeout) clearTimeout(timeout)
    }
  }, [isLoading])

  const fetchForBounds = useCallback(async () => {
    if (!map) return
    if (suppressFetchUntil.current > Date.now()) {
      return
    }

    const bounds = map.getBounds()
    const zoomValue = map.getZoom()
    const key = buildBoundsKey(bounds, zoomValue)

    // Prevent tight loops when Leaflet fires multiple move/zoom events with same viewport/filters
    if (key === lastFetchKey.current) {
      return
    }
    lastFetchKey.current = key

    setViewport({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
      zoom: zoomValue,
    })

    const params = new URLSearchParams()
    params.set('north', bounds.getNorth().toString())
    params.set('south', bounds.getSouth().toString())
    params.set('east', bounds.getEast().toString())
    params.set('west', bounds.getWest().toString())
    params.set('filter_open', String(filterOpen))
    params.set('filter_for_sale', String(filterForSale))
    params.set('filter_for_rent', String(filterForRent))
    params.set('filter_claimed', filterClaimed)

    const url = `/api/properties?${params.toString()}`
    console.log('[ShopMap] fetching properties', url)

    try {
      setIsLoading(true)
      const res = await fetch(url)
      const json = await res.json()

      console.log('[ShopMap] /api/properties response', {
        status: res.status,
        count: Array.isArray(json.data) ? json.data.length : 0,
        truncated: json.truncated,
      })

      if (!res.ok) {
        console.error('[ShopMap] error from /api/properties', json)
        return
      }

      setProperties((prev) => {
        const next = json.data ?? []
        const prevIds = prev.map((p) => p.id).join('|')
        const nextIds = next.map((p: MapProperty) => p.id).join('|')
        if (prevIds === nextIds) return prev
        return next
      })

      if (!hasFitBounds.current && map && Array.isArray(json.data) && json.data.length > 0) {
        const fitBounds = L.latLngBounds(json.data.map((p: MapProperty) => [p.lat, p.lon] as [number, number]))
        map.fitBounds(fitBounds)
        hasFitBounds.current = true
      }
    } catch (err) {
      console.error('[ShopMap] network error fetching properties', err)
      // Keep existing properties to avoid unmounting markers on transient errors
    } finally {
      setIsLoading(false)
    }
  }, [buildBoundsKey, filterClaimed, filterForRent, filterForSale, filterOpen, map])

  useEffect(() => {
    if (!map) {
      console.log('[ShopMap] map not ready yet')
      return
    }

    const debouncedFetch = () => {
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current)
      fetchTimeout.current = setTimeout(() => {
        fetchForBounds()
      }, 120)
    }

    // initial fetch
    debouncedFetch()

    // refetch on move/zoom
    map.on('moveend', debouncedFetch)
    map.on('zoomend', debouncedFetch)

    return () => {
      if (fetchTimeout.current) {
        clearTimeout(fetchTimeout.current)
      }
      map.off('moveend', debouncedFetch)
      map.off('zoomend', debouncedFetch)
    }
  }, [fetchForBounds, map])

  // Trigger a refresh when parent signals (e.g., after toggling open-to-conversation)
  useEffect(() => {
    if (!map) return
    fetchForBounds()
  }, [fetchForBounds, map, refreshSignal])

  const createIcon = (color: string, isOwner: boolean) => {
    const size = isOwner ? 22 : 18
    const borderWidth = isOwner ? 4 : 2
    const ring = isOwner ? 'box-shadow:0 0 0 2px rgba(0,0,0,0.1);' : ''
    return L.divIcon({
      html: `
        <div style="width:${size}px;height:${size}px;border:${borderWidth}px solid #fff;${ring}background:${color};border-radius:9999px;" aria-hidden="true"></div>
      `,
      className: 'nest-pin',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    })
  }

  const getShopIcon = (property: MapProperty) => {
    const override = intentOverrides[property.id]
    const merged = override ? { ...property, ...override } : property
    const isOwner = !!currentUserId && merged.claimed_by_user_id === currentUserId
    const isSale = merged.is_for_sale
    const isRent = merged.is_for_rent
    const isOpen = merged.is_open_to_talking
    const isClaimed = merged.is_claimed

    let color = '#9CA3AF' // grey default
    if (isSale) {
      color = '#E65F52'
    } else if (isRent) {
      color = '#6366F1'
    } else if (isOpen) {
      color = '#007C7C'
    } else if (isClaimed) {
      color = '#F5A623'
    }

    const icon = createIcon(color, isOwner)
    const zIndexOffset = isOwner ? 1000 : (isSale || isRent || isOpen ? 500 : 0)
    return { icon, zIndexOffset }
  }

  const handleClusterClick = useCallback(
    (cluster: any) => {
      if (!map) return
      const expansionZoom = clusterIndex.getClusterExpansionZoom(cluster.id)
      const [lon, lat] = cluster.geometry.coordinates
      map.setView([lat, lon], expansionZoom)
    },
    [clusterIndex, map]
  )

  const handlePointClick = useCallback(
    (propertyId: string) => {
      const property = propertyMap.get(propertyId)
      if (!property) return
      onShopClick?.(property)
    },
    [onShopClick, propertyMap]
  )

  const renderClusterOrMarker = (cluster: any) => {
    const [lon, lat] = cluster.geometry.coordinates
    const isCluster = cluster.properties.cluster

    if (isCluster) {
      // Keep basic cluster handling (expand on click) but reuse simple pin styling
      const count = cluster.properties.point_count
      return (
        <Marker
          key={`cluster-${cluster.id}`}
          position={[lat, lon]}
          icon={L.divIcon({
            html: `<div class="bg-[#007C7C] text-white w-9 h-9 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-lg">${count}</div>`,
            className: 'nest-cluster',
            iconSize: [36, 36],
            iconAnchor: [18, 18],
          })}
          eventHandlers={{
            click: () => handleClusterClick(cluster),
          }}
        />
      )
    }

    const property = propertyMap.get(cluster.properties.id)
    if (!property) return null

    const override = intentOverrides[property.id]
    const displayProperty = override ? { ...property, ...override } : property
    const label = buildDisplayLabel(displayProperty)
    const address = displayProperty.postcode || displayProperty.street || 'No postcode'
    const { icon, zIndexOffset } = getShopIcon(displayProperty)

    return (
      <Marker
        key={displayProperty.id}
        position={[displayProperty.lat, displayProperty.lon]}
        icon={icon}
        zIndexOffset={zIndexOffset}
        bubblingMouseEvents={false}
        interactive
        eventHandlers={{
          click: (e) => {
            suppressFetchUntil.current = Date.now() + 300
            // @ts-expect-error Leaflet originalEvent
            e?.originalEvent?.stopPropagation?.()
            onShopClick?.(displayProperty)
          },
        }}
      >
        <Popup>
          <div className="p-3 min-w-[220px]">
            <h3 className="font-bold text-lg text-stone-900 mb-1">{label}</h3>
            <p className="text-sm text-stone-600 mb-3">{address}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onShopClick?.(displayProperty)
              }}
              className="w-full px-3 py-1.5 bg-[#007C7C] text-white rounded-full hover:bg-[#006868] text-sm font-medium transition-colors"
            >
              View home
            </button>
          </div>
        </Popup>
      </Marker>
    )
  }

  const markers = useMemo(() => {
    return properties.map((property) => {
      const override = intentOverrides[property.id]
      const displayProperty = override ? { ...property, ...override } : property
      const label = buildDisplayLabel(displayProperty)
      const address = displayProperty.postcode || displayProperty.street || 'No postcode'
      const { icon, zIndexOffset } = getShopIcon(displayProperty)

      return (
        <Marker
          key={displayProperty.id}
          position={[displayProperty.lat, displayProperty.lon]}
          icon={icon}
          zIndexOffset={zIndexOffset}
          bubblingMouseEvents={false}
          interactive
          eventHandlers={{
            click: (e) => {
              suppressFetchUntil.current = Date.now() + 300
              // @ts-expect-error Leaflet originalEvent
              e?.originalEvent?.stopPropagation?.()
              onShopClick?.(displayProperty)
            },
          }}
        >
          <Popup>
            <div className="p-3 min-w-[220px]">
              <h3 className="font-bold text-lg text-stone-900 mb-1">{label}</h3>
              <p className="text-sm text-stone-600 mb-3">{address}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onShopClick?.(displayProperty)
                }}
                className="w-full px-3 py-1.5 bg-[#007C7C] text-white rounded-full hover:bg-[#006868] text-sm font-medium transition-colors"
              >
                View home
              </button>
            </div>
          </Popup>
        </Marker>
      )
    })
  }, [getShopIcon, intentOverrides, onShopClick, properties])

  return (
    <div className="relative w-full h-full">
      {showLoadingBadge && (
        <div className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Updating map…
        </div>
      )}
      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        scrollWheelZoom={true}
        zoomControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <MapInstanceCatcher onReady={setMap} />
        <ZoomControl position="bottomright" />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors & Carto'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {map && zoomLevel >= INDIVIDUAL_MARKER_ZOOM
          ? markers
          : clusters.map((cluster: any) => renderClusterOrMarker(cluster))}
      </MapContainer>
    </div>
  )
}
