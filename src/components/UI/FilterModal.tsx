'use client'

import React from 'react'
import { X, Check } from 'lucide-react'

export interface FilterState {
    showAll: boolean
    openToTalking: boolean
    forSale: boolean
    forRent: boolean
    claimed: boolean
}

interface FilterModalProps {
    isOpen: boolean
    onClose: () => void
    filters: FilterState
    onFilterChange: (filters: FilterState) => void
}

export default function FilterModal({ isOpen, onClose, filters, onFilterChange }: FilterModalProps) {
    if (!isOpen) return null

    const toggle = (key: keyof FilterState) => {
        // If toggling 'showAll', reset others or strictly handle mutual exclusion if desired.
        // Simplified logic: Just toggle. If 'showAll' is clicked, maybe turn others off? 
        // Let's keep it simple: independent toggles, but 'showAll' usually implies clearing specific filters.
        // User Requirement: "Open to Talking", "For Sale", "For Rent", "Claimed". 
        // Usually 'Show All' is the absence of specific filters or a reset.
        // Let's implement independent logic. If 'showAll' is true, others might be ignored in query logic.

        // Actually, looking at HomeClient, we usually have `activeFilter`.
        // The previous `activeFilter` was 'all' | 'open' | 'claimed'.
        // The new requirement implies multiple boolean flags might be active?
        // "toggles: Open to Talking, For Sale, For Rent, Claimed". 
        // Let's assume we want to support multiple selections.

        const newFilters = { ...filters, [key]: !filters[key] }

        // Logic: If 'showAll' is turned ON, turn others OFF?
        if (key === 'showAll' && newFilters.showAll) {
            newFilters.openToTalking = false
            newFilters.forSale = false
            newFilters.forRent = false
            newFilters.claimed = false
        } else if (key !== 'showAll' && newFilters[key]) {
            // If any specific filter is turned ON, turn 'showAll' OFF
            newFilters.showAll = false
        }

        // If all specific filters are OFF, arguably 'showAll' could be auto-turned ON.
        if (!newFilters.openToTalking && !newFilters.forSale && !newFilters.forRent && !newFilters.claimed) {
            newFilters.showAll = true
        }

        onFilterChange(newFilters)
    }

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white/50">
                    <h2 className="text-lg font-bold text-slate-800">Filter Homes</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                <div className="p-4 space-y-2">
                    {/* Show All */}
                    <FilterItem
                        label="Show All"
                        active={filters.showAll}
                        onClick={() => toggle('showAll')}
                        colorClass="bg-slate-800 text-white"
                    />

                    <div className="h-px bg-slate-100 my-2" />

                    <FilterItem
                        label="Open to Talking"
                        active={filters.openToTalking}
                        onClick={() => toggle('openToTalking')}
                        colorClass="bg-teal-600 text-white"
                    />
                    <FilterItem
                        label="For Sale"
                        active={filters.forSale}
                        onClick={() => toggle('forSale')}
                        colorClass="bg-coral-500 text-white"
                        // Note: custom 'bg-coral-500' might not exist in tailwind config, using hex or standard color
                        customColor="#E65F52"
                    />
                    <FilterItem
                        label="For Rent"
                        active={filters.forRent}
                        onClick={() => toggle('forRent')}
                        colorClass="bg-indigo-500 text-white"
                    />
                    <div className="h-px bg-slate-100 my-2" />
                    <FilterItem
                        label="Claimed by Owner"
                        active={filters.claimed}
                        onClick={() => toggle('claimed')}
                        colorClass="bg-slate-600 text-white"
                    />
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl font-bold text-white bg-slate-900 shadow-lg hover:bg-slate-800 transition-all transform active:scale-95"
                    >
                        Apply Filters
                    </button>
                </div>
            </div>
        </div>
    )
}

function FilterItem({ label, active, onClick, colorClass, customColor }: {
    label: string, active: boolean, onClick: () => void, colorClass: string, customColor?: string
}) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold transition-all duration-200 border
                ${active
                    ? `${colorClass} border-transparent shadow-md`
                    : 'bg-white text-slate-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }
            `}
            style={active && customColor ? { backgroundColor: customColor } : {}}
        >
            <span>{label}</span>
            {active && <Check size={18} />}
        </button>
    )
}
