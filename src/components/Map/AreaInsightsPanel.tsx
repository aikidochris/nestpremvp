'use client'

import React, { useState, useMemo } from 'react'
import type { MapProperty } from '@/components/Map/ShopMap'
import { Home, ChevronDown, ChevronRight, Briefcase, Key, MessageCircle, Star, Image as ImageIcon } from 'lucide-react'

interface AreaInsightsPanelProps {
    properties: MapProperty[]
    onSelectProperty: (property: MapProperty) => void
    currentUser?: any
}

export default function AreaInsightsPanel({ properties, onSelectProperty, currentUser }: AreaInsightsPanelProps) {
    const [isUnclaimedCollapsed, setIsUnclaimedCollapsed] = useState(true)

    // Filter lists
    const activeHomes = useMemo(() => properties.filter(p =>
        p.is_for_sale || p.is_for_rent || p.is_open_to_talking || (p.signals && (p.signals.is_for_sale || p.signals.is_for_rent || p.signals.soft_listing))
    ), [properties])

    const claimedHomes = useMemo(() => properties.filter(p => !activeHomes.includes(p) && p.is_claimed), [properties, activeHomes])
    const neutralHomes = useMemo(() => properties.filter(p => !activeHomes.includes(p) && !p.is_claimed), [properties, activeHomes])

    // Counts
    const activeCount = activeHomes.length
    const newStoriesCount = useMemo(() => properties.filter(p => p.has_recent_activity).length, [properties])

    // Street Buzz Logic
    const streetBuzz = useMemo(() => {
        if (activeHomes.length < 3) return null

        const streetCounts = new Map<string, { active: number, open: number }>()

        activeHomes.forEach(p => {
            const street = p.street
            if (!street) return
            const current = streetCounts.get(street) || { active: 0, open: 0 }

            // Count active (commercial intent)
            if (p.is_for_sale || p.is_for_rent) current.active++
            // Count social (open to talking)
            if (p.is_open_to_talking) current.open++

            streetCounts.set(street, current)
        })

        // Find "Most Active"
        let bestStreet = ''
        let maxCount = 0
        let type = '' // 'active' or 'open'

        streetCounts.forEach((counts, street) => {
            const total = counts.active + counts.open
            if (total > maxCount) {
                maxCount = total
                bestStreet = street
                type = counts.active >= counts.open ? 'active' : 'conversation'
            }
        })

        if (maxCount >= 2) {
            if (type === 'active') {
                return `🔥 **${bestStreet}** is buzzing with ${maxCount} active homes.`
            } else {
                return `💬 **${bestStreet}** has ${maxCount} neighbors open to talking.`
            }
        }

        return null
    }, [activeHomes])

    return (
        <div className="flex flex-col h-full bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 overflow-hidden pointer-events-auto">

            {/* Summary Card */}
            <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-white to-slate-50">
                <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
                    Area Insights
                </h2>

                {streetBuzz ? (
                    <div className="text-sm text-slate-600 mb-3 bg-teal-50/50 p-2 rounded-lg border border-teal-100">
                        <span dangerouslySetInnerHTML={{ __html: streetBuzz.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-teal-800">$1</span>') }} />
                    </div>
                ) : null}

                <div className="flex items-center gap-4 text-sm font-medium">
                    <div className="text-[#007C7C]">
                        <span className="font-bold text-lg">{activeCount}</span> Active Homes
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="text-[#E65F52]">
                        <span className="font-bold text-lg">{newStoriesCount}</span> Stories
                    </div>
                </div>
            </div>

            {/* Lists Container */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">

                {/* Active List */}
                {activeHomes.length > 0 && (
                    <div className="space-y-2">
                        <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Market Activity
                        </div>
                        {activeHomes.map(p => (
                            <PropertyCard key={p.id} property={p} onClick={() => onSelectProperty(p)} highlight />
                        ))}
                    </div>
                )}

                {/* Claimed List */}
                {claimedHomes.length > 0 && (
                    <div className="space-y-2 mt-4">
                        <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Claimed Homes
                        </div>
                        {claimedHomes.map(p => (
                            <PropertyCard key={p.id} property={p} onClick={() => onSelectProperty(p)} />
                        ))}
                    </div>
                )}

                {/* Unclaimed / Neutral List (Collapsible) */}
                {neutralHomes.length > 0 && (
                    <div className="mt-4">
                        <button
                            onClick={() => setIsUnclaimedCollapsed(!isUnclaimedCollapsed)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors text-slate-600 text-sm font-semibold"
                        >
                            <span>View {neutralHomes.length} other homes</span>
                            {isUnclaimedCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {!isUnclaimedCollapsed && (
                            <div className="mt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
                                {neutralHomes.map(p => (
                                    <PropertyCard key={p.id} property={p} onClick={() => onSelectProperty(p)} compact />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {properties.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                        <Home size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No homes found in this view.</p>
                        <p className="text-xs mt-1">Try panning the map.</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function PropertyCard({ property, onClick, highlight, compact }: { property: MapProperty, onClick: () => void, highlight?: boolean, compact?: boolean }) {
    const address = `${property.house_number || ''} ${property.street || ''}`.trim() || property.postcode || 'Unknown Address'

    // Determine badges
    const isSale = property.is_for_sale || property.signals?.is_for_sale
    const isRent = property.is_for_rent || property.signals?.is_for_rent
    const isOpen = property.is_open_to_talking || property.signals?.soft_listing
    const isClaimed = property.is_claimed

    // Thumbnail Logic
    const imageUrl = property.image_url

    if (compact) {
        return (
            <button onClick={onClick} className="w-full text-left px-4 py-2 hover:bg-slate-50 rounded-lg text-slate-600 text-xs truncate transition-colors flex items-center gap-2">
                {imageUrl ? (
                    <img src={imageUrl} alt="" className="w-6 h-6 rounded-full object-cover bg-slate-200" />
                ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Home size={12} />
                    </div>
                )}
                <span className="truncate">{address}</span>
            </button>
        )
    }

    return (
        <div
            onClick={onClick}
            className={`
                group relative p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3
                ${highlight
                    ? 'bg-white border-teal-100 shadow-sm hover:border-teal-300 hover:shadow-md'
                    : 'bg-white border-slate-100 hover:border-slate-300'
                }
            `}
        >
            {/* Thumbnail */}
            <div className="w-14 h-14 shrink-0 rounded-lg bg-slate-100 overflow-hidden border border-slate-100">
                {imageUrl ? (
                    <img src={imageUrl} alt={address} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <Home size={20} />
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                    <div className="min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate pr-2">{address}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{property.postcode}</div>
                    </div>
                    {/* Badges - Right aligned */}
                    <div className="flex flex-col gap-1 items-end shrink-0">
                        {isSale && <Badge color="bg-[#E65F52]" icon={<Briefcase size={10} />} label="Sale" />}
                        {isRent && !isSale && <Badge color="bg-indigo-500" icon={<Key size={10} />} label="Rent" />}
                        {isOpen && !isSale && !isRent && <Badge color="bg-[#007C7C]" icon={<MessageCircle size={10} />} label="Open" />}
                        {isClaimed && !isSale && !isRent && !isOpen && <Badge color="bg-slate-500" icon={<Star size={10} />} label="Owner" />}
                    </div>
                </div>
            </div>
        </div>
    )
}

function Badge({ color, icon, label }: { color: string, icon: React.ReactNode, label: string }) {
    return (
        <div className={`${color} text-white px-1.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-sm`}>
            {icon}
            <span>{label}</span>
        </div>
    )
}
