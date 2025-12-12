'use client'

import { MapPin } from 'lucide-react'

interface Badge {
    label: string
    color: string
    textColor: string
}

interface CardHeaderProps {
    title: string
    subtitle?: string
    badges?: Badge[]
    statusBadge?: Badge | null // Deprecated but kept for backward compatibility if needed temporarily
}

export default function CardHeader({ title, subtitle, badges, statusBadge }: CardHeaderProps) {
    // Merge new 'badges' prop with old 'statusBadge' if provided
    const allBadges = badges || (statusBadge ? [statusBadge] : [])

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {title}
                </h3>
                <div className="flex flex-wrap gap-1 justify-end">
                    {allBadges.map((badge, idx) => (
                        <span key={idx} className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${badge.color} ${badge.textColor}`}>
                            {badge.label}
                        </span>
                    ))}
                </div>
            </div>
            {subtitle && (
                <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                    <MapPin size={12} />
                    <span>{subtitle}</span>
                </div>
            )}
        </div>
    )
}
