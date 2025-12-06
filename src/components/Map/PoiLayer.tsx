'use client'

import React, { useEffect, useState } from 'react'
import { Marker, Circle, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { GraduationCap, TrainFront } from 'lucide-react'
import { renderToStaticMarkup } from 'react-dom/server'

interface PoiLayerProps {
    visibleTypes: string[] // e.g. ['school_primary', 'transport_metro']
}

interface POI {
    id: string
    name: string
    type: string
    lat: number
    lon: number
    metadata: {
        rating?: string
        catchment_radius_meters?: number
        line?: string
    }
}

// Helper to create DivIcon from Lucide component
const createIcon = (
    Component: React.ElementType,
    colorClass: string,
    bgColorClass: string
) => {
    // Generate HTML string for the icon
    const html = renderToStaticMarkup(
        <div className={`relative flex items-center justify-center w-6 h-6 rounded-full ${bgColorClass} shadow-md border border-white`}>
            <Component size={14} className={colorClass} />
        </div>
    )

    return L.divIcon({
        html,
        className: 'nest-poi-icon', // Use a custom class for any additional overrides if needed
        iconSize: [24, 24],
        iconAnchor: [12, 12],
    })
}

// Pre-create icons
const schoolIcon = createIcon(GraduationCap, 'text-slate-100', 'bg-slate-700')
const transportIcon = createIcon(TrainFront, 'text-blue-100', 'bg-blue-600')

export default function PoiLayer({ visibleTypes }: PoiLayerProps) {
    const [pois, setPois] = useState<POI[]>([])
    const supabase = getSupabaseClient()

    useEffect(() => {
        async function loadPois() {
            const { data, error } = await supabase
                .from('points_of_interest')
                .select('*')

            if (error) {
                console.error('[PoiLayer] failed to load POIs', error)
                return
            }
            setPois(data as POI[])
        }
        loadPois()
    }, [supabase])

    if (!visibleTypes.length) return null

    const visiblePois = pois.filter(p => visibleTypes.some(t => p.type.startsWith(t)))

    return (
        <>
            {visiblePois.map(poi => {
                const isSchool = poi.type.startsWith('school')
                const icon = isSchool ? schoolIcon : transportIcon

                // Catchment styling: Subtlety is key
                const fillColor = '#0f172a' // Slate-900 for dark/neutral feel

                return (
                    <React.Fragment key={poi.id}>
                        {/* Catchment Circle */}
                        {poi.metadata.catchment_radius_meters && (
                            <Circle
                                center={[poi.lat, poi.lon]}
                                radius={poi.metadata.catchment_radius_meters}
                                pathOptions={{
                                    stroke: false,
                                    fillColor: fillColor,
                                    fillOpacity: 0.05,
                                    interactive: false // Let clicks pass through
                                }}
                            />
                        )}

                        {/* Location Marker */}
                        <Marker
                            position={[poi.lat, poi.lon]}
                            icon={icon}
                            zIndexOffset={400} // Below property pins (usually >500) but above base map
                        >
                            <Tooltip direction="top" offset={[0, -12]} opacity={1.0} className="font-sans">
                                <div className="text-xs">
                                    <div className="font-bold text-slate-800">{poi.name}</div>
                                    {poi.metadata.rating && (
                                        <div className="text-slate-500 font-medium">{poi.metadata.rating}</div>
                                    )}
                                    {poi.metadata.line && (
                                        <div className="text-blue-600 font-medium">{poi.metadata.line} Line</div>
                                    )}
                                </div>
                            </Tooltip>
                        </Marker>
                    </React.Fragment>
                )
            })}
        </>
    )
}
