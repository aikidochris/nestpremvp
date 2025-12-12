'use client'

import confetti from 'canvas-confetti'
import { useCallback } from 'react'

/**
 * Hook for triggering celebration confetti effects
 */
export function useConfetti() {
    const fireCelebration = useCallback(() => {
        // Center burst confetti
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { x: 0.5, y: 0.5 },
            colors: ['#007C7C', '#FFD700', '#E65F52', '#6366F1', '#22C55E'],
            disableForReducedMotion: true,
        })
    }, [])

    return { fireCelebration }
}
