'use client'

import { useState, useEffect } from 'react'
import { Save, Building2, BedDouble, FileText } from 'lucide-react'
import clsx from 'clsx'

interface HomeFactsEditorProps {
    bedroomCount: number | null
    homeType: string | null
    oneLiner: string
    onSave: (data: { bedrooms: number; type: string; story: string }) => Promise<void>
    isSaving: boolean
}

const PROPERTY_TYPES = [
    'Terraced',
    'Semi-Detached',
    'Detached',
    'Flat/Apartment',
    'Bungalow',
    'Cottage',
]

export default function HomeFactsEditor({
    bedroomCount,
    homeType,
    oneLiner,
    onSave,
    isSaving
}: HomeFactsEditorProps) {
    const [bedrooms, setBedrooms] = useState<number>(bedroomCount || 2)
    const [type, setType] = useState<string>(homeType || 'Terraced')
    const [story, setStory] = useState<string>(oneLiner || '')
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        setBedrooms(bedroomCount || 2)
    }, [bedroomCount])

    useEffect(() => {
        if (homeType) {
            // Normalize case if needed
            const found = PROPERTY_TYPES.find(t => t.toLowerCase() === homeType.toLowerCase())
            if (found) setType(found)
        }
    }, [homeType])

    useEffect(() => {
        setStory(oneLiner || '')
    }, [oneLiner])

    const handleSave = () => {
        onSave({ bedrooms, type, story })
        setHasChanges(false)
    }

    // Auto-save on blur logic could go here, but explicit save is safer for gamification feedback
    // usage: onBlur={handleSave} 

    return (
        <div className="bg-white/50 dark:bg-white/5 rounded-xl border border-white/40 shadow-sm p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200">
                <FileText className="w-4 h-4 text-amber-500" />
                <h3>Verify Key Facts</h3>
            </div>

            {/* Row 1: Data Points */}
            <div className="grid grid-cols-2 gap-3">
                {/* Bedrooms */}
                <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                        <BedDouble className="w-3 h-3" /> Beds
                    </label>
                    <select
                        value={bedrooms}
                        onChange={(e) => {
                            setBedrooms(Number(e.target.value))
                            setHasChanges(true)
                        }}
                        className="w-full text-sm font-semibold rounded-lg border-slate-200 bg-white/80 py-2 px-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                            <option key={num} value={num}>{num} Bedrooms</option>
                        ))}
                    </select>
                </div>

                {/* Type */}
                <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> Type
                    </label>
                    <select
                        value={type}
                        onChange={(e) => {
                            setType(e.target.value)
                            setHasChanges(true)
                        }}
                        className="w-full text-sm font-semibold rounded-lg border-slate-200 bg-white/80 py-2 px-2 focus:ring-amber-500 focus:border-amber-500"
                    >
                        {PROPERTY_TYPES.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Row 2: One Liner Story */}
            <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase font-bold">
                    The &apos;One-Liner&apos; (What makes it special?)
                </label>
                <textarea
                    value={story}
                    onChange={(e) => {
                        setStory(e.target.value)
                        setHasChanges(true)
                    }}
                    placeholder="e.g. Sun-drenched garden with sea views or Period charm with modern twist..."
                    rows={2}
                    className="w-full text-sm rounded-lg border-slate-200 bg-white/80 py-2 px-3 focus:ring-amber-500 focus:border-amber-500 resize-none placeholder:text-slate-400"
                />
            </div>

            {/* Save Action */}
            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={!hasChanges || isSaving}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                        hasChanges
                            ? "bg-amber-500 text-white shadow-md hover:bg-amber-600 hover:shadow-lg scale-100"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed scale-95 opacity-50"
                    )}
                >
                    <Save className="w-3 h-3" />
                    {isSaving ? 'Saving...' : 'Confirm Facts (+25%)'}
                </button>
            </div>
        </div>
    )
}
