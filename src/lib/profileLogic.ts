
import type { MapProperty } from '@/types/models'

interface IntentOverrides {
    status_confirmed?: boolean
    [key: string]: any
}

interface StrengthResult {
    total: number
    breakdown: {
        claimed: boolean
        hasPhoto: boolean
        hasFacts: boolean
        hasIntent: boolean
    }
}

export function calculateProfileStrength(
    property: MapProperty | null,
    intentOverrides: IntentOverrides = {},
    heroImage: string | null = null
): StrengthResult {
    if (!property) {
        return {
            total: 0,
            breakdown: { claimed: false, hasPhoto: false, hasFacts: false, hasIntent: false }
        }
    }

    // 1. Claimed (25%)
    // - Based on is_claimed flag or if user is owner (passed contextually usually, but property.is_claimed is good proxy)
    const claimed = property.is_claimed

    // 2. Photo (25%)
    // - Has market image OR uploaded hero image
    const hasPhoto = !!(property.market_image_url || property.image_url || heroImage)

    // 3. Facts (25%)
    // - Has bedroom count AND property type
    const hasFacts = !!(property.bedroom_estimate && property.bedroom_estimate > 0 && property.home_type)

    // 4. Intent (25%)
    // - Has explicit status confirmed flag OR has active signals
    // - We check local overrides first, then property properties
    const hasIntent = !!(
        intentOverrides.status_confirmed ||
        property.signals?.soft_listing || // If active signals exist, they implied intent
        property.signals?.is_for_sale ||
        property.signals?.is_for_rent
    )

    // Calculate Total
    const steps = [claimed, hasPhoto, hasFacts, hasIntent]
    const completed = steps.filter(Boolean).length
    const total = Math.round((completed / 4) * 100)

    return {
        total,
        breakdown: {
            claimed,
            hasPhoto,
            hasFacts,
            hasIntent
        }
    }
}
