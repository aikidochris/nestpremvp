'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { Check, Loader2 } from 'lucide-react'

interface IntentControlsProps {
    propertyId: string
    isForSale: boolean
    isForRent?: boolean
    isSoftListing: boolean
    onIntentChange?: (intent: 'settled' | 'open' | 'selling' | 'renting') => void
}

type IntentType = 'settled' | 'open' | 'selling' | 'renting'

export default function IntentControls({ propertyId, isForSale, isForRent, isSoftListing, onIntentChange }: IntentControlsProps) {
    // Derive initial local state
    const getInitialIntent = (): IntentType => {
        if (isForSale) return 'selling'
        if (isForRent) return 'renting'
        if (isSoftListing) return 'open'
        return 'settled'
    }

    const [intent, setIntent] = useState<IntentType>(getInitialIntent())
    const [updating, setUpdating] = useState(false)

    const handleIntentChange = async (newIntent: IntentType) => {
        if (newIntent === intent) return
        setUpdating(true)
        setIntent(newIntent) // Optimistic update

        const supabase = getSupabaseClient()
        
        const { error } = await supabase.from('intent_flags').upsert({
             property_id: propertyId,
             owner_id: (await supabase.auth.getUser()).data.user?.id!, 
             is_for_sale: newIntent === 'selling',
             is_for_rent: newIntent === 'renting',
             soft_listing: newIntent === 'open',
        }, { onConflict: 'property_id' })

        if (error) {
            console.error('Failed to update intent', error)
        } else {
             onIntentChange?.(newIntent)
        }
        setUpdating(false)
    }

    return (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-1 flex flex-wrap items-center justify-between gap-1 border border-slate-200 dark:border-slate-700">
            <button
                onClick={() => handleIntentChange('settled')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1
                    ${intent === 'settled' 
                        ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-700 dark:text-slate-200' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
            >
                Settled
                {intent === 'settled' && !updating && <Check size={12} className="text-green-500" />}
            </button>
            
            <button
                onClick={() => handleIntentChange('open')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1
                    ${intent === 'open' 
                        ? 'bg-teal-50 dark:bg-teal-900/30 shadow-sm text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-800' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
            >
                Open
                {intent === 'open' && !updating && <Check size={12} className="text-teal-500" />}
            </button>
            
            <button
                onClick={() => handleIntentChange('selling')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1
                    ${intent === 'selling' 
                        ? 'bg-red-50 dark:bg-red-900/30 shadow-sm text-red-700 dark:text-red-300 border border-red-100 dark:border-red-800' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
            >
                For Sale
                {intent === 'selling' && !updating && <Check size={12} className="text-red-500" />}
            </button>

            <button
                onClick={() => handleIntentChange('renting')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1
                    ${intent === 'renting' 
                        ? 'bg-purple-50 dark:bg-purple-900/30 shadow-sm text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800' 
                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                    }`}
            >
                For Rent
                {intent === 'renting' && !updating && <Check size={12} className="text-purple-500" />}
            </button>
        </div>
    )
}
