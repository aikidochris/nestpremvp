import { useState, useCallback, useRef } from 'react'
import type { MapProperty } from '@/types/models'
import type L from 'leaflet'

export function useProperties(initialShops: MapProperty[] = []) {
    const [shops, setShops] = useState<MapProperty[]>(initialShops)
    const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchProperties = useCallback((center: [number, number], bounds?: L.LatLngBounds) => {
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

                const data = json?.data || []
                // Optional: Perform any data transformation here if needed to match MapProperty exactly
                // For now, assuming API returns correct shape as per existing code
                setShops(data)
            } catch (error) {
                console.error('Error fetching properties:', error)
            }
        }, 500)
    }, [])

    return {
        shops,
        setShops,
        fetchProperties
    }
}
