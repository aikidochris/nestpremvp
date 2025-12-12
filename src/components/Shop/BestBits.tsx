'use client'

import { useState, useEffect } from 'react'
import { Check, Plus, X, Sparkles, MapPin } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { VIBE_ZONES, VibeZone } from '@/data/vibeZones'

interface BestBitsProps {
    propertyId: string
    isOwner: boolean
    propertyLat?: number
    propertyLon?: number
}

const MAX_HIGHLIGHTS = 5

// Find the nearest vibe zone based on property location
function getNearestVibeZone(lat: number, lon: number): VibeZone | null {
    if (!lat || !lon) return null

    let nearest: VibeZone | null = null
    let minDist = Infinity

    for (const zone of VIBE_ZONES) {
        const [zLat, zLon] = zone.centroid
        const dist = Math.sqrt(Math.pow(lat - zLat, 2) + Math.pow(lon - zLon, 2))
        if (dist < minDist) {
            minDist = dist
            nearest = zone
        }
    }

    // Only return if within reasonable distance (~3km)
    return minDist < 0.03 ? nearest : null
}

export default function BestBits({ propertyId, isOwner, propertyLat, propertyLon }: BestBitsProps) {
    const supabase = getSupabaseClient()
    const [highlights, setHighlights] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [editing, setEditing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [newHighlight, setNewHighlight] = useState('')
    const [editableHighlights, setEditableHighlights] = useState<string[]>([])

    useEffect(() => {
        if (!propertyId) return
        let cancelled = false

        async function loadHighlights() {
            setLoading(true)
            const { data, error } = await supabase
                .from('home_story')
                .select('highlights')
                .eq('property_id', propertyId)
                .maybeSingle()

            if (cancelled) return

            if (!error && data) {
                // Cast to any until db:sync regenerates types with highlights column
                const storyData = data as any
                setHighlights(storyData?.highlights ?? [])
            } else {
                setHighlights([])
            }
            setLoading(false)
        }

        loadHighlights()
        return () => { cancelled = true }
    }, [propertyId, supabase])

    const startEditing = () => {
        setEditableHighlights([...highlights])
        setEditing(true)
    }

    const cancelEditing = () => {
        setEditableHighlights([])
        setNewHighlight('')
        setEditing(false)
    }

    const addHighlight = () => {
        const trimmed = newHighlight.trim()
        if (!trimmed || editableHighlights.length >= MAX_HIGHLIGHTS) return
        setEditableHighlights(prev => [...prev, trimmed])
        setNewHighlight('')
    }

    const removeHighlight = (index: number) => {
        setEditableHighlights(prev => prev.filter((_, i) => i !== index))
    }

    const saveHighlights = async () => {
        setSaving(true)

        const { error } = await supabase
            .from('home_story')
            .upsert({
                property_id: propertyId,
                highlights: editableHighlights,
            }, { onConflict: 'property_id' })

        if (error) {
            console.error('Error saving highlights:', error)
            alert('Failed to save highlights')
        } else {
            setHighlights(editableHighlights)
            setEditing(false)
        }
        setSaving(false)
    }

    // Get fallback vibe zone tags
    const vibeZone = getNearestVibeZone(propertyLat || 0, propertyLon || 0)
    const hasOwnerHighlights = highlights.length > 0

    if (loading) {
        return (
            <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-8 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
        )
    }

    // Owner Edit Mode
    if (isOwner && editing) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Sparkles size={16} className="text-[#007C7C]" />
                        The Best Bits
                    </h4>
                    <span className="text-xs text-slate-400">
                        {editableHighlights.length}/{MAX_HIGHLIGHTS}
                    </span>
                </div>

                {/* Editable List */}
                <div className="space-y-2">
                    {editableHighlights.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                            <Check size={14} className="text-[#007C7C] shrink-0" />
                            <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{item}</span>
                            <button
                                onClick={() => removeHighlight(idx)}
                                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Add New Input */}
                {editableHighlights.length < MAX_HIGHLIGHTS && (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newHighlight}
                            onChange={(e) => setNewHighlight(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addHighlight()}
                            placeholder="e.g. Sun trap garden"
                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#007C7C]/20 focus:border-[#007C7C]"
                            maxLength={80}
                        />
                        <button
                            onClick={addHighlight}
                            disabled={!newHighlight.trim()}
                            className="p-2 rounded-lg bg-[#007C7C] text-white disabled:opacity-50"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                )}

                {/* Save / Cancel */}
                <div className="flex gap-2 pt-2">
                    <button
                        onClick={cancelEditing}
                        className="flex-1 px-3 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={saveHighlights}
                        disabled={saving}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-[#007C7C] text-white hover:bg-[#006666] disabled:opacity-60"
                    >
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        )
    }

    // Public Read Mode OR Owner Non-Editing Mode
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {hasOwnerHighlights ? (
                        <>
                            <Sparkles size={16} className="text-[#007C7C]" />
                            The Best Bits
                        </>
                    ) : (
                        <>
                            <MapPin size={16} className="text-slate-400" />
                            Area Vibes
                        </>
                    )}
                </h4>
                {isOwner && !editing && (
                    <button
                        onClick={startEditing}
                        className="text-xs font-medium text-[#007C7C] hover:underline"
                    >
                        {hasOwnerHighlights ? 'Edit' : 'Add your highlights'}
                    </button>
                )}
            </div>

            {hasOwnerHighlights ? (
                // Owner Highlights
                <div className="space-y-1.5">
                    {highlights.map((item, idx) => (
                        <div
                            key={idx}
                            className="flex items-center gap-2.5 py-1.5"
                        >
                            <div className="w-5 h-5 rounded-full bg-[#007C7C]/10 flex items-center justify-center shrink-0">
                                <Check size={12} className="text-[#007C7C]" />
                            </div>
                            <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                        </div>
                    ))}
                </div>
            ) : vibeZone ? (
                // Fallback: Area Vibe Tags
                <div className="space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        Near {vibeZone.name}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {vibeZone.tags.map((tag, i) => (
                            <span
                                key={i}
                                className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {vibeZone.punchline}
                    </p>
                </div>
            ) : (
                // No highlights and no vibe zone found
                <p className="text-sm text-slate-400 italic">
                    Exploring this area...
                </p>
            )}
        </div>
    )
}
