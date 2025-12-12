'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'

interface UseNeighborVouchResult {
    canVouch: boolean
    vouchCount: number
    hasVouched: boolean
    loading: boolean
    toggleVouch: () => Promise<void>
}

export function useNeighborVouch(propertyId: string | null, userId: string | null): UseNeighborVouchResult {
    const supabase = getSupabaseClient()
    const [canVouch, setCanVouch] = useState(false)
    const [vouchCount, setVouchCount] = useState(0)
    const [hasVouched, setHasVouched] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!propertyId) {
            setCanVouch(false)
            setVouchCount(0)
            setHasVouched(false)
            setLoading(false)
            return
        }

        let cancelled = false

        async function loadVouchState() {
            setLoading(true)

            // 1. Get endorsement count
            const { data: countData } = await supabase
                .rpc('get_endorsement_count', { target_property_id: propertyId })

            if (cancelled) return
            setVouchCount(countData ?? 0)

            // 2. Check if current user can vouch (only if logged in)
            if (userId) {
                const { data: canVouchData } = await supabase
                    .rpc('can_vouch_for_property', { target_property_id: propertyId })

                if (cancelled) return
                setCanVouch(!!canVouchData)

                // 3. Check if user has already vouched
                const { data: existingVouch } = await supabase
                    .from('property_endorsements')
                    .select('id')
                    .eq('property_id', propertyId)
                    .eq('user_id', userId)
                    .maybeSingle()

                if (cancelled) return
                setHasVouched(!!existingVouch)
            } else {
                setCanVouch(false)
                setHasVouched(false)
            }

            setLoading(false)
        }

        loadVouchState()

        return () => {
            cancelled = true
        }
    }, [propertyId, userId, supabase])

    const toggleVouch = useCallback(async () => {
        if (!propertyId || !userId || !canVouch) return

        // Optimistic UI update
        const wasVouched = hasVouched
        const prevCount = vouchCount

        if (wasVouched) {
            // Removing vouch
            setHasVouched(false)
            setVouchCount(prev => Math.max(0, prev - 1))

            const { error } = await supabase
                .from('property_endorsements')
                .delete()
                .eq('property_id', propertyId)
                .eq('user_id', userId)

            if (error) {
                // Rollback on error
                console.error('Error removing vouch:', error)
                setHasVouched(true)
                setVouchCount(prevCount)
            }
        } else {
            // Adding vouch
            setHasVouched(true)
            setVouchCount(prev => prev + 1)

            const { error } = await supabase
                .from('property_endorsements')
                .insert({ property_id: propertyId, user_id: userId })

            if (error) {
                // Rollback on error
                console.error('Error adding vouch:', error)
                setHasVouched(false)
                setVouchCount(prevCount)
            }
        }
    }, [propertyId, userId, canVouch, hasVouched, vouchCount, supabase])

    return { canVouch, vouchCount, hasVouched, loading, toggleVouch }
}
