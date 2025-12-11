import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { MessageThread } from '@/types/social'
import type { Database } from '@/lib/database.types'

type DBMessage = Database['public']['Tables']['messages']['Row']

export function useMessaging(propertyId: string, currentUserId?: string) {
    const [thread, setThread] = useState<MessageThread | null>(null)
    const [messages, setMessages] = useState<DBMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const supabase = getSupabaseClient()

    // Fetch or find active thread
    const fetchThread = useCallback(async () => {
        if (!currentUserId || !propertyId) return

        setIsLoading(true)

        // Find existing thread between buyer and owner for this property
        // Note: For now assuming 1-1 thread per property per buyer
        const { data, error } = await supabase
            .from('message_threads')
            .select('*')
            .eq('property_id', propertyId)
            .eq('buyer_id', currentUserId)
            .limit(1)
            .maybeSingle()

        if (!error && data) {
            // Adapt DB shape to MessageThread interface if needed, or use DB shape directly
            // For now, mapping broadly
            const mappedThread: MessageThread = {
                id: data.id,
                property_id: data.property_id,
                participants: [data.buyer_id, data.owner_id],
                state: data.state as MessageThread['state'],
                last_message_at: data.last_message_at || data.created_at || new Date().toISOString(),
                created_at: data.created_at || new Date().toISOString()
            }
            setThread(mappedThread)

            // Fetch messages
            const { data: threadMessages } = await supabase
                .from('messages')
                .select('*')
                .eq('thread_id', data.id)
                .order('created_at', { ascending: true })

            if (threadMessages) {
                setMessages(threadMessages)
            }
        } else {
            setThread(null)
            setMessages([])
        }
        setIsLoading(false)
    }, [propertyId, currentUserId, supabase])

    // Load on mount if users exists
    useEffect(() => {
        fetchThread()
    }, [fetchThread])

    // Create thread and send first message
    const startThread = async (content: string, ownerId: string) => {
        if (!currentUserId) return

        setIsSending(true)

        // 1. Create Thread
        const { data: newThread, error: threadError } = await supabase
            .from('message_threads')
            .insert({
                property_id: propertyId,
                owner_id: ownerId,
                buyer_id: currentUserId,
                state: 'talking'
            })
            .select()
            .single()

        if (threadError || !newThread) {
            console.error('Failed to create thread', threadError)
            setIsSending(false)
            return
        }

        // 2. Send Message
        const { data: newMessage, error: msgError } = await supabase
            .from('messages')
            .insert({
                thread_id: newThread.id,
                sender_id: currentUserId,
                content: content,
                status: 'sent'
            })
            .select()
            .single()

        if (!msgError && newMessage) {
            const mappedThread: MessageThread = {
                id: newThread.id,
                property_id: newThread.property_id,
                participants: [newThread.buyer_id, newThread.owner_id],
                state: newThread.state as MessageThread['state'],
                last_message_at: newThread.last_message_at || newThread.created_at || new Date().toISOString(),
                created_at: newThread.created_at || new Date().toISOString()
            }
            setThread(mappedThread)
            setMessages([newMessage])
        }

        setIsSending(false)
    }

    // Send generic message in existing thread
    const sendMessage = async (content: string) => {
        if (!thread || !currentUserId) return

        setIsSending(true)

        const { data: newMessage, error } = await supabase
            .from('messages')
            .insert({
                thread_id: thread.id,
                sender_id: currentUserId,
                content: content,
                status: 'sent'
            })
            .select()
            .single()

        if (!error && newMessage) {
            setMessages(prev => [...prev, newMessage])
        }
        setIsSending(false)
    }

    return {
        thread,
        messages,
        isLoading,
        isSending,
        startThread,
        sendMessage,
        refresh: fetchThread
    }
}
