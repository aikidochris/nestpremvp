'use client'

import { MapProperty } from '@/types/models'
import { motion } from 'framer-motion'
import { ArrowRight, User } from 'lucide-react'

interface NeighborRoutingProps {
    neighbors: MapProperty[]
    onSelect: (neighbor: MapProperty) => void
}

export default function NeighborRouting({ neighbors, onSelect }: NeighborRoutingProps) {
    if (neighbors.length === 0) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800"
        >
            <h4 className="text-xs font-bold uppercase text-slate-500 mb-2 px-1">Ask a Neighbor Instead?</h4>
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                {neighbors.map((neighbor) => {
                    const label = neighbor.display_label || neighbor.house_number || neighbor.street || 'Neighbor'
                    return (
                        <button
                            key={neighbor.id}
                            onClick={() => onSelect(neighbor)}
                            className="shrink-0 group flex flex-col items-center gap-1 w-20 text-center"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-700 shadow-sm group-hover:shadow-md group-hover:border-teal-500 transition-all">
                                {neighbor.image_url ? (
                                    <img src={neighbor.image_url} className="w-full h-full object-cover" alt="Neighbor" />
                                ) : (
                                    <User size={20} className="text-slate-400" />
                                )}
                            </div>
                            <span className="text-[10px] font-medium text-slate-600 dark:text-slate-400 truncate w-full group-hover:text-teal-600">
                                {label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </motion.div>
    )
}
