import { useEffect, useState, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'

export interface Notification {
    id: string
    user_id: string
    type: 'status_change' | 'claim' | 'story' | 'system'
    title: string
    message: string
    resource_id?: string | null
    is_read: boolean
    created_at: string
}

export function useNotifications(userId?: string | null) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

    const supabase = getSupabaseClient()

    const fetchNotifications = useCallback(async () => {
        if (!userId) {
            setNotifications([])
            setUnreadCount(0)
            setLoading(false)
            return
        }

        try {
            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50)

            if (error) throw error

            setNotifications(data || [])
            setUnreadCount(data?.filter((n) => !n.is_read).length || 0)
        } catch (err) {
            console.error('Error fetching notifications:', err)
        } finally {
            setLoading(false)
        }
    }, [userId])

    const markAsRead = useCallback(async (id: string) => {
        if (!userId) return

        // Optimistic update
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id)

            if (error) throw error
        } catch (err) {
            console.error('Error marking notification as read:', err)
            // Revert if needed, but for read status it's usually fine to stay optimistic
        }
    }, [userId])

    const markAllAsRead = useCallback(async () => {
        if (!userId) return

        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        setUnreadCount(0)

        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', userId)
                .eq('is_read', false)

            if (error) throw error
        } catch (err) {
            console.error('Error marking all as read:', err)
        }
    }, [userId])

    useEffect(() => {
        fetchNotifications()
    }, [fetchNotifications])

    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    const newNotification = payload.new as Notification
                    setNotifications((prev) => [newNotification, ...prev])
                    setUnreadCount((prev) => prev + 1)
                }
            )
            .subscribe()

        channelRef.current = channel

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])

    return { notifications, unreadCount, markAsRead, markAllAsRead, loading }
}
