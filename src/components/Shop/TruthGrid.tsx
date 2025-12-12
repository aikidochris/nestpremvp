'use client'

import { Calendar, PoundSterling, Home, BedDouble } from 'lucide-react'

interface TruthGridProps {
    lastSaleDate?: string | null
    lastSalePrice?: number | null
    propertyType?: string | null
    bedroomCount?: number | null
}

// Format date as "Nov 2021"
function formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A'
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
    } catch {
        return 'N/A'
    }
}

// Format price as "£285k" or "£1.2m"
function formatPrice(price: number | null | undefined): string {
    if (!price) return 'N/A'
    if (price >= 1_000_000) {
        return `£${(price / 1_000_000).toFixed(1)}m`
    }
    return `£${Math.round(price / 1000)}k`
}

export default function TruthGrid({ lastSaleDate, lastSalePrice, propertyType, bedroomCount }: TruthGridProps) {
    const items = [
        {
            icon: <Calendar size={16} className="text-slate-400" />,
            label: 'Last Sold',
            value: formatDate(lastSaleDate),
        },
        {
            icon: <PoundSterling size={16} className="text-slate-400" />,
            label: 'Sold Price',
            value: formatPrice(lastSalePrice),
        },
        {
            icon: <Home size={16} className="text-slate-400" />,
            label: 'Type',
            value: propertyType || 'N/A',
        },
        {
            icon: <BedDouble size={16} className="text-slate-400" />,
            label: 'Bedrooms',
            value: bedroomCount ? `${bedroomCount}` : 'N/A',
        },
    ]

    const visibleItems = items.filter(item => item.value !== 'N/A')

    if (visibleItems.length === 0) return null

    return (
        <div className="grid grid-cols-2 gap-3">
            {visibleItems.map((item) => (
                <div
                    key={item.label}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/50"
                >
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-700 shadow-sm">
                        {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.label}</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate capitalize">
                            {item.value}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    )
}
