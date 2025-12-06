'use client'

import React from 'react'

export default function HeatmapLegend() {
    return (
        <div className="absolute bottom-28 right-4 z-[1000] flex flex-col gap-2 rounded-xl bg-white/90 p-3 shadow-lg backdrop-blur-md border border-slate-200/50 min-w-[120px]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Buzz Score
            </div>

            <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#ec4899] shadow-sm ring-1 ring-black/5" />
                <span className="text-xs font-medium text-slate-700">High Demand</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#a855f7] shadow-sm ring-1 ring-black/5" />
                <span className="text-xs font-medium text-slate-700">Rising</span>
            </div>

            <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-[#4f46e5] shadow-sm ring-1 ring-black/5" />
                <span className="text-xs font-medium text-slate-700">Quieter</span>
            </div>
        </div>
    )
}
