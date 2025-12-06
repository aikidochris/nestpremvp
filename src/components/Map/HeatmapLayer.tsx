import { useState, useEffect } from 'react'
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
        0.2: '#4f46e5', // INDIGO-600 (Low Buzz)
        0.6: '#a855f7', // PURPLE-500 (Medium Buzz)
        1.0: '#ec4899', // PINK-500   (High Demand)
    },
    // Legacy mapping (unused)
    market: { 0.4: '#FF7F50', 0.8: '#FF4500' },
    social: { 0.4: '#007C7C', 0.8: '#9333EA' }
}

export default function HeatmapOverlay({ points, mode }: Props) {
    const map = useMap()
    const [radius, setRadius] = useState(15)

    useEffect(() => {
        const updateRadius = () => {
            const zoom = map.getZoom()
            // Logic: Low zoom = Small radius (distinct islands). High zoom = Broad radius (street coverage).
            if (zoom < 13) setRadius(10)
            else if (zoom < 15) setRadius(20)
            else setRadius(30)
        }

        map.on('zoomend', updateRadius)
        updateRadius() // Init
        return () => {
            map.off('zoomend', updateRadius)
        }
    }, [map])

    if (!points || points.length === 0) return null

    return (
        <HeatmapLayer
            fitBoundsOnLoad={false}
            fitBoundsOnUpdate={false}
            points={points}
            longitudeExtractor={(p: HeatmapPoint) => p.lon}
            latitudeExtractor={(p: HeatmapPoint) => p.lat}
            intensityExtractor={(p: HeatmapPoint) => p.intensity}
            radius={radius}
            maxOpacity={0.6}
            max={1.0}
            gradient={GRADIENTS[mode] || GRADIENTS.all}
            useLocalExtrema={false}
        />
    )
}
