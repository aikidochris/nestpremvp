import { useEffect, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'

export interface FeedItem {
    event_id: string
    type: 'CLAIM' | 'STORY' | 'STATUS'
    property_id: string
    created_at: string
    summary_text: string
}

export function useActivityFeed(userId?: string | null) {
    const [feedItems, setFeedItems] = useState<FeedItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const supabase = getSupabaseClient()

    const fetchFeed = useCallback(async () => {
        if (!userId) {
            setFeedItems([])
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.rpc('get_activity_feed', {
                p_user_id: userId,
            })

            if (error) throw error

            setFeedItems(data as FeedItem[])
        } catch (err: any) {
            console.error('Error fetching activity feed:', err)
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchFeed()
    }, [fetchFeed])

    return { feedItems, isLoading, error, refresh: fetchFeed }
}
