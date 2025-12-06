import { useActivityFeed, FeedItem } from "@/hooks/useActivityFeed"
import { Home, RefreshCw, BookOpen, X, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ActivityFeedDrawerProps {
    userId?: string | null
    isOpen: boolean
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

export default function ActivityFeedDrawer({ userId, isOpen, onClose }: ActivityFeedDrawerProps) {
    const { feedItems, isLoading, error } = useActivityFeed(userId)
    const router = useRouter()

    if (!isOpen) return null

    const getIcon = (type: FeedItem['type']) => {
        switch (type) {
            case 'STATUS':
                return <RefreshCw className="h-4 w-4 text-secondary" />
            case 'CLAIM':
                return <Home className="h-4 w-4 text-primary" />
            case 'STORY':
                return <BookOpen className="h-4 w-4 text-purple-500" />
            default:
                return <Home className="h-4 w-4 text-gray-500" />
        }
    }

    const handleItemClick = (item: FeedItem) => {
        // Navigate to property using deep link param which HomeClient seems to handle
        const url = new URL(window.location.href)
        url.searchParams.set('propertyId', item.property_id)
        window.history.pushState(null, '', url.toString())
        // We rely on HomeClient's existing effect to catch this param or we can force reload/dispatch event
        // The existing code in HomeClient listens to searchParams change via next/navigation? 
        // Actually HomeClient uses useSearchParams. Next.js App Router useSearchParams might not update on pushState instantly without router.push/replace
        // So better use router.push
        router.push(`/?propertyId=${item.property_id}`)
        onClose()
    }

    return (
        <div
            className={`
        fixed inset-x-0 bottom-0 top-auto z-[60] h-[50vh] w-full transform overflow-hidden rounded-t-2xl border-t border-white/20 bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-in-out
        md:inset-y-0 md:left-0 md:right-auto md:h-full md:w-96 md:rounded-none md:border-r
        ${isOpen ? "translate-y-0 md:translate-x-0" : "translate-y-full md:-translate-x-full"}
      `}
        >
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div>
                    <h2 className="text-lg font-bold text-brand-dark">Activity Feed</h2>
                    <p className="text-xs text-slate-500">Recent updates in your network</p>
                </div>
                <button
                    onClick={onClose}
                    className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            <div className="h-[calc(100%-4rem)] overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center pt-10 text-center">
                        <p className="text-sm text-red-500">Unable to load activity.</p>
                        <p className="text-xs text-slate-400 mt-1">{error}</p>
                    </div>
                ) : feedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center pt-20 text-center">
                        <div className="mb-4 rounded-full bg-slate-50 p-4">
                            <RefreshCw className="h-8 w-8 text-slate-300" />
                        </div>
                        <p className="text-base font-medium text-slate-600">No recent activity</p>
                        <p className="text-sm text-slate-400 mt-1">Updates from followed homes will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {feedItems.map((item) => (
                            <div
                                key={item.event_id}
                                onClick={() => handleItemClick(item)}
                                className="group relative cursor-pointer rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md hover:border-primary/20"
                            >
                                <div className="flex items-start gap-4">
                                    <div className={`mt-1 rounded-full p-2 ${item.type === 'STATUS' ? 'bg-orange-50' :
                                            item.type === 'CLAIM' ? 'bg-teal-50' : 'bg-purple-50'
                                        }`}>
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${item.type === 'STATUS' ? 'text-secondary' :
                                                    item.type === 'CLAIM' ? 'text-primary' : 'text-purple-600'
                                                }`}>
                                                {item.type}
                                            </span>
                                            <span className="text-xs text-slate-400 whitespace-nowrap">
                                                {timeAgo(item.created_at)}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-800 leading-snug">
                                            {item.summary_text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
