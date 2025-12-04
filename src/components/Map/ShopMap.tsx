'use client'

import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
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

type PropertyStatus = 'for-sale' | 'for-rent' | 'open' | 'claimed' | 'unclaimed'

interface ShopMapProps {
  center?: [number, number]
  zoom?: number
  onShopClick?: (property: MapProperty) => void
  currentUserId?: string | null
  refreshSignal?: number
}

function MapInstanceCatcher({ onReady }: { onReady: (map: L.Map) => void }) {
  const m = useMap()
  useEffect(() => {
    onReady(m)
  }, [m, onReady])
  return null
}

const INDIVIDUAL_MARKER_ZOOM = 17
const PIN_LEGEND = [
  { label: 'Claimed', letter: 'C', color: 'var(--pin-claimed, #007c7c)' },
  { label: 'Open to conversations', letter: 'O', color: 'var(--pin-open, #009b9b)' },
  { label: 'Unclaimed', letter: 'U', color: 'var(--pin-unclaimed, #94a3b8)' },
  { label: 'You', letter: 'H', color: 'var(--pin-user, #004f4f)' },
]

// Marker variants
const circleIcon = (options: { color: string; border?: string; label?: string; size?: number }) => {
  const size = options.size ?? 26
  const border = options.border ?? '#ffffff'
  const label = options.label ?? ''
  return L.divIcon({
    html: `
      <div style="
        background-color: ${options.color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        color: #ffffff;
        border: 3px solid ${border};
        box-shadow: 0 2px 8px rgba(0,0,0,0.18);
      ">
        ${label}
      </div>
    `,
    className: 'custom-circle-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  })
}

const hollowIcon = (options: { color: string; label?: string; size?: number }) => {
  const size = options.size ?? 26
  const label = options.label ?? ''
  return L.divIcon({
    html: `
      <div style="
        background-color: rgba(255,255,255,0.85);
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 700;
        color: ${options.color};
        border: 2px solid ${options.color};
        box-shadow: 0 2px 6px rgba(0,0,0,0.12);
      ">
        ${label}
      </div>
    `,
    className: 'custom-circle-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  })
}

const yourHomeIcon = circleIcon({ color: 'var(--pin-user, #004f4f)', label: 'H', size: 30 })
const openHomeIcon = circleIcon({ color: 'var(--pin-open, #009b9b)', label: 'O' })
const claimedHomeIcon = circleIcon({ color: 'var(--pin-claimed, #007c7c)', label: 'C' })
const unclaimedHomeIcon = hollowIcon({ color: 'var(--pin-unclaimed, #94a3b8)', label: 'U' })

const clusterIcon = (count: number) =>
  L.divIcon({
    html: `<div style="background:var(--brand-primary, #007c7c);color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.18);">${count}</div>`,
    className: 'custom-cluster-marker',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })

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

function derivePropertyStatus(p: MapProperty): PropertyStatus {
  if (p.is_for_sale) return 'for-sale'
  if (p.is_for_rent) return 'for-rent'
  if (p.is_open_to_talking) return 'open'
  if (p.is_claimed) return 'claimed'
  return 'unclaimed'
}

export default function ShopMap({
  center = [54.9749, -1.6103],
  zoom = 14,
  onShopClick,
  currentUserId,
  refreshSignal = 0,
}: ShopMapProps) {
  console.log('[ShopMap] render')
  const [map, setMap] = useState<L.Map | null>(null)
  const [properties, setProperties] = useState<MapProperty[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showLoadingBadge, setShowLoadingBadge] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const [visibleCount, setVisibleCount] = useState<number | null>(null)
  const [totalCount, setTotalCount] = useState<number | null>(null)

  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  const [filterForSale, setFilterForSale] = useState<boolean>(false)
  const [filterForRent, setFilterForRent] = useState<boolean>(false)
  const [filterClaimed, setFilterClaimed] = useState<'all' | 'claimed' | 'unclaimed'>('all')

  const [viewport, setViewport] = useState<{ north: number; south: number; east: number; west: number; zoom: number } | null>(null)
  const hasFitBounds = useRef(false)
  const lastFetchKey = useRef<string | null>(null)
  const fetchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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

      setProperties(json.data ?? [])
      setVisibleCount(Array.isArray(json.data) ? json.data.length : null)
      setTotalCount(typeof json.totalCount === 'number' ? json.totalCount : null)
      setTruncated(Boolean(json.truncated))

      if (!hasFitBounds.current && map && Array.isArray(json.data) && json.data.length > 0) {
        const fitBounds = L.latLngBounds(json.data.map((p: MapProperty) => [p.lat, p.lon] as [number, number]))
        map.fitBounds(fitBounds)
        hasFitBounds.current = true
      }
    } catch (err) {
      console.error('[ShopMap] network error fetching properties', err)
      setProperties([])
      setTruncated(false)
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

  const getShopIcon = (property: MapProperty) => {
    const isClaimedByMe = !!currentUserId && property.claimed_by_user_id === currentUserId
    // Prioritize "open to conversations" so it's visually obvious, even if claimed
    if (property.is_open_to_talking) return openHomeIcon
    if (isClaimedByMe) return yourHomeIcon
    if (property.is_claimed) return claimedHomeIcon
    return unclaimedHomeIcon
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

  const renderPropertyMarker = (property: MapProperty) => {
    const label = buildDisplayLabel(property)
    const address = property.postcode || property.street || 'No postcode'

    return (
      <Marker
        key={property.id}
        position={[property.lat, property.lon]}
        icon={getShopIcon(property)}
        eventHandlers={{
          click: () => handlePointClick(property.id),
        }}
      >
        <Popup>
          <div className="p-3 min-w-[220px]">
            <h3 className="font-bold text-lg text-stone-900 mb-1">{label}</h3>
            <p className="text-sm text-stone-600 mb-3">{address}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handlePointClick(property.id)
              }}
              className="w-full px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium transition-colors"
            >
              View home
            </button>
          </div>
        </Popup>
      </Marker>
    )
  }

  const renderClusterOrMarker = (cluster: any) => {
    const [lon, lat] = cluster.geometry.coordinates
    const isCluster = cluster.properties.cluster

    if (isCluster) {
      const count = cluster.properties.point_count
      return (
        <Marker
          key={`cluster-${cluster.id}`}
          position={[lat, lon]}
          icon={clusterIcon(count)}
          eventHandlers={{
            click: () => handleClusterClick(cluster),
          }}
        />
      )
    }

    const property = propertyMap.get(cluster.properties.id)
    if (!property) return null

    return renderPropertyMarker(property)
  }

  return (
    <div className="relative w-full h-full">
      {showLoadingBadge && (
        <div className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-700 shadow-lg ring-1 ring-slate-200">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Updating map…
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-700">
        <span className="font-medium text-slate-800">Who&apos;s looking?</span>

        <button
          type="button"
          onClick={() => setFilterOpen((prev) => !prev)}
          className={clsx(
            'rounded-full border px-3 py-1 transition-colors',
            filterOpen ? 'border-[var(--brand-primary,#007c7c)] bg-[color:rgba(0,124,124,0.1)] text-[var(--brand-primary,#007c7c)]' : 'border-slate-200 bg-white text-slate-600'
          )}
        >
          Open to conversations
        </button>

        <div className="ml-auto flex items-center gap-1">
          <span className="text-[11px] text-slate-500">Claimed:</span>
          <select
            value={filterClaimed}
            onChange={(e) => setFilterClaimed(e.target.value as 'all' | 'claimed' | 'unclaimed')}
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700"
          >
            <option value="all">All</option>
            <option value="claimed">Claimed</option>
            <option value="unclaimed">Unclaimed</option>
          </select>
        </div>
      </div>

      {(totalCount != null || visibleCount != null) && (
        <div className="mb-1 text-[11px] text-slate-500">
          {totalCount != null ? (
            <>
              <span className="font-medium text-slate-800">{totalCount.toLocaleString('en-GB')} homes</span> people are curious about here
            </>
          ) : visibleCount != null ? (
            <>
              <span className="font-medium text-slate-800">{visibleCount.toLocaleString('en-GB')} homes</span> people are curious about here
            </>
          ) : null}
          {truncated && (
            <span className="ml-1 text-slate-400">
              (showing first {visibleCount?.toLocaleString('en-GB') ?? '...'} — zoom in or loosen filters to see more)
            </span>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-700">
        <span className="font-medium text-slate-800">Pin key:</span>
        {PIN_LEGEND.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm"
          >
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
              style={{ backgroundColor: item.color }}
            >
              {item.letter}
            </span>
            <span className="text-[11px] text-slate-700">{item.label}</span>
          </div>
        ))}
      </div>

      {!isLoading && properties.length === 0 && (
        <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          Quiet street — for now. Pan the map or relax filters to see who&apos;s looking nearby.
        </div>
      )}

      <MapContainer
        center={center}
        zoom={zoom}
        className="w-full h-full"
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', minHeight: '500px' }}
      >
        <MapInstanceCatcher onReady={setMap} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors & Carto'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {map && zoomLevel >= INDIVIDUAL_MARKER_ZOOM
          ? properties.map((property) => renderPropertyMarker(property))
          : clusters.map((cluster: any) => renderClusterOrMarker(cluster))}
      </MapContainer>
    </div>
  )
}
