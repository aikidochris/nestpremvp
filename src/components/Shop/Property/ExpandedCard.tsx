
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ChevronLeft, Plus } from 'lucide-react'
import type { MapProperty } from '@/types/models'
import CardHeader from './CardHeader'
import HeroMedia from './HeroMedia'
import ActionPanel from './ActionPanel'
import { usePropertyCardState } from '@/hooks/usePropertyCardState'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import TruthGrid from '../TruthGrid'
import { useNeighborRouting } from '@/hooks/useNeighborRouting'
import CardOwner from './CardOwner'
import IntentControls from './IntentControls'
// import NeighborRouting from './NeighborRouting' 

interface ExpandedCardProps {
    property: MapProperty
    onClose: () => void
    onBack?: () => void
    onClaim?: () => void
    onSelectNeighbor?: (property: MapProperty) => void
    onIntentChange?: (intent: 'settled' | 'open' | 'selling' | 'renting') => void
    onUpdate?: (updatedProperty: MapProperty) => void
}

export default function ExpandedCard({ property, onClose, onBack, onClaim, onSelectNeighbor, onIntentChange, onUpdate }: ExpandedCardProps) {
    const { currentUser } = useCurrentUser()
    // Local state for live UI updates
    const [localProperty, setLocalProperty] = useState<MapProperty>(property)
    const { mode, isSettled, noteCount, hasNotes } = usePropertyCardState({ property: localProperty, currentUser })
    const { neighbors } = useNeighborRouting(localProperty)
    const [isEditing, setIsEditing] = useState(false)

    // Handler for live updates from CardOwner
    const handlePropertyUpdate = (updates: Partial<MapProperty>) => {
        const updated = { ...localProperty, ...updates }
        setLocalProperty(updated)
        // Notify parent (HomeClient) to update map
        onUpdate?.(updated)
    }

    // Owner Mode: Show Dashboard OR Standard View with Edit Trigger
    if (mode === 'owner' && currentUser && isEditing) {
        return (
            <CardOwner
                property={localProperty}
                currentUser={currentUser}
                onClose={() => setIsEditing(false)}
                onIntentChange={onIntentChange}
                onUpdate={handlePropertyUpdate}
            />
        )
    }


    // Badge Logic
    const getBadges = () => {
        const badges = []

        // 1. Ownership Badge
        if (mode === 'owner') {
            badges.push({ label: 'Your Property', color: 'bg-emerald-100 dark:bg-emerald-900', textColor: 'text-emerald-700 dark:text-emerald-300' })
        }

        // 2. Status Badge (Always show the status, even for owners, so they know what public sees)
        if (localProperty.is_for_sale) {
            badges.push({ label: 'For Sale', color: 'bg-[#E65F52]', textColor: 'text-white' })
        } else if (localProperty.is_for_rent) {
            badges.push({ label: 'For Rent', color: 'bg-purple-500', textColor: 'text-white' })
        } else if (localProperty.is_open_to_talking) {
            badges.push({ label: 'Open to Chat', color: 'bg-teal-500', textColor: 'text-white' })
        } else if (mode === 'unclaimed') {
            badges.push({ label: 'Unclaimed', color: 'bg-slate-200 dark:bg-slate-700', textColor: 'text-slate-500 dark:text-slate-300' })
        } else {
            // Settled (Only show if not unclaimed, and no other status)
            // If Owner is viewing, they might want to see "Settled" explicitly if they haven't opened yet?
            // Or just nothing if standard settled. 
            // Let's show "Settled" for clarity if it matches the 'settled' criteria
            if (isSettled) {
                badges.push({ label: 'Settled', color: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-400' })
            }
        }

        return badges
    }

    const badges = getBadges()
    const title = localProperty.display_label || `${localProperty.house_number || ''} ${localProperty.street || ''}`.trim() || 'Home'
    const subtitle = localProperty.postcode || 'No address'
    const imageUrl = localProperty.market_image_url || localProperty.image_url

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full md:w-[450px] z-[1060] bg-white dark:bg-slate-900 shadow-2xl flex flex-col"
        >
            {/* Header / Nav */}
            <div className="absolute top-4 left-4 z-20 flex gap-2">
                {onBack && (
                    <button onClick={onBack} className="p-2 bg-black/20 hover:bg-black/30 backdrop-blur rounded-full text-white transition">
                        <ChevronLeft size={20} />
                    </button>
                )}
            </div>
            <div className="absolute top-4 right-4 z-20">
                <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/30 backdrop-blur rounded-full text-white transition">
                    <X size={20} />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">

                {/* 0. Notification Banner (Owner Only) */}
                {mode === 'owner' && hasNotes && (
                    <button
                        onClick={() => setIsEditing(true)} // Or dedicated notes view? For now dashboard.
                        className="w-full bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800 p-3 flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                            <div className="p-1 bg-amber-200 dark:bg-amber-800 rounded-full">
                                <span className="block w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400 animate-pulse" />
                            </div>
                            <span className="text-xs font-bold">
                                You have {noteCount} note{noteCount !== 1 ? 's' : ''} waiting
                            </span>
                        </div>
                        <span className="text-[10px] text-amber-600 font-bold group-hover:underline">VIEW</span>
                    </button>
                )}

                {/* Hero Section */}
                <div className="h-64 md:h-72 w-full relative shrink-0">
                    <HeroMedia
                        imageUrl={imageUrl}
                        isUnclaimed={mode === 'unclaimed'}
                        isOwner={mode === 'owner'}
                        onAddPhoto={() => console.log('Add photo clicked')}
                        onManage={() => setIsEditing(true)}
                    />
                </div>

                {/* Body */}
                <div className="p-5 space-y-6">
                    <CardHeader title={title} subtitle={subtitle} badges={badges} />

                    {/* (IntentControls removed from here, moved to Dashboard) */}

                    {/* Truth Grid */}
                    <TruthGrid
                        lastSaleDate={localProperty.last_sale_date}
                        lastSalePrice={localProperty.last_sale_price}
                        propertyType={localProperty.home_type}
                        bedroomCount={localProperty.bedroom_estimate}
                    />

                    {/* STORY SECTION */}
                    <div className="prose prose-sm dark:prose-invert">
                        {mode === 'owner' && !(localProperty as any).summary_text ? (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full text-left p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-400 group transition-colors"
                            >
                                <div className="flex items-center gap-2 text-slate-400 group-hover:text-indigo-500 mb-1">
                                    <Plus size={16} />
                                    <span className="font-bold text-xs uppercase">Complete your profile</span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium group-hover:text-slate-700 dark:group-hover:text-slate-200">
                                    Add a story to introduce your home to the neighborhood.
                                </p>
                            </button>
                        ) : (
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-serif">
                                {(localProperty as any).summary_text || (mode === 'unclaimed'
                                    ? "Nobody has claimed this home yet. Is it yours? Claim it to join the neighborhood."
                                    : "This neighbor hasn't written their story yet."
                                )}
                            </p>
                        )}
                    </div>

                    {/* ALBUM GRID SECTION */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                {mode === 'owner' ? 'Your Albums' : 'Shared Albums'}
                            </h4>
                            {mode === 'owner' && (
                                <button onClick={() => setIsEditing(true)} className="text-[10px] font-bold text-indigo-500 hover:underline">
                                    MANAGE
                                </button>
                            )}
                        </div>

                        {mode === 'owner' ? (
                            <div className="grid grid-cols-2 gap-3">
                                {['Kitchen', 'Living', 'Garden', 'Bedroom', 'Bathroom'].map(album => (
                                    <div key={album} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-3 opacity-60">
                                        <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-lg">
                                            {album === 'Kitchen' ? '🍳' : album === 'Living' ? '🛋️' : album === 'Garden' ? '🌳' : album === 'Bedroom' ? '🛏️' : '🛁'}
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{album}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            // Visitor View: Only show if shared (mock for now as we don't have share data in property view yet)
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 text-center">
                                <p className="text-xs text-slate-400 italic">No albums shared yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Action Panel */}
            <ActionPanel
                mode={mode}
                isSettled={isSettled}
                propertyId={property.id}
                currentUserId={currentUser?.id}
                ownerId={property.claimed_by_user_id || undefined}
                onMessageOwner={() => console.log('Open Message Modal - Superseded by inline')}
                onClaim={onClaim}
                neighbors={neighbors}
                onSelectNeighbor={onSelectNeighbor}
            />
        </motion.div>
    )
}
