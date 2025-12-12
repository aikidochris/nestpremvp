'use client'

import { motion } from 'framer-motion'
import { ChevronRight, Heart } from 'lucide-react'
import type { MapProperty } from '@/types/models'
import CardHeader from './CardHeader'

interface SmallCardProps {
    property: MapProperty
    onExpand: () => void
    onClose: () => void
}

export default function SmallCard({ property, onExpand, onClose }: SmallCardProps) {
    // Determine Badge
    const getBadge = () => {
        if (property.is_for_sale) return { label: 'For Sale', color: 'bg-[#E65F52]', textColor: 'text-white' }
        if (property.is_for_rent) return { label: 'For Rent', color: 'bg-indigo-500', textColor: 'text-white' }
        if (property.is_open_to_talking) return { label: 'Open to Chat', color: 'bg-teal-500', textColor: 'text-white' }
        if (!property.claimed_by_user_id) return { label: 'Unclaimed', color: 'bg-slate-200 dark:bg-slate-700', textColor: 'text-slate-500 dark:text-slate-300' }
        if (property.is_claimed) return { label: 'Owner Active', color: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-600 dark:text-slate-400' }
        return { label: 'Settled', color: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-400' }
    }

    const badge = getBadge()
    const title = property.display_label || `${property.house_number || ''} ${property.street || ''}`.trim() || 'Home'

    // Context: Show "Neighborhood Vibe" if no better context
    const context = property.postcode ? `${property.postcode} • Neighborhood Vibe` : 'Neighborhood Vibe'

    // Heart Count Placeholder
    const heartCount = 0 // Placeholder logic for now

    return (
        <motion.div
            key={property.id} // Ensure re-render on prop switch
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[1050] p-4 pointer-events-none flex justify-center"
        >
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-4 pointer-events-auto relative">
                {/* Close Handle / Button */}
                <div className="absolute -top-12 right-0 p-2">
                    <button
                        onClick={onClose}
                        className="bg-black/50 hover:bg-black/60 text-white rounded-full p-2 backdrop-blur-md transition-colors"
                    >
                        <ChevronRight size={20} className="rotate-90" />
                    </button>
                </div>

                <div className="flex gap-4">
                    {/* Mini Thumb */}
                    <div className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0 overflow-hidden relative group">
                        {(property.image_url || property.market_image_url) ? (
                            <img src={property.image_url || property.market_image_url || ''} className="w-full h-full object-cover" alt="Home" />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-300">
                                <span className="text-xs font-bold uppercase tracking-widest">Map</span>
                            </div>
                        )}
                        {/* Static Heart Overlay */}
                        {heartCount > 0 && (
                            <div className="absolute bottom-1 right-1 bg-black/40 backdrop-blur rounded-full px-1.5 py-0.5 flex items-center gap-1">
                                <Heart size={8} className="text-white fill-white" />
                                <span className="text-[10px] text-white font-medium">{heartCount}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <CardHeader title={title} subtitle={context} statusBadge={badge} />

                        <button
                            onClick={onExpand}
                            className="mt-2 w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
                        >
                            View Home <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
