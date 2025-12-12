import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Image as ImageIcon, MessageCircle, Paperclip, ChevronLeft } from 'lucide-react'
import { useMessaging } from '@/hooks/useMessaging'
import { usePropertyAlbums } from '@/hooks/usePropertyAlbums'
import { getSupabaseClient } from '@/lib/supabaseClient'
import MessageBubble from './MessageBubble'
import InboxList from './Messaging/InboxList'

interface CardMessagingProps {
    propertyId: string
    ownerId: string
    currentUserId: string
    isSettled?: boolean
}

export default function CardMessaging({ propertyId, ownerId, currentUserId, isSettled }: CardMessagingProps) {
    const isOwner = currentUserId === ownerId

    // Owner Inbox State
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)
    const [inboxThreads, setInboxThreads] = useState<any[]>([])
    const [loadingInbox, setLoadingInbox] = useState(false)

    // Derived Messaging Hook props
    // If Owner: Only fetch messaging if a thread is selected
    // If Buyer: Fetch messaging for current user
    const messagingHookPropId = isOwner ? (selectedThreadId || undefined) : undefined // undefined specificId means default buyer fetch
    const messagingHookUserId = currentUserId // always needed

    // We only call useMessaging if we are ready (Buyer or Owner+Selected)
    // Actually, useMessaging handles "fetching" inside.
    const { thread, messages, setMessages, isLoading, isSending, startThread, sendMessage } = useMessaging(
        propertyId,
        currentUserId,
        isOwner ? selectedThreadId || undefined : undefined
    )

    const { getAlbums } = usePropertyAlbums(propertyId)

    const [inputValue, setInputValue] = useState('')
    const [isExpanded, setIsExpanded] = useState(false)
    const [showAlbumSelector, setShowAlbumSelector] = useState(false)
    const [availableAlbums, setAvailableAlbums] = useState<string[]>([])

    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Fetch Owner Threads (Inbox List) with last message preview
    useEffect(() => {
        if (isOwner && isExpanded && !selectedThreadId) {
            setLoadingInbox(true)
            const supabase = getSupabaseClient()

            // Fetch threads with nested last message
            supabase
                .from('message_threads')
                .select(`
                    *,
                    messages (
                        content,
                        created_at,
                        sender_id
                    )
                `)
                .eq('property_id', propertyId)
                .order('last_message_at', { ascending: false })
                .then(({ data, error }) => {
                    if (error) {
                        console.error('[CardMessaging] Failed to fetch inbox:', error)
                        setLoadingInbox(false)
                        return
                    }

                    // Process to extract last message
                    const threadsWithPreview = (data || []).map((thread: any) => {
                        const messages = (thread.messages || []) as Array<{ content: string, created_at: string, sender_id: string }>
                        // Sort messages by created_at desc to get latest
                        const sortedMsgs = [...messages].sort((a, b) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )
                        const lastMsg = sortedMsgs[0]

                        return {
                            ...thread,
                            last_message: lastMsg?.content || null,
                            messages: undefined // Remove large array
                        }
                    })

                    setInboxThreads(threadsWithPreview)
                    setLoadingInbox(false)
                })
        }
    }, [isOwner, isExpanded, selectedThreadId, propertyId])

    // Load albums if user is owner
    useEffect(() => {
        if (isOwner && isExpanded) {
            getAlbums().then(setAvailableAlbums)
        }
    }, [isOwner, isExpanded, getAlbums])

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (isExpanded && (thread || !isOwner)) {
            // Only auto-scroll if we are in a thread view
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isExpanded, thread, isOwner])

    const handleSend = async () => {
        if (!inputValue.trim()) return

        const content = inputValue
        setInputValue('') // Clear input immediately

        // Optimistic UI: Create temp message and add to state BEFORE API call
        const tempId = 'temp-' + Date.now()
        const tempMsg = {
            id: tempId,
            thread_id: thread?.id || 'temp-thread',
            sender_id: currentUserId,
            content: content,
            created_at: new Date().toISOString(),
            is_read: false,
            status: 'sent' as const
        }

        // Add optimistic message to UI immediately
        setMessages(prev => [...prev, tempMsg as any])

        if (!thread && !isOwner) {
            await startThread(content, ownerId)
        } else {
            await sendMessage(content)
        }
    }

    // ... (handleShareAlbum same as before)
    const handleShareAlbum = async (albumName: string) => {
        const content = JSON.stringify({ type: 'album_share', albumName })
        const supabase = getSupabaseClient()
        let threadId = thread?.id

        if (!threadId) {
            // Owner can't start thread with themselves currently in this flow
            // Assume thread exists if in Owner Mode (selectedThreadId)
            // Safety check
            if (isOwner) return

            // Buyer Start logic
            const newThread = await startThread(content, ownerId)
            if (!newThread) return
            threadId = newThread.id
        }

        // Insert Share Record
        const { error } = await supabase.from('album_shares').insert({
            thread_id: threadId,
            album_type: albumName,
        })

        if (error) {
            console.error('Share failed', error)
            alert('Failed to share album')
            return
        }

        if (thread) {
            await sendMessage(content)
        }

        setShowAlbumSelector(false)
    }

    // Handle Reply to Note (Convert note to chat thread)
    const handleReplyToNote = async (note: { id: string; sender_user_id: string; message: string; created_at: string }) => {
        const supabase = getSupabaseClient()

        // Step 1: Create a new thread with the note sender as buyer
        const { data: newThread, error: threadError } = await supabase
            .from('message_threads')
            .insert({
                property_id: propertyId,
                owner_id: currentUserId, // Current user is owner
                buyer_id: note.sender_user_id,
                state: 'talking'
            })
            .select()
            .single()

        if (threadError || !newThread) {
            console.error('[handleReplyToNote] Failed to create thread:', threadError)
            alert('Failed to start conversation')
            return
        }

        // Step 2: Send auto-reply message  
        const { error: msgError } = await supabase
            .from('messages')
            .insert({
                thread_id: newThread.id,
                sender_id: currentUserId,
                content: 'Thanks for your note! I saw your message and wanted to connect.',
                status: 'sent'
            })

        if (msgError) {
            console.error('[handleReplyToNote] Failed to send message:', msgError)
        }

        // Step 3: Mark note as revealed
        const { error: noteError } = await supabase
            .from('unclaimed_notes')
            .update({ is_revealed: true, status: 'revealed' })
            .eq('id', note.id)

        if (noteError) {
            console.error('[handleReplyToNote] Failed to update note:', noteError)
        }

        // Step 4: Optimistically add new thread to inbox
        setInboxThreads(prev => [{
            ...newThread,
            last_message: 'Thanks for your note! I saw your message and wanted to connect.',
            last_message_at: new Date().toISOString()
        }, ...prev])

        // Open the new thread immediately
        setSelectedThreadId(newThread.id)
    }

    if (isLoading && !isOwner) {
        return <div className="p-4 text-center text-xs text-slate-400">Loading chat...</div>
    }

    // Settled View (Global Check)
    if (isSettled) {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-sm italic text-slate-400">This home is settled and not accepting messages.</p>
            </div>
        )
    }

    // Default Collapsed View (Call to Action)
    if (!isExpanded && !thread && !isOwner) {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                    <MessageCircle size={18} />
                    Message Owner
                </button>
            </div>
        )
    }

    // Owner Button (Simplified)
    if (!isExpanded && isOwner) {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full py-3 bg-indigo-500 text-white rounded-xl shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                    <MessageCircle size={18} />
                    View Inbox
                </button>
            </div>
        )
    }

    // Expanded View
    return (
        <div className="flex flex-col h-[400px] border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                <div className="flex items-center gap-2">
                    {/* Back Button for Owner Inbox */}
                    {isOwner && selectedThreadId && (
                        <button onClick={() => setSelectedThreadId(null)} className="p-1 hover:bg-slate-100 rounded-full">
                            <ChevronLeft size={16} className="text-slate-500" />
                        </button>
                    )}
                    <span className="text-xs font-bold uppercase text-slate-500">
                        {isOwner
                            ? (selectedThreadId ? 'Chat' : 'Owner Inbox')
                            : (thread ? 'Conversation' : 'Start a Conversation')
                        }
                    </span>
                </div>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2"
                >
                    Close
                </button>
            </div>

            {/* OWNER INBOX LIST */}
            {isOwner && !selectedThreadId ? (
                <InboxList
                    threads={inboxThreads.map(t => ({
                        id: t.id,
                        buyer_id: t.buyer_id || '',
                        buyer_name: t.buyer_name,
                        last_message: t.last_message,
                        last_message_at: t.last_message_at,
                        unread_count: t.unread_count
                    }))}
                    isLoading={loadingInbox}
                    onSelectThread={setSelectedThreadId}
                />
            ) : (
                /* CHAT VIEW (Buyer or Owner Specific Thread) */
                <>
                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <MessageCircle size={32} className="mb-2" />
                                <p className="text-sm">Say hello!</p>
                            </div>
                        ) : (
                            messages.map((msg) => {
                                const isMe = msg.sender_id === currentUserId
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <MessageBubble
                                            message={msg}
                                            isMe={isMe}
                                            propertyId={propertyId}
                                        />
                                    </div>
                                )
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative">
                        {/* Album Popover code remains same */}
                        <AnimatePresence>
                            {showAlbumSelector && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-full left-3 mb-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-20"
                                >
                                    <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                                        <span className="text-xs font-bold text-slate-500">Share Album</span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        {availableAlbums.length === 0 ? (
                                            <div className="p-3 text-xs text-slate-400 text-center">No private albums found.</div>
                                        ) : (
                                            availableAlbums.map(album => (
                                                <button
                                                    key={album}
                                                    onClick={() => handleShareAlbum(album)}
                                                    className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"
                                                >
                                                    <ImageIcon size={14} />
                                                    {album}
                                                </button>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex gap-2">
                            {/* Share Button (Owners Only) */}
                            {isOwner && (
                                <button
                                    onClick={() => setShowAlbumSelector(!showAlbumSelector)}
                                    className={`p-2 rounded-xl transition-colors ${showAlbumSelector ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
                                    title="Share Album"
                                >
                                    <Paperclip size={18} />
                                </button>
                            )}

                            <input
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            />
                            <button
                                disabled={isSending || !inputValue.trim()}
                                onClick={handleSend}
                                className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl disabled:opacity-50 hover:bg-slate-800 dark:hover:bg-slate-200 transition"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
