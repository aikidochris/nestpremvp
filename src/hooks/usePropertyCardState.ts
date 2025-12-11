import { useState, useEffect } from 'react'
import type { MapProperty } from '@/types/models'
import type { User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { CardMode } from '@/types/social'

interface UsePropertyCardStateProps {
    property: MapProperty
    currentUser: User | null
    myClaims?: { lat: number; lon: number }[] // Minimal needed for distance check
    initialNoteCount?: number
}

// Simple Haversine for distance in meters
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371 // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1)
    const dLon = deg2rad(lon2 - lon1)
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const d = R * c // Distance in km
    return d
}

function deg2rad(deg: number) {
    return deg * (Math.PI / 180)
}

export function usePropertyCardState({
    property,
    currentUser,
    myClaims = [],
    initialNoteCount = 0
}: UsePropertyCardStateProps) {
    const [mode, setMode] = useState<CardMode>('buyer')
    const [hasNotes, setHasNotes] = useState(false)
    const [noteCount, setNoteCount] = useState(initialNoteCount)
    const [isLoadingNotes, setIsLoadingNotes] = useState(false)

    // Settled logic: Claimed but NOT open to talking, NOT for sale, NOT for rent
    const isSettled = property.is_claimed &&
        !property.is_open_to_talking &&
        !property.is_for_sale &&
        !property.is_for_rent

    useEffect(() => {
        let newMode: CardMode = 'buyer'

        const ownerId = property.claimed_by_user_id

        if (currentUser && ownerId === currentUser.id) {
            newMode = 'owner'
        } else if (!ownerId) {
            newMode = 'unclaimed'
        } else {
            // Check for neighbor status (within 1km of any of my claims)
            const isNeighbor = myClaims.some(claim => {
                const dist = getDistanceFromLatLonInKm(claim.lat, claim.lon, property.lat, property.lon)
                return dist <= 1.0
            })

            if (isNeighbor) {
                newMode = 'neighbor'
            } else {
                newMode = 'buyer'
            }
        }

        setMode(newMode)
    }, [property, currentUser, myClaims])

    // Fetch note count if owner
    useEffect(() => {
        if (mode === 'owner' && currentUser) {
            const fetchNotes = async () => {
                setIsLoadingNotes(true)
                const supabase = getSupabaseClient()
                // Assuming 'pending' notes are what we care about
                const { count, error } = await supabase
                    .from('unclaimed_notes')
                    .select('*', { count: 'exact', head: true })
                    .eq('property_id', property.id)
                    .eq('status', 'pending')

                if (!error && count !== null) {
                    setNoteCount(count)
                    setHasNotes(count > 0)
                }
                setIsLoadingNotes(false)
            }
            fetchNotes()
        }
    }, [mode, property.id, currentUser])

    return {
        mode,
        isSettled,
        hasNotes,
        noteCount,
        isLoadingNotes
    }
}
