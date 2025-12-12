'use client'

import { MessageCircle } from 'lucide-react'

interface Thread {
    id: string
    buyer_id: string
    buyer_name?: string
    last_message?: string
    last_message_at: string
    unread_count?: number
}

interface Note {
    id: string
    sender_id: string
    sender_name?: string
    content: string
    created_at: string
}

interface InboxListProps {
    threads: Thread[]
    notes?: Note[]
    isLoading?: boolean
    onSelectThread: (threadId: string) => void
}

// Helper to format relative time
function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
}

// Helper to get initials from name or ID
function getInitials(name?: string, id?: string): string {
    if (name) {
        const parts = name.split(' ')
        return parts.map(p => p[0]).join('').toUpperCase().slice(0, 2)
    }
    if (id) {
        return id.slice(0, 2).toUpperCase()
    }
    return '??'
}

export default function InboxList({ threads, notes = [], isLoading, onSelectThread }: InboxListProps) {
    const isEmpty = threads.length === 0 && notes.length === 0

    if (isLoading) {
        return (
            <div className="p-8 text-center">
                <div className="animate-pulse flex flex-col items-center gap-2">
                    <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
            </div>
        )
    }

    if (isEmpty) {
        return (
            <div className="p-8 text-center">
                <div className="mx-auto w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <MessageCircle className="text-slate-400" size={24} />
                </div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
                    No messages yet
                </p>
                <p className="text-xs text-slate-400">
                    Set status to &ldquo;Open to Chat&rdquo; to encourage questions.
                </p>
            </div>
        )
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Threads List */}
            {threads.map((thread) => (
                <button
                    key={thread.id}
                    onClick={() => onSelectThread(thread.id)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 text-left"
                >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {getInitials(thread.buyer_name, thread.buyer_id)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
                                {thread.buyer_name || `User ${thread.buyer_id.slice(0, 6)}`}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                                {formatTimeAgo(thread.last_message_at)}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                            {thread.last_message || 'No messages yet'}
                        </p>
                    </div>

                    {/* Unread Badge */}
                    {thread.unread_count && thread.unread_count > 0 && (
                        <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-white">
                                {thread.unread_count > 9 ? '9+' : thread.unread_count}
                            </span>
                        </div>
                    )}
                </button>
            ))}

            {/* Notes Section (if any) */}
            {notes.length > 0 && (
                <>
                    <div className="px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
                        <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                            Pending Notes ({notes.length})
                        </span>
                    </div>
                    {notes.map((note) => (
                        <div
                            key={note.id}
                            className="p-3 flex items-start gap-3 bg-amber-50/50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20"
                        >
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-300 font-bold text-sm shrink-0">
                                {getInitials(note.sender_name, note.sender_id)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                        {note.sender_name || 'Anonymous'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 shrink-0">
                                        {formatTimeAgo(note.created_at)}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                    {note.content}
                                </p>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    )
}
