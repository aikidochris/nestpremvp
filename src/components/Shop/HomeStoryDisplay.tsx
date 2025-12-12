'use client'

import { Edit2, Building2, BedDouble } from 'lucide-react'

interface HomeStoryDisplayProps {
    story: string | null
    bedroomCount: number | null
    homeType: string | null
    onEdit: () => void
}

export default function HomeStoryDisplay({
    story,
    bedroomCount,
    homeType,
    onEdit
}: HomeStoryDisplayProps) {
    return (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-white/60 shadow-sm p-5 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    About this home
                </h3>
                <button
                    onClick={onEdit}
                    className="text-xs font-semibold text-slate-500 hover:text-amber-600 flex items-center gap-1 transition-colors"
                >
                    <Edit2 className="w-3 h-3" />
                    Edit
                </button>
            </div>

            {/* Story Content */}
            <div className="prose prose-sm max-w-none">
                {story ? (
                    <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-amber-200 pl-3">
                        &quot;{story}&quot;
                    </p>
                ) : (
                    <p className="text-sm text-slate-400 italic">
                        No story added yet.
                    </p>
                )}
            </div>

            {/* Facts Grid */}
            <div className="flex gap-2 pt-2">
                {/* Bedrooms */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-slate-200 rounded-lg shadow-sm">
                    <BedDouble className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">
                        {bedroomCount ? `${bedroomCount} Beds` : '-'}
                    </span>
                </div>

                {/* Type */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/60 border border-slate-200 rounded-lg shadow-sm">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">
                        {homeType || '-'}
                    </span>
                </div>
            </div>
        </div>
    )
}
