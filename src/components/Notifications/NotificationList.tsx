import type { Notification } from "@/hooks/useNotifications"
import { Check, Info, Home, RefreshCw, BookOpen, X } from "lucide-react"
import { useCallback } from "react"

interface NotificationListProps {
    notifications: Notification[]
    onMarkRead: (id: string) => void
    onMarkAllRead: () => void
    onClose: () => void
}

function timeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return "Just now"
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
}

export default function NotificationList({
    notifications,
    onMarkRead,
    onMarkAllRead,
    onClose,
}: NotificationListProps) {

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'status_change':
                return <RefreshCw className="h-4 w-4 text-secondary" />
            case 'claim':
                return <Home className="h-4 w-4 text-primary" />
            case 'story':
                return <BookOpen className="h-4 w-4 text-purple-500" />
            case 'system':
            default:
                return <Info className="h-4 w-4 text-gray-500" />
        }
    }

    const handleItemClick = (n: Notification) => {
        if (!n.is_read) {
            onMarkRead(n.id)
        }
        // Future: Navigate to resource_id
    }

    return (
        <div className="flex flex-col w-full h-full max-h-[80vh] sm:max-h-[500px] bg-white/90 backdrop-blur-xl sm:rounded-2xl shadow-2xl ring-1 ring-slate-200/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white/50">
                <h3 className="font-bold text-brand-dark text-sm tracking-tight">
                    Notifications
                </h3>
                <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                        <button
                            onClick={onMarkAllRead}
                            className="text-xs font-medium text-slate-500 hover:text-primary transition-colors"
                        >
                            Mark all read
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="sm:hidden p-1 rounded-full hover:bg-slate-100 text-slate-500"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-slate-400 px-6 text-center">
                        <div className="rounded-full bg-slate-50 p-3 mb-3">
                            <BellOffIcon className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-sm">You're all caught up!</p>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {notifications.map((n) => (
                            <li
                                key={n.id}
                                onClick={() => handleItemClick(n)}
                                className={`relative group flex gap-3 p-4 hover:bg-teal-50/50 transition-colors cursor-pointer ${!n.is_read ? "bg-blue-50/30" : ""
                                    }`}
                            >
                                <div className="flex-shrink-0 mt-1">
                                    <div className={`p-2 rounded-full ${!n.is_read ? 'bg-white shadow-sm ring-1 ring-slate-100' : 'bg-slate-100'}`}>
                                        {getIcon(n.type)}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm ${!n.is_read ? 'font-semibold text-brand-dark' : 'text-slate-600'}`}>
                                            {n.title}
                                        </p>
                                        <span className="text-[10px] text-slate-400 whitespace-nowrap flex-shrink-0">
                                            {timeAgo(n.created_at)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                                        {n.message}
                                    </p>
                                </div>
                                {!n.is_read && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onMarkRead(n.id)
                                            }}
                                            className="p-1 rounded-full hover:bg-slate-200 text-slate-400 hover:text-primary"
                                            title="Mark as read"
                                        >
                                            <Check className="h-3 w-3" />
                                        </button>
                                    </div>
                                )}
                                {!n.is_read && (
                                    <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-secondary rounded-r-full" />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

function BellOffIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5" />
            <path d="M17 17H3s3-2 3-9" />
            <path d="M10.3 21a1.95 1.95 0 0 0 3.4 0" />
            <path d="m2 2 20 20" />
        </svg>
    )
}
