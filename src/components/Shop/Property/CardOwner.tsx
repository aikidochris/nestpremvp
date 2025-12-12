'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Image as ImageIcon, Lock, Upload, Plus, ChevronRight, X, PenTool, Save, MessageCircle } from 'lucide-react'
import { MapProperty } from '@/types/models'
import IntentControls from './IntentControls'
import CardMessaging from './CardMessaging'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { usePropertyAlbums } from '@/hooks/usePropertyAlbums'

interface CardOwnerProps {
    property: MapProperty
    currentUser: any
    onClose: () => void
    onIntentChange?: (intent: 'settled' | 'open' | 'selling' | 'renting') => void
    onUpdate?: (updates: Partial<MapProperty>) => void
}

const ALBUM_PRESETS = [
    { id: 'kitchen', label: 'Kitchen', icon: '🍳' },
    { id: 'living', label: 'Living Room', icon: '🛋️' },
    { id: 'garden', label: 'Garden', icon: '🌳' },
    { id: 'bedroom', label: 'Bedroom', icon: '🛏️' },
    { id: 'bathroom', label: 'Bathroom', icon: '🛁' }
]

export default function CardOwner({ property, currentUser, onClose, onIntentChange, onUpdate }: CardOwnerProps) {
    const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null)
    const [title, setTitle] = useState(property.display_label || '')
    const [story, setStory] = useState((property as any).summary_text || '')
    const [isSavingTitle, setIsSavingTitle] = useState(false)
    const [isSavingStory, setIsSavingStory] = useState(false)
    const [titleSaved, setTitleSaved] = useState(false)
    const [storySaved, setStorySaved] = useState(false)
    // Hero image state for optimistic UI
    const [heroImage, setHeroImage] = useState(property.market_image_url || property.image_url || null)

    // Save Title (display_label)
    const handleSaveTitle = async () => {
        if (!property.id || !currentUser?.id) {
            console.warn('[CardOwner] Cannot save - missing property.id or currentUser.id')
            return
        }
        setIsSavingTitle(true)
        setTitleSaved(false)
        const supabase = getSupabaseClient()

        const { error } = await supabase
            .from('properties')
            .update({ display_label: title })
            .eq('id', property.id)

        if (error) {
            console.error('[CardOwner] Failed to save title:', error)
            alert('Failed to save title. Please try again.')
        } else {
            console.log('[CardOwner] Title saved successfully')
            setTitleSaved(true)
            setTimeout(() => setTitleSaved(false), 2000)
            // Notify parent of update
            onUpdate?.({ display_label: title })
        }
        setIsSavingTitle(false)
    }

    // Save Story (summary_text)
    const handleSaveStory = async () => {
        if (!property.id || !currentUser?.id) {
            console.warn('[CardOwner] Cannot save - missing property.id or currentUser.id')
            return
        }
        setIsSavingStory(true)
        setStorySaved(false)
        const supabase = getSupabaseClient()

        const { error } = await supabase.from('home_story').upsert({
            property_id: property.id,
            user_id: currentUser.id,
            summary_text: story
        }, { onConflict: 'property_id' })

        if (error) {
            console.error('[CardOwner] Failed to save story:', error)
            alert('Failed to save your story. Please try again.')
        } else {
            console.log('[CardOwner] Story saved successfully')
            setStorySaved(true)
            setTimeout(() => setStorySaved(false), 2000)
            // Notify parent of update
            onUpdate?.({ summary_text: story } as Partial<MapProperty>)
        }
        setIsSavingStory(false)
    }

    const { uploadToAlbum } = usePropertyAlbums(property.id)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)

    const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        setUploading(true)
        try {
            const urls = await uploadToAlbum('hero', Array.from(e.target.files))

            // Save the first URL to the properties table
            if (urls && urls.length > 0) {
                const supabase = getSupabaseClient()
                const { error } = await supabase
                    .from('properties')
                    .update({ market_image_url: urls[0] })
                    .eq('id', property.id)

                if (error) {
                    console.error('[handleHeroUpload] DB update failed:', error)
                    alert('Image uploaded but failed to save. Please try again.')
                } else {
                    console.log('[handleHeroUpload] DB update success, URL:', urls[0])
                    // Optimistic UI: Update local state immediately
                    setHeroImage(urls[0])
                    // Notify parent of update
                    onUpdate?.({ market_image_url: urls[0], image_url: urls[0] })
                }
            }
        } catch (error) {
            console.error(error)
            alert('Upload failed. Check that the storage bucket exists.')
        } finally {
            setUploading(false)
        }
    }

    // Album state
    const [activeAlbum, setActiveAlbum] = useState<string | null>(null)
    const albumInputRef = useRef<HTMLInputElement>(null)

    const handleAlbumUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !activeAlbum) return
        setUploading(true)
        try {
            await uploadToAlbum(activeAlbum, Array.from(e.target.files))
            setActiveAlbum(null) // Close uploader
            alert(`Photo added to ${activeAlbum}!`)
        } catch (error) {
            console.error(error)
            alert('Upload failed')
        } finally {
            setUploading(false)
        }
    }

    return (
        <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full md:w-[450px] z-[1060] bg-slate-50 dark:bg-slate-900 shadow-2xl flex flex-col"
        >
            {/* Header */}
            <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="font-bold text-lg text-slate-800 dark:text-white">Manage Your Home</h2>
                    <p className="text-xs text-slate-500">Update status, story & privacy</p>
                </div>
                <button
                    onClick={onClose}
                    className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-full text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
                >
                    Done
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-8">

                {/* 0. Intent System (Top Priority) */}
                <section>
                    <div className="mb-2 flex items-center gap-2">
                        <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg">
                            <PenTool size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Current Status</h3>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <IntentControls
                            propertyId={property.id}
                            isForSale={property.is_for_sale || false}
                            isForRent={property.is_for_rent || false}
                            isSoftListing={property.is_open_to_talking || false}
                            onIntentChange={onIntentChange}
                        />
                    </div>
                </section>

                {/* 0.5. Inbox */}
                <section>
                    <div className="mb-2 flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                            <MessageCircle size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Inbox</h3>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden text-left">
                        <CardMessaging
                            propertyId={property.id}
                            ownerId={currentUser.id}
                            currentUserId={currentUser.id}
                        />
                    </div>
                </section>

                {/* 1. Identity & Story */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                            <PenTool size={16} />
                        </div>
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Identity</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Title Input with Save Button */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Card Title</label>
                            <div className="flex gap-2">
                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder='e.g. "The Sunny Corner House"'
                                    className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
                                />
                                <button
                                    onClick={handleSaveTitle}
                                    disabled={isSavingTitle}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${titleSaved
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                        } disabled:opacity-50`}
                                >
                                    {isSavingTitle ? 'Saving...' : titleSaved ? '✓ Saved' : 'Save'}
                                </button>
                            </div>
                        </div>

                        {/* Story Textarea with Save Button */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Your Story</label>
                            <textarea
                                value={story}
                                onChange={(e) => setStory(e.target.value)}
                                placeholder="What makes this home special? Tell your neighbors..."
                                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none transition-shadow"
                            />
                            <button
                                onClick={handleSaveStory}
                                disabled={isSavingStory}
                                className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${storySaved
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                    } disabled:opacity-50`}
                            >
                                {isSavingStory ? 'Saving...' : storySaved ? '✓ Story Saved' : 'Save Story'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* 2. Hero Section (Public) */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                <ImageIcon size={16} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Main Photo</h3>
                                <p className="text-[10px] text-emerald-600 font-medium">Visible to everyone</p>
                            </div>
                        </div>
                    </div>

                    {/* Hidden Input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleHeroUpload}
                        className="hidden"
                        accept="image/*"
                    />

                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative aspect-video bg-slate-200 dark:bg-slate-800 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 transition-colors group cursor-pointer flex items-center justify-center"
                    >
                        {heroImage ? (
                            <img src={heroImage} alt="Main" className="w-full h-full object-cover" />
                        ) : (
                            <div className="text-center p-4">
                                <Upload className="mx-auto text-slate-400 mb-2" size={24} />
                                <span className="text-xs text-slate-500 font-medium">
                                    {uploading ? 'Uploading...' : 'Upload Hero Image'}
                                </span>
                            </div>
                        )}

                        {/* Overlay on hover */}
                        <div className={`absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center ${uploading ? 'opacity-100' : ''}`}>
                            <button className="bg-white text-slate-900 px-4 py-2 rounded-full text-xs font-bold pointer-events-none">
                                {uploading ? 'Uploading...' : 'Change Photo'}
                            </button>
                        </div>
                    </div>
                </section>

                {/* 3. Private Albums */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Lock size={16} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Private Albums</h3>
                            <p className="text-[10px] text-slate-400">Locked until you share them in chat</p>
                        </div>
                    </div>

                    {/* Hidden album file input */}
                    <input
                        type="file"
                        ref={albumInputRef}
                        onChange={handleAlbumUpload}
                        className="hidden"
                        accept="image/*"
                        multiple
                    />

                    {/* Active Album Uploader */}
                    {activeAlbum && (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-center">
                            <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-2">
                                Add photos to {activeAlbum.charAt(0).toUpperCase() + activeAlbum.slice(1)}
                            </p>
                            <div className="flex gap-2 justify-center">
                                <button
                                    onClick={() => albumInputRef.current?.click()}
                                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-xs font-bold hover:bg-indigo-600 transition"
                                >
                                    {uploading ? 'Uploading...' : 'Choose Files'}
                                </button>
                                <button
                                    onClick={() => setActiveAlbum(null)}
                                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {ALBUM_PRESETS.map((album) => (
                            <button
                                key={album.id}
                                onClick={() => setActiveAlbum(album.id)}
                                className={`group p-4 bg-white dark:bg-slate-800 rounded-xl border transition-all text-left relative overflow-hidden
                                    ${activeAlbum === album.id
                                        ? 'border-indigo-400 dark:border-indigo-500 shadow-md'
                                        : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md'
                                    }`}
                            >
                                <div className="text-2xl mb-3">{album.icon}</div>
                                <div className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                                    {album.label}
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                    0 photos
                                </div>
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500">
                                    <Plus size={16} />
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

            </div>
        </motion.div>
    )
}
