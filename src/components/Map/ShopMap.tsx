'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Supercluster from 'supercluster'

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
}

function MapInstanceCatcher({ onReady }: { onReady: (map: L.Map) => void }) {
  const m = useMap()
  useEffect(() => {
    onReady(m)
  }, [m, onReady])
  return null
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

const clusterIcon = (count: number) =>
  L.divIcon({
    html: `<div style="background:#f97316;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);">${count}</div>`,
    className: 'custom-cluster-marker',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
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
}: ShopMapProps) {
  console.log('[ShopMap] render')
  const [map, setMap] = useState<L.Map | null>(null)
  const [properties, setProperties] = useState<MapProperty[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [truncated, setTruncated] = useState(false)

  const [filterOpen, setFilterOpen] = useState<boolean>(false)
  const [filterForSale, setFilterForSale] = useState<boolean>(false)
  const [filterForRent, setFilterForRent] = useState<boolean>(false)
  const [filterClaimed, setFilterClaimed] = useState<'all' | 'claimed' | 'unclaimed'>('all')

  const [viewport, setViewport] = useState<{ north: number; south: number; east: number; west: number; zoom: number } | null>(null)
  const hasFitBounds = useRef(false)

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
    const index = new Supercluster({ radius: 60, maxZoom: 19, minZoom: 0 })
    return index.load(geojsonPoints as any)
  }, [geojsonPoints])

  const clusters = useMemo(() => {
    if (!viewport) return []
    return clusterIndex.getClusters([viewport.west, viewport.south, viewport.east, viewport.north], Math.round(viewport.zoom))
  }, [clusterIndex, viewport])

  useEffect(() => {
    if (!map) {
      console.log('[ShopMap] map not ready yet')
      return
    }

    let cancelled = false

    const fetchForBounds = async () => {
      if (!map) return

      const bounds = map.getBounds()
      const north = bounds.getNorth()
      const south = bounds.getSouth()
      const east = bounds.getEast()
      const west = bounds.getWest()

      setViewport({ north, south, east, west, zoom: map.getZoom() })

      const params = new URLSearchParams()
      params.set('north', north.toString())
      params.set('south', south.toString())
      params.set('east', east.toString())
      params.set('west', west.toString())
      params.set('filter_open', String(filterOpen))
      params.set('filter_for_sale', String(filterForSale))
      params.set('filter_for_rent', String(filterForRent))
      if (filterClaimed !== 'all') {
        params.set('filter_claimed', filterClaimed)
      }

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

        if (!res.ok || cancelled) {
          if (!res.ok) console.error('[ShopMap] error from /api/properties', json)
          return
        }

        setProperties(json.data ?? [])
        setTruncated(Boolean(json.truncated))

        if (!hasFitBounds.current && map && Array.isArray(json.data) && json.data.length > 0) {
          const bounds = L.latLngBounds(json.data.map((p: MapProperty) => [p.lat, p.lon] as [number, number]))
          map.fitBounds(bounds)
          hasFitBounds.current = true
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ShopMap] network error fetching properties', err)
          setProperties([])
          setTruncated(false)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    // initial fetch
    fetchForBounds()

    // refetch on move/zoom
    map.on('moveend', fetchForBounds)
    map.on('zoomend', fetchForBounds)

    return () => {
      cancelled = true
      map.off('moveend', fetchForBounds)
      map.off('zoomend', fetchForBounds)
    }
  }, [map, filterOpen, filterForSale, filterForRent, filterClaimed])

  const getShopIcon = (property: MapProperty) => {
    const isClaimedByMe = !!currentUserId && property.claimed_by_user_id === currentUserId
    const status = derivePropertyStatus(property)

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

  return (
    <div className="relative w-full h-full">
      {/* Filters */}
      <div className="absolute top-4 left-4 z-[1100] flex flex-wrap gap-2 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-stone-200 shadow-sm">
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <input
            type="checkbox"
            checked={filterOpen}
            onChange={(e) => setFilterOpen(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300"
          />
          Open to conversations
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <input
            type="checkbox"
            checked={filterForSale}
            onChange={(e) => setFilterForSale(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300"
          />
          For sale
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          <input
            type="checkbox"
            checked={filterForRent}
            onChange={(e) => setFilterForRent(e.target.checked)}
            className="h-4 w-4 rounded border-stone-300"
          />
          For rent
        </label>
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
          Claimed:
          <select
            value={filterClaimed}
            onChange={(e) => setFilterClaimed(e.target.value as 'all' | 'claimed' | 'unclaimed')}
            className="border border-stone-300 rounded px-2 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="claimed">Claimed</option>
            <option value="unclaimed">Unclaimed</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <div className="absolute top-4 right-4 z-[1100] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow border border-stone-200 text-sm text-stone-700">
          Updating homes…
        </div>
      )}

      {truncated && (
        <div className="absolute top-16 right-4 z-[1100] bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow border border-stone-200 text-xs text-stone-700 max-w-xs">
          Showing up to 2,000 homes in this area. Zoom in or use filters to see more.
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
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {clusters.map((cluster: any) => renderClusterOrMarker(cluster))}
      </MapContainer>
    </div>
  )
}
