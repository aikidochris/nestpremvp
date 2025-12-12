import { useState, useEffect } from 'react'
import { MapProperty } from '@/types/models'
import { getSupabaseClient } from '@/lib/supabaseClient'

// Haversine distance in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d * 1000; // Meters
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

export function useNeighborRouting(targetProperty: MapProperty) {
    const [neighbors, setNeighbors] = useState<MapProperty[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const supabase = getSupabaseClient()

    useEffect(() => {
        let mounted = true

        async function fetchNeighbors() {
            if (!targetProperty) return
            setIsLoading(true)

            // Simplification: We need coordinates. 
            // In a real app we might use PostGIS ST_DWithin in RPC.
            // For now, let's try a simple bounding box query from public view
            // +1/-1 lat/lon is huge, so we create a small window.
            // 0.002 degrees is roughly 200m
            const RANGE = 0.002

            const { data, error } = await supabase
                .from('property_public_view')
                .select('*')
                .eq('is_claimed', true) // Only claimed neighbors
                .or('is_open_to_talking.eq.true,is_for_sale.eq.true') // Must be Open OR For Sale
                .gte('lat', targetProperty.lat - RANGE)
                .lte('lat', targetProperty.lat + RANGE)
                .gte('lon', targetProperty.lon - RANGE)
                .lte('lon', targetProperty.lon + RANGE)
                .limit(20)

            if (error) {
                console.error('Error fetching neighbors', error)
                if (mounted) setIsLoading(false)
                return
            }

            // Client side filtering for exact distance
            const sorted = (data as any[] as MapProperty[])
                .map(p => ({
                    ...p,
                    dist: getDistanceFromLatLonInM(targetProperty.lat, targetProperty.lon, p.lat, p.lon)
                }))
                .filter(p => p.id !== targetProperty.id) // Exclude self if claimed
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 3) // Top 3 closest

            if (mounted) {
                setNeighbors(sorted)
                setIsLoading(false)
            }
        }

        fetchNeighbors()

        return () => { mounted = false }
    }, [targetProperty.id, targetProperty.lat, targetProperty.lon])

    return { neighbors, isLoading }
}
