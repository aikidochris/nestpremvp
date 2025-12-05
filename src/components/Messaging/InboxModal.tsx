import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { X, Send, MessageSquareDashed } from 'lucide-react'
import type { Thread } from '@/hooks/useInbox'

type PartnerProfiles = Record<
  string,
  { user_id: string; display_name: string | null; avatar_url: string | null }
>

interface InboxModalProps {
  open: boolean
  onClose: () => void
  threads: Thread[]
  loading: boolean
  currentUserId: string | null
  onSend: (propertyId: string, body: string, receiverId?: string | null, status?: string) => Promise<any>
  onMarkRead?: (propertyId: string, partnerId: string | null) => void
  partnerProfiles?: PartnerProfiles
}

const getInitials = (name: string) => (name?.[0]?.toUpperCase() ?? '?')

const getPartnerNameForThread = (
  thread: Thread,
  partnerProfiles?: PartnerProfiles,
  currentUserId?: string | null
) => {
  if (!thread.partnerId) {
    const fromMe = thread.latestMessage?.sender_id === currentUserId
    return fromMe ? 'Future Owner' : 'Interested Buyer'
  }
  const profile = partnerProfiles?.[thread.partnerId]
  if (profile?.display_name) return profile.display_name
  return 'Verified User'
}

const formatTime = (iso?: string) => {
  if (!iso) return ''
  const date = new Date(iso)
  return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function InboxModal({
  open,
  onClose,
  threads,
  loading,
  currentUserId,
  onSend,
  onMarkRead,
  partnerProfiles,
}: InboxModalProps) {
  const [activeThreadKey, setActiveThreadKey] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const chatRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) {
      setActiveThreadKey(null)
      return
    }
    if (!activeThreadKey && threads.length) {
      setActiveThreadKey(threads[0].threadKey)
    }
  }, [open, threads, activeThreadKey])

  const activeThread = useMemo(
    () => threads.find((t) => t.threadKey === activeThreadKey) || null,
    [threads, activeThreadKey]
  )

  useEffect(() => {
    if (activeThread && onMarkRead) {
      onMarkRead(activeThread.propertyId, activeThread.partnerId)
    }
  }, [activeThread, onMarkRead])

  useEffect(() => {
    if (!chatRef.current) return
    chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [activeThread?.messages])

  const handleSend = async () => {
    if (!activeThread || !messageText.trim()) return
    const targetUserId = activeThread.partnerId || activeThread.messages[0]?.sender_id || null

    if (!targetUserId) {
      console.error('Cannot reply: No target user found')
      return
    }

    try {
      await onSend(activeThread.propertyId, messageText, targetUserId)
      setMessageText('')
    } catch (err) {
      console.error('Send error', err)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl ring-1 ring-slate-100 flex overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-1/3 border-r border-slate-100 bg-white flex flex-col">
          <div className="p-5 border-b border-slate-100">
            <h2 className="text-xl font-semibold text-slate-900">Inbox</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading && <div className="p-4 text-sm text-slate-500">Loading conversations...</div>}
            {!loading && threads.length === 0 && (
              <div className="p-4 text-sm text-slate-500">No conversations yet.</div>
            )}
            {threads.map((thread) => {
              const partnerName = getPartnerNameForThread(thread, partnerProfiles, currentUserId)
              const isActive = thread.threadKey === activeThreadKey
              const showPending = thread.latestMessage.status === 'pending_request'
              const timeLabel = formatTime(thread.latestMessage.created_at)
              return (
                <button
                  key={thread.threadKey}
                  className={clsx(
                    'w-full text-left p-4 border-l-4 border-transparent hover:bg-slate-50 transition-colors',
                    isActive && 'bg-teal-50/50 border-l-[#007C7C]'
                  )}
                  onClick={() => {
                    setActiveThreadKey(thread.threadKey)
                    if (onMarkRead) onMarkRead(thread.propertyId, thread.partnerId)
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold">
                      {getInitials(partnerName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900 truncate">{thread.propertyLabel}</p>
                        <span className="text-xs text-slate-400 whitespace-nowrap">{timeLabel}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-sm text-slate-600 truncate">{partnerName}</p>
                        {showPending && (
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[11px] font-semibold">
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500 truncate">
                        {thread.latestMessage.content || 'No message content'}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="w-2/3 bg-slate-50 flex flex-col relative">
          <div className="bg-white p-4 border-b border-slate-100 shadow-sm flex items-center justify-between">
            {activeThread ? (
              <div>
                <p className="text-lg font-semibold text-slate-900">{activeThread.propertyLabel}</p>
                <p className="text-sm text-slate-500">
                  Conversation with {getPartnerNameForThread(activeThread, partnerProfiles, currentUserId)}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-lg font-semibold text-slate-900">Inbox</p>
                <p className="text-sm text-slate-500">Select a conversation to start talking.</p>
              </div>
            )}
            <button
              type="button"
              aria-label="Close inbox"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {activeThread ? (
            <>
              <div ref={chatRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeThread.messages
                  .filter((m) => m.content)
                  .map((message) => {
                    const isMe = message.sender_id === currentUserId
                    return (
                      <div key={message.id} className={clsx('flex', isMe ? 'justify-end' : 'justify-start')}>
                        <div
                          className={clsx(
                            'max-w-[80%] px-5 py-3 rounded-2xl shadow-sm text-sm',
                            isMe
                              ? 'bg-[#007C7C] text-white rounded-tr-sm'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm'
                          )}
                        >
                          <p>{message.content}</p>
                          <p className={clsx('mt-1 text-[10px]', isMe ? 'text-white/80' : 'text-slate-500')}>
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
              </div>

              <div className="bg-white border-t border-slate-100 p-4">
                <div className="relative">
                  <textarea
                    className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-full px-5 py-3 pr-16 text-sm text-slate-800 focus:ring-2 focus:ring-[#007C7C] focus:bg-white transition-all"
                    placeholder="Type a message..."
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className="absolute right-6 top-1/2 -translate-y-1/2 bg-[#007C7C] p-2 rounded-full text-white hover:bg-[#006868] transition-colors disabled:opacity-60"
                    disabled={!messageText.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-3">
              <div className="h-12 w-12 rounded-full bg-white shadow flex items-center justify-center">
                <MessageSquareDashed className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">Select a conversation to start talking.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
