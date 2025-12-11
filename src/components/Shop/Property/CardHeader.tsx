'use client'

import { MapPin } from 'lucide-react'

interface CardHeaderProps {
    title: string
    subtitle?: string
    statusBadge?: {
        label: string
        color: string
        textColor: string
    } | null
}

export default function CardHeader({ title, subtitle, statusBadge }: CardHeaderProps) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 leading-tight">
                    {title}
                </h3>
                {statusBadge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0 ${statusBadge.color} ${statusBadge.textColor}`}>
                        {statusBadge.label}
                    </span>
                )}
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
