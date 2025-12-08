'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, History, Home, Zap, TrendingUp } from 'lucide-react'

interface PropertyInsightsProps {
    property: {
        last_sale_price?: number | null
        last_sale_date?: string | null
        energy_rating?: string | null
        epc_floor_area?: number | null
        epc_property_type?: string | null
        [key: string]: any
    }
}

export default function PropertyInsights({ property }: PropertyInsightsProps) {
    const [isOpen, setIsOpen] = useState(false)

    if (!property) return null

    const fmtPrice = (p: number) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p)

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

    return (
        <div className="mt-4 mb-4 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
                        <TrendingUp size={20} />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Property History</h3>
                        <p className="text-xs text-slate-500">
                            {property.last_sale_price
                                ? `Last sold for ${fmtPrice(property.last_sale_price)}`
                                : 'View market history'}
                        </p>
                    </div>
                </div>
                {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </button>

            {isOpen && (
                <div className="p-5 grid grid-cols-1 gap-6 animate-in slide-in-from-top-2 duration-200 border-t border-slate-100">
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                            <History size={14} /> Transaction History
                        </h4>
                        <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-2 pl-6 py-1 space-y-4">
                            <div className="relative">
                                <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-teal-500 ring-4 ring-white dark:ring-slate-900" />
                                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">Nest Market Value</p>
                                <p className="text-xs text-slate-500">Tracking live interest</p>
                            </div>
                            <div className="relative">
                                <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
                                {property.last_sale_price ? (
                                    <>
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{fmtPrice(property.last_sale_price)}</p>
                                        <p className="text-xs text-slate-500">Sold on {fmtDate(property.last_sale_date!)}</p>
                                    </>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">No previous sales recorded</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                            <Home size={14} /> Details
                        </h4>
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Type</span>
                                <span className="font-medium text-slate-900 capitalize">{property.epc_property_type || 'Unknown'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Size</span>
                                <span className="font-medium text-slate-900">{property.epc_floor_area ? `${property.epc_floor_area} sq m` : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                                <span className="text-slate-500 flex items-center gap-1"><Zap size={12} /> Energy</span>
                                {property.energy_rating ? (
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${['A', 'B', 'C'].includes(property.energy_rating) ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                                        {property.energy_rating}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 text-xs">N/A</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}