import { useState, useRef, useEffect } from "react"
import { Bell } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import NotificationList from "./NotificationList"

interface NotificationBellProps {
    userId?: string | null
}

export default function NotificationBell({ userId }: NotificationBellProps) {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId)
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    if (!userId) return null

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-all duration-300 ${isOpen
                        ? 'bg-teal-50 text-primary shadow-inner'
                        : 'bg-white/80 backdrop-blur-md text-slate-600 shadow-md hover:bg-white hover:text-primary'
                    } ring-1 ring-gray-100 border border-gray-100`}
                aria-label="Notifications"
            >
                <Bell className={`h-5 w-5 transition-transform duration-300 ${isOpen ? 'rotate-12' : ''}`} />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-secondary ring-2 ring-white animate-pulse" />
                )}
            </button>

            {/* Dropdown for Desktop */}
            {isOpen && (
                <div className="hidden sm:block absolute right-0 mt-3 w-80 lg:w-96 origin-top-right z-50 animate-in fade-in zoom-in-95 duration-200">
                    <NotificationList
                        notifications={notifications}
                        onMarkRead={markAsRead}
                        onMarkAllRead={markAllAsRead}
                        onClose={() => setIsOpen(false)}
                    />
                </div>
            )}

            {/* Fullscreen/Modal for Mobile */}
            {isOpen && (
                <div className="sm:hidden fixed inset-0 z-[999] bg-slate-900/20 backdrop-blur-sm animate-in fade-in">
                    <div className="absolute inset-x-0 top-0 bottom-auto p-4 animate-in slide-in-from-top-10">
                        <NotificationList
                            notifications={notifications}
                            onMarkRead={markAsRead}
                            onMarkAllRead={markAllAsRead}
                            onClose={() => setIsOpen(false)}
                        />
                    </div>
                    {/* Click overlay to close */}
                    <div className="absolute inset-0 -z-10" onClick={() => setIsOpen(false)} />
                </div>
            )}
        </div>
    )
}
