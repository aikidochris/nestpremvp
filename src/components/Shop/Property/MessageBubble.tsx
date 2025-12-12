'use client'

import { useState, useEffect } from 'react'
import { usePropertyAlbums } from '@/hooks/usePropertyAlbums'
import { Image as ImageIcon } from 'lucide-react'

interface MessageBubbleProps {
    message: { content: string }
    isMe: boolean
    propertyId: string
}

export default function MessageBubble({ message, isMe, propertyId }: MessageBubbleProps) {
    const { getViewSharedAlbum } = usePropertyAlbums(propertyId)
    const [albumImages, setAlbumImages] = useState<string[]>([])
    const [loading, setLoading] = useState(false)
    
    // Derive state synchronously
    let isAlbumShare = false
    let albumName = ''
    try {
        const json = JSON.parse(message.content)
        if (json.type === 'album_share') {
            isAlbumShare = true
            albumName = json.albumName
        }
    } catch {
        // plain text
    }

    useEffect(() => {
        if (isAlbumShare) {
            setLoading(true)
            getViewSharedAlbum(albumName)
                .then(urls => setAlbumImages(urls))
                .catch(console.error)
                .finally(() => setLoading(false))
        }
    }, [isAlbumShare, albumName, getViewSharedAlbum])

    if (isAlbumShare) {
        return (
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${isMe
                    ? 'bg-slate-900 text-white rounded-br-none'
                    : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                }`}>
                <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                    <ImageIcon size={14} className="opacity-70" />
                    <span className="font-bold">Shared Album: {albumName}</span>
                </div>
                
                {loading ? (
                    <div className="grid grid-cols-2 gap-2 animate-pulse">
                        <div className="h-24 bg-slate-400/20 rounded-lg"></div>
                        <div className="h-24 bg-slate-400/20 rounded-lg"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {albumImages.length > 0 ? (
                            albumImages.slice(0, 4).map((url, i) => (
                                <div key={i} className="aspect-square relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
                                    <img src={url} alt="Shared" className="w-full h-full object-cover" />
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 text-xs opacity-70 italic py-2">
                                No photos in this album or access expired.
                            </div>
                        )}
                        {albumImages.length > 4 && (
                            <div className="col-span-2 text-center text-xs opacity-70 mt-1">
                                +{albumImages.length - 4} more photos
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe
                ? 'bg-slate-900 text-white rounded-br-none'
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
            }`}>
            {message.content}
        </div>
    )
}
