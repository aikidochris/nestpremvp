'use client'

import { useMap } from 'react-leaflet'
// @ts-expect-error Types missing for this library
import { HeatmapLayer } from 'react-leaflet-heatmap-layer-v3'

export interface HeatmapPoint {
    lat: number
    lon: number
    intensity: number
}

interface Props {
    points: HeatmapPoint[]
    mode: 'all' | 'market' | 'social'
}

const GRADIENTS = {
    all: {
        0.2: '#6366F1', // Indigo (Buzz/Social)
        0.5: '#007C7C', // Teal (Openness)
        0.8: '#E65F52', // Coral (Action/Sale)
    },
    market: {
        0.4: '#FF7F50',
        0.8: '#FF4500',
    },
    social: {
        0.4: '#007C7C',
        0.8: '#9333EA',
    }
}

export default function HeatmapOverlay({ points, mode }: Props) {
    if (!points || points.length === 0) return null

    return (
        <HeatmapLayer
            fitBoundsOnLoad={false}
            fitBoundsOnUpdate={false}
            points={points}
            longitudeExtractor={(p: HeatmapPoint) => p.lon}
            latitudeExtractor={(p: HeatmapPoint) => p.lat}
            intensityExtractor={(p: HeatmapPoint) => p.intensity}
            radius={15}
            maxOpacity={0.85} // Increased from 0.7 to fix "muted" look
            max={1.0}
            gradient={GRADIENTS[mode] || GRADIENTS.all}
            useLocalExtrema={false}
        />
    )
}
