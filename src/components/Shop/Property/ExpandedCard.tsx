'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, ChevronLeft } from 'lucide-react'
import type { MapProperty } from '@/types/models'
import CardHeader from './CardHeader'
import HeroMedia from './HeroMedia'
import ActionPanel from './ActionPanel'
import { usePropertyCardState } from '@/hooks/usePropertyCardState'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import TruthGrid from '../TruthGrid'
import { useNeighborRouting } from '@/hooks/useNeighborRouting'
import NeighborRouting from './NeighborRouting'

interface ExpandedCardProps {
    property: MapProperty
    onClose: () => void
    onBack?: () => void
    onClaim?: () => void
    onSelectNeighbor?: (property: MapProperty) => void
}

export default function ExpandedCard({ property, onClose, onBack, onClaim, onSelectNeighbor }: ExpandedCardProps) {
    const { currentUser } = useCurrentUser()
    const { mode, isSettled } = usePropertyCardState({ property, currentUser })
    const { neighbors } = useNeighborRouting(property)
    const [showNeighbors, setShowNeighbors] = useState(false)

    // Badge Logic
    const getBadge = () => {
        if (mode === 'owner') return { label: 'Your Property', color: 'bg-emerald-100 dark:bg-emerald-900', textColor: 'text-emerald-700 dark:text-emerald-300' }
        if (property.is_for_sale) return { label: 'For Sale', color: 'bg-[#E65F52]', textColor: 'text-white' }
        if (property.is_for_rent) return { label: 'For Rent', color: 'bg-indigo-500', textColor: 'text-white' }
        if (property.is_open_to_talking) return { label: 'Open to Chat', color: 'bg-teal-500', textColor: 'text-white' }
        if (mode === 'unclaimed') return { label: 'Unclaimed', color: 'bg-slate-200 dark:bg-slate-700', textColor: 'text-slate-500 dark:text-slate-300' }
        return { label: 'Settled', color: 'bg-slate-100 dark:bg-slate-800', textColor: 'text-slate-400' }
    }

    const badge = getBadge()
    const title = property.display_label || `${property.house_number || ''} ${property.street || ''}`.trim() || 'Home'
    const subtitle = property.postcode || 'No Address'
    const imageUrl = property.image_url || property.market_image_url

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
                {/* Hero Section */}
                <div className="h-64 md:h-72 w-full relative shrink-0">
                    <HeroMedia
                        imageUrl={imageUrl}
                        isUnclaimed={mode === 'unclaimed'}
                        onAddPhoto={() => console.log('Add photo clicked')}
                    />
                </div>

                {/* Body */}
                <div className="p-5 space-y-6">
                    <CardHeader title={title} subtitle={subtitle} statusBadge={badge} />

                    {/* Truth Grid */}
                    <TruthGrid
                        lastSaleDate={property.last_sale_date}
                        lastSalePrice={property.last_sale_price}
                        propertyType={property.home_type}
                        bedroomCount={property.bedroom_estimate}
                    />

                    <div className="prose prose-sm dark:prose-invert">
                        <p className="text-slate-500">
                            {mode === 'unclaimed'
                                ? "Nobody has claimed this home yet. Is it yours? Claim it to start receiving messages and neighbor notes."
                                : `Welcome to the ${title}. Explore the history, vibe, and community around this location.`
                            }
                        </p>
                    </div>

                    {/* Neighbor Routing (Conditional) */}
                    {showNeighbors && mode === 'unclaimed' && (
                        <NeighborRouting
                            neighbors={neighbors}
                            onSelect={onSelectNeighbor || (() => { })}
                        />
                    )}
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
                onNoteSent={() => setShowNeighbors(true)}
            />
        </motion.div>
    )
}
