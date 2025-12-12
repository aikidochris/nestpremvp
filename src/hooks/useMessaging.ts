import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { MessageThread } from '@/types/social'
import type { Database } from '@/lib/database.types'

type DBMessage = Database['public']['Tables']['messages']['Row']

export function useMessaging(propertyId: string, currentUserId?: string, specificThreadId?: string) {
    const [thread, setThread] = useState<MessageThread | null>(null)
    const [messages, setMessages] = useState<DBMessage[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const supabase = getSupabaseClient()

    // Fetch or find active thread
    const fetchThread = useCallback(async () => {
        if (!currentUserId && !specificThreadId) return
        if (!propertyId) return

        setIsLoading(true)

        let data, error

        if (specificThreadId) {
            // Fetch specific thread (Owner View)
            const result = await supabase
                .from('message_threads')
                .select('*')
                .eq('id', specificThreadId)
                .single()
            data = result.data
            error = result.error
        } else {
            // Find existing thread between buyer and owner (Buyer View)
            const result = await supabase
                .from('message_threads')
                .select('*')
                .eq('property_id', propertyId)
                .eq('buyer_id', currentUserId!)
                .limit(1)
                .maybeSingle()
            data = result.data
            error = result.error
        }

        if (!error && data) {
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
    }, [propertyId, currentUserId, specificThreadId, supabase])

    // Load on mount if user exists
    useEffect(() => {
        fetchThread()
    }, [fetchThread])

    // Realtime subscription for new messages
    useEffect(() => {
        if (!thread?.id) return

        const channel = supabase
            .channel(`messages:${thread.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `thread_id=eq.${thread.id}`
                },
                (payload) => {
                    const newMsg = payload.new as DBMessage
                    // Avoid duplicates (in case optimistic UI already added it)
                    setMessages(prev => {
                        const exists = prev.some(m => m.id === newMsg.id || (m.id.startsWith('temp-') && m.content === newMsg.content))
                        if (exists) {
                            // Replace temp message with real one
                            return prev.map(m =>
                                m.id.startsWith('temp-') && m.content === newMsg.content ? newMsg : m
                            )
                        }
                        return [...prev, newMsg]
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [thread?.id, supabase])

    // Create thread and send first message
    const startThread = async (content: string, ownerId: string) => {
        if (!currentUserId) return null

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
            return null
        }

        // 2. Send Message
        const { data: newMessage, error: msgError } = await supabase
            .from('messages')
            .insert({
                thread_id: newThread.id,
                sender_id: currentUserId,
                receiver_id: ownerId,
                content: content
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
        return newThread // Return the DB thread object
    }

    // Send generic message in existing thread
    const sendMessage = async (content: string) => {
        if (!thread || !currentUserId) {
            console.warn('[sendMessage] Missing thread or currentUserId', { thread: !!thread, currentUserId: !!currentUserId })
            return
        }

        // Calculate receiver (the OTHER participant)
        const receiverId = thread.participants.find(p => p !== currentUserId)
        if (!receiverId) {
            console.error('[sendMessage] Cannot determine receiver from participants:', thread.participants)
            return
        }

        setIsSending(true)

        const { data: newMessage, error } = await supabase
            .from('messages')
            .insert({
                thread_id: thread.id,
                sender_id: currentUserId,
                receiver_id: receiverId,
                content: content
                // status field removed (doesn't exist in schema)
            })
            .select()
            .single()

        if (error) {
            console.error('[sendMessage] Failed to insert message:', error)
        } else if (newMessage) {
            console.log('[sendMessage] Message saved successfully:', newMessage.id)
            setMessages(prev => {
                // Prevent duplicate messages if realtime subscription picked it up already
                if (prev.some(m => m.id === newMessage.id)) return prev
                return [...prev, newMessage]
            })
        }
        setIsSending(false)
    }

    return {
        thread,
        messages,
        setMessages,
        isLoading,
        isSending,
        startThread,
        sendMessage,
        refresh: fetchThread
    }
}
