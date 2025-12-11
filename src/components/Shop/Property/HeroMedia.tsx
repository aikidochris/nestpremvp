'use client'

import { MapPin, Camera } from 'lucide-react'

interface HeroMediaProps {
    imageUrl?: string | null
    isUnclaimed?: boolean
    onAddPhoto?: () => void
}

export default function HeroMedia({ imageUrl, isUnclaimed, onAddPhoto }: HeroMediaProps) {
    if (isUnclaimed) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-800 relative overflow-hidden group">
                <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center grayscale" />
                <div className="z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-full border border-white/50 shadow-sm flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Ghost Mode</span>
                </div>
            </div>
        )
    }

    if (!imageUrl) {
        return (
            <div
                onClick={onAddPhoto}
                className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 cursor-pointer group"
            >
                <Camera size={24} className="text-slate-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-semibold text-slate-500">No photos yet</span>
            </div>
        )
    }

    return (
        <div className="w-full h-full relative">
            <img
                src={imageUrl}
                alt="Property"
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </div>
    )
}
