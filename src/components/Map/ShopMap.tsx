'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Supercluster from 'supercluster'
import type { LatLngBounds } from 'leaflet'
import { getSupabaseClient } from '@/lib/supabaseClient'
import HeatmapOverlay, { type HeatmapPoint } from './HeatmapLayer'
import type { LayerState } from './LayerToggle'
import PoiLayer from './PoiLayer'

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
  signals?: {
    is_for_sale: boolean
    is_for_rent: boolean
    soft_listing: boolean
  }
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
  heatmapMode?: 'all' | 'market' | 'social' | null
  activeLayers?: LayerState
}

function MapInstanceCatcher({ onReady }: { onReady: (map: L.Map) => void }) {
  const m = useMap()
  useEffect(() => {
    onReady(m)
  }, [m, onReady])
  return null
}

const INDIVIDUAL_MARKER_ZOOM = 16
const CLUSTER_MAX_ZOOM = 15

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
  heatmapMode = null,
  activeLayers,
}: ShopMapProps) {
  const [map, setMap] = useState<L.Map | null>(null)

  // Poi Types
  const poiTypes = useMemo(() => {
    const types: string[] = []
    if (activeLayers?.schools) types.push('school')
    if (activeLayers?.transport) types.push('transport')
    return types
  }, [activeLayers?.schools, activeLayers?.transport])

  const [properties, setProperties] = useState<MapProperty[]>([])
  const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showLoadingBadge, setShowLoadingBadge] = useState(false)

  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  const filterForSale = false
  const filterForRent = false
  const [filterClaimed, setFilterClaimed] = useState<'all' | 'claimed' | 'unclaimed'>('all')

  const [viewport, setViewport] = useState<{ north: number; south: number; east: number; west: number; zoom: number } | null>(null)
  const hasFitBounds = useRef(false)
  const lastFetchKey = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressFetchUntil = useRef<number>(0)
  const supabase = getSupabaseClient()

  useEffect(() => {
    setFilterOpen(activeFilter === 'open')
    setFilterClaimed(activeFilter === 'claimed' ? 'claimed' : 'all')
    lastFetchKey.current = null
  }, [activeFilter])

  // Reset fetch key when switching modes so we force a refresh
  useEffect(() => {
    lastFetchKey.current = null
  }, [heatmapMode])

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
      return `${north}|${south}|${east}|${west}|${zoomValue}|${filterOpen}|${filterForSale}|${filterForRent}|${filterClaimed}|${heatmapMode}`
    },
    [filterClaimed, filterForRent, filterForSale, filterOpen, heatmapMode]
  )

  const propertyMap = useMemo(() => {
    const m = new Map<string, MapProperty>()
    properties.forEach((p) => m.set(p.id, p))
    return m
  }, [properties])

  const spiderfyPositions = useMemo(() => {
    const grouped = new Map<string, MapProperty[]>()
    properties.forEach((p) => {
      const key = `${p.lat.toFixed(6)}|${p.lon.toFixed(6)}`
      const list = grouped.get(key) ?? []
      list.push(p)
      grouped.set(key, list)
    })

    const offsets = new Map<string, [number, number]>()
    grouped.forEach((list) => {
      if (list.length === 1) {
        offsets.set(list[0].id, [list[0].lat, list[0].lon])
        return
      }

      const radiusMeters = 12
      list.forEach((p, idx) => {
        const angle = (2 * Math.PI * idx) / list.length
        const deltaLat = (radiusMeters / 111320) * Math.cos(angle)
        const deltaLon =
          (radiusMeters / (111320 * Math.cos((p.lat * Math.PI) / 180) || 1)) *
          Math.sin(angle)
        offsets.set(p.id, [p.lat + deltaLat, p.lon + deltaLon])
      })
    })

    return offsets
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
    const index = new Supercluster({
      radius: 80,
      maxZoom: CLUSTER_MAX_ZOOM,
      minZoom: 0,
      map: (props: any) => ({
        openToTalkingCount: props.is_open_to_talking ? 1 : 0,
        forSaleCount: props.is_for_sale ? 1 : 0,
        forRentCount: props.is_for_rent ? 1 : 0,
      }),
      reduce: (accumulated: any, props: any) => {
        accumulated.openToTalkingCount += props.openToTalkingCount ?? 0
        accumulated.forSaleCount += props.forSaleCount ?? 0
        accumulated.forRentCount += props.forRentCount ?? 0
      },
    })
    return index.load(geojsonPoints as any)
  }, [geojsonPoints])

  const getClusterColor = (clusterProps: any) => {
    if ((clusterProps?.forSaleCount ?? 0) > 0 || (clusterProps?.forRentCount ?? 0) > 0) {
      return '#E65F52'
    }
    if ((clusterProps?.openToTalkingCount ?? 0) > 0) {
      return '#007C7C'
    }
    return '#475569'
  }

  const zoomLevel = map ? map.getZoom() : 0

  const clusters = useMemo(() => {
    if (!map || zoomLevel >= INDIVIDUAL_MARKER_ZOOM) return []

    const bounds = map.getBounds()
    const north = bounds.getNorth()
    const south = bounds.getSouth()
    const east = bounds.getEast()
    const west = bounds.getWest()

    return clusterIndex.getClusters([west, south, east, north], zoomLevel)
  }, [clusterIndex, map, viewport, zoomLevel, heatmapMode])

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

    const bounds = map.getBounds().pad(0.1)
    const zoomValue = map.getZoom()
    const key = buildBoundsKey(bounds, zoomValue)

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

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsLoading(true)

    try {
      if (heatmapMode) {
        // RPC Call for Heatmap
        const params = {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
          mode: heatmapMode
        }
        console.log('[ShopMap] fetching heatmap points', params)

        const { data, error } = await supabase.rpc('get_heatmap_points', params as any)

        if (error) {
          console.error('[ShopMap] heatmap fetch error', JSON.stringify(error, null, 2))
          // Fallback to empty array on error to prevent UI crash
          setHeatmapPoints([])
        } else {
          setHeatmapPoints(data as HeatmapPoint[] ?? [])
        }
      } else {
        // Standard API Call
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

        const res = await fetch(url, { signal: controller.signal })
        const json = await res.json()

        if (!res.ok) {
          console.error('[ShopMap] error from /api/properties', json)
          return
        }

        setProperties((prev) => {
          const raw = json.data ?? []
          const next = (raw as any[]).map((item) => {
            const signals = {
              is_for_sale: item?.is_for_sale ?? false,
              is_for_rent: item?.is_for_rent ?? false,
              soft_listing: item?.is_open_to_talking ?? false,
            }
            return {
              ...item,
              signals,
              is_claimed: item?.is_claimed ?? false,
              is_for_sale: signals.is_for_sale,
              is_for_rent: signals.is_for_rent,
              is_open_to_talking: signals.soft_listing,
            }
          })
          const prevIds = prev.map((p) => p.id).join('|')
          const nextIds = next.map((p: MapProperty) => p.id).join('|')
          if (prevIds === nextIds) return prev
          return next as MapProperty[]
        })

        if (!hasFitBounds.current && map && Array.isArray(json.data) && json.data.length > 0) {
          const fitBounds = L.latLngBounds(json.data.map((p: MapProperty) => [p.lat, p.lon] as [number, number]))
          map.fitBounds(fitBounds)
          hasFitBounds.current = true
        }
      }
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        return
      }
      console.error('[ShopMap] network error', err)
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false)
      }
    }
  }, [buildBoundsKey, filterClaimed, filterForRent, filterForSale, filterOpen, heatmapMode, map, supabase])

  useEffect(() => {
    if (!map) {
      // console.log('[ShopMap] map not ready yet')
      return
    }

    const debouncedFetch = () => {
      if (fetchTimeout.current) clearTimeout(fetchTimeout.current)
      fetchTimeout.current = setTimeout(() => {
        fetchForBounds()
      }, 500)
    }

    debouncedFetch()

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

  useEffect(() => {
    if (!map) return
    fetchForBounds()
  }, [fetchForBounds, map, refreshSignal])

  const createSolidIcon = (color: string, size: number, isOwner: boolean) => {
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

  const createRingIcon = (borderColor: string, size: number) => {
    const borderWidth = 2
    return L.divIcon({
      html: `
        <div style="width:${size}px;height:${size}px;border:${borderWidth}px solid ${borderColor};background:#ffffff;border-radius:9999px;" aria-hidden="true"></div>
      `,
      className: 'nest-pin',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    })
  }

  const createClusterIcon = (count: number, color: string) => {
    const sizeClass = count < 20 ? 'w-10 h-10 text-sm' : count < 100 ? 'w-12 h-12 text-base' : 'w-14 h-14 text-lg'
    const size = count < 20 ? 40 : count < 100 ? 48 : 56
    return L.divIcon({
      html: `
        <div class="rounded-full text-white font-bold flex items-center justify-center border-4 border-white shadow-xl transition-transform hover:scale-110 ${sizeClass}" style="background:${color}">
          ${count}
        </div>
      `,
      className: 'nest-cluster',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    })
  }

  const getShopIcon = (property: MapProperty) => {
    const override = intentOverrides[property.id]
    const merged = override ? { ...property, ...override } : property
    const isOwner = !!currentUserId && merged.claimed_by_user_id === currentUserId
    const isSale = merged.signals?.is_for_sale ?? merged.is_for_sale
    const isRent = merged.signals?.is_for_rent ?? merged.is_for_rent
    const isOpen = merged.signals?.soft_listing ?? merged.is_open_to_talking
    const isClaimed = merged.is_claimed

    if (isSale) {
      const icon = createSolidIcon('#E65F52', 20, isOwner)
      return { icon, zIndexOffset: isOwner ? 1000 : 600 }
    }
    if (isRent) {
      const icon = createSolidIcon('#6366F1', 20, isOwner)
      return { icon, zIndexOffset: isOwner ? 1000 : 600 }
    }
    if (isOpen) {
      const icon = createSolidIcon('#007C7C', 20, isOwner)
      return { icon, zIndexOffset: isOwner ? 1000 : 500 }
    }
    if (isClaimed) {
      const icon = createSolidIcon('#475569', 18, isOwner)
      return { icon, zIndexOffset: isOwner ? 1000 : 400 }
    }

    const icon = createRingIcon('#CBD5E1', 12)
    return { icon, zIndexOffset: 0 }
  }

  const handleClusterClick = useCallback(
    (cluster: any) => {
      if (!map) return
      const expansionZoom = clusterIndex.getClusterExpansionZoom(cluster.id)
      const [lon, lat] = cluster.geometry.coordinates
      map.flyTo([lat, lon], expansionZoom, { animate: true })
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
      const count = cluster.properties.point_count
      const color = getClusterColor({
        openToTalkingCount: cluster.properties.openToTalkingCount,
        forSaleCount: cluster.properties.forSaleCount,
        forRentCount: cluster.properties.forRentCount,
      })
      return (
        <Marker
          key={`cluster-${cluster.id}`}
          position={[lat, lon]}
          icon={createClusterIcon(count, color)}
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
      const position = spiderfyPositions.get(displayProperty.id) ?? [displayProperty.lat, displayProperty.lon]

      return (
        <Marker
          key={displayProperty.id}
          position={position as [number, number]}
          icon={icon}
          zIndexOffset={zIndexOffset}
          bubblingMouseEvents={false}
          interactive
          eventHandlers={{
            click: (e) => {
              suppressFetchUntil.current = Date.now() + 300
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
  }, [getShopIcon, intentOverrides, onShopClick, properties, spiderfyPositions, heatmapMode])

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

        {heatmapMode && (
          <HeatmapOverlay points={heatmapPoints} mode={heatmapMode} />
        )}

        {(activeLayers?.homes ?? true) && (
          <>
            {map && zoomLevel >= INDIVIDUAL_MARKER_ZOOM
              ? markers
              : clusters.map((cluster: any) => renderClusterOrMarker(cluster))}
          </>
        )}

        {/* POI Layer */}
        {poiTypes.length > 0 && <PoiLayer visibleTypes={poiTypes} />}
      </MapContainer>
    </div>
  )
}
