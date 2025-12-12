import { useEffect, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'

export interface FeedItem {
    event_id: string
    type: 'CLAIM' | 'STORY' | 'STATUS'
    property_id: string
    created_at: string
    summary_text: string
    lat: number
    lon: number
    street: string
    house_number: string
    market_image_url: string | null
}

export function useActivityFeed(
    userId?: string | null,
    location?: { lat: number; lon: number; radius?: number } | null
) {
    const [feedItems, setFeedItems] = useState<FeedItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = getSupabaseClient()

    const fetchFeed = useCallback(async () => {
        setIsLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.rpc('get_activity_feed', {
                p_user_id: userId || '00000000-0000-0000-0000-000000000000',
                p_lat: location?.lat ?? null,
                p_lon: location?.lon ?? null,
                p_radius_meters: location?.radius ?? 5000
            })

            if (error) throw error

            setFeedItems(data as unknown as FeedItem[])
        } catch (err: any) {
            console.error('Error fetching activity feed:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }, [userId, location?.lat, location?.lon, location?.radius]) // Deep compare location

    useEffect(() => {
        // Simple debounce could be added here if not handled by parent
        const timer = setTimeout(() => {
            fetchFeed()
        }, 500) // 500ms debounce
        return () => clearTimeout(timer)
    }, [fetchFeed])

    return { feedItems, isLoading, error, refresh: fetchFeed }
}
