'use client'

import { CardMode } from '@/types/social'
import type { MapProperty } from '@/types/models'
import { User } from '@supabase/supabase-js'
import OwnerChecklist from '../OwnerChecklist'
import TruthGrid from '../TruthGrid'
import BestBits from '../BestBits'
import { Flame, MessageCircle, Home } from 'lucide-react'

interface CardInteractionProps {
    mode: CardMode
    property: MapProperty
    currentUser: User | null
    // Owner props
    hasPhoto: boolean
    strengthBreakdown: any
    onAddPhotoClick: () => void
    onVerifyFactsClick: () => void
    onSetStatusClick: () => void
    // Public/Neighbor props
    onVouch?: () => void
    hasVouched?: boolean
    vouchLoading?: boolean
    canVouch?: boolean
    // Actions
    onClaim?: () => void
    onMessage?: () => void
}

export default function CardInteraction({
    mode,
    property,
    currentUser,
    hasPhoto,
    strengthBreakdown,
    onAddPhotoClick,
    onVerifyFactsClick,
    onSetStatusClick,
    onVouch,
    hasVouched,
    vouchLoading,
    canVouch,
    onClaim,
    onMessage
}: CardInteractionProps) {

    // --- UNCLAIMED ---
    if (mode === 'unclaimed') {
        return (
            <div className="space-y-4">
                {/* "Ask a Neighbor" Prompt - purely visual for now if we don't have neighbor data */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                    <p className="text-sm text-slate-500 mb-2">Curious about this home?</p>
                    <button className="text-indigo-600 font-bold text-sm hover:underline">
                        Ask a Neighbor
                    </button>
                </div>

                {/* Claim Action */}
                {onClaim && (
                    <button
                        onClick={onClaim}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#007C7C] text-white font-bold text-sm hover:bg-[#006666] shadow-md transform active:scale-95 transition-all"
                    >
                        <Home size={16} />
                        Claim Ownership
                    </button>
                )}
            </div>
        )
    }

    // --- OWNER ---
    if (mode === 'owner') {
        // If onboarding is incomplete, show checklist. Else show stats (placeholder).
        // Logic from PropertyCard: mode === 'ONBOARDING' if strength < 100.
        const isCompleted = strengthBreakdown?.total === 100

        if (!isCompleted) {
            return (
                <div className="animate-in slide-in-from-bottom-2 fade-in duration-500">
                    <OwnerChecklist
                        hasPhoto={hasPhoto}
                        hasFacts={strengthBreakdown?.breakdown.hasFacts}
                        hasStatusSet={strengthBreakdown?.breakdown.hasIntent}
                        onAddPhotoClick={onAddPhotoClick}
                        onVerifyFactsClick={onVerifyFactsClick}
                        onSetStatusClick={onSetStatusClick}
                    />
                </div>
            )
        }

        return (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800">
                <h3 className="font-bold text-emerald-800 dark:text-emerald-400">Your Home is Active</h3>
                <p className="text-sm text-emerald-600/80">You are ready to receive messages and notes.</p>
            </div>
        )
    }

    // --- PUBLIC (Buyer/Neighbor) ---
    return (
        <div className="space-y-5 animate-in slide-in-from-bottom-2 fade-in duration-500">

            {/* Neighbor Vouch */}
            {canVouch && onVouch && (
                <div className="space-y-1.5">
                    <button
                        onClick={onVouch}
                        disabled={vouchLoading}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all border ${hasVouched
                                ? 'bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-500 border-amber-200 dark:border-amber-800'
                                : 'bg-white text-slate-700 border-slate-200 hover:border-amber-400 hover:text-amber-600'
                            }`}
                    >
                        <Flame size={16} className={hasVouched ? 'fill-amber-600' : ''} />
                        {hasVouched ? 'Vouched' : 'Verify Location Vibe'}
                    </button>
                </div>
            )}

            {/* Truth Grid */}
            <TruthGrid
                lastSaleDate={property.last_sale_date}
                lastSalePrice={property.last_sale_price}
                propertyType={property.home_type || property.epc_property_type}
                bedroomCount={property.bedroom_estimate}
            />

            {/* Message Owner Action */}
            {property.is_claimed && onMessage && (
                <button
                    onClick={onMessage}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#007C7C] text-white font-bold text-sm hover:bg-[#006666] shadow-md transform active:scale-95 transition-all"
                >
                    <MessageCircle size={18} />
                    Message Owner
                </button>
            )}

            {/* Best Bits */}
            <BestBits
                propertyId={property.id}
                isOwner={false}
                propertyLat={property.lat}
                propertyLon={property.lon}
            />
        </div>
    )
}
