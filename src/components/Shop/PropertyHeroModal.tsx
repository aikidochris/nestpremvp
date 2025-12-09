'use client'

import { X, MapPin, Share2, MessageCircle, Camera, Star, ChevronLeft, ChevronRight, Grid } from 'lucide-react'
import { useEffect, useState, useRef, type ChangeEvent } from 'react'
import ShopDetailClient from './ShopDetailClient'
import ShopMap from '@/components/Map/MapWrapper'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { uploadHomeStoryImages } from '@/lib/storage'
import clsx from 'clsx'

interface PropertyHeroModalProps {
    shop: any
    isOpen: boolean
    onClose: () => void
    currentUser: any
    onClaim?: () => void
    onMessage?: () => void
    homeStory?: any
    claimRecord?: any
    onStoryUpdate?: (images: string[]) => void
}

export default function PropertyHeroModal({
    shop,
    isOpen,
    onClose,
    currentUser,
    homeStory: initialHomeStory,
    claimRecord,
    onMessage,
    onClaim,
    onStoryUpdate
}: PropertyHeroModalProps) {
    // --- Hooks must be top level ---
    const supabase = getSupabaseClient()
    const [mounted, setMounted] = useState(false)
    const [localHomeStory, setLocalHomeStory] = useState<any>(initialHomeStory)
    const [storyImages, setStoryImages] = useState<string[]>([])
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { setMounted(true) }, [])

    // Sync Data on Open
    useEffect(() => {
        if (isOpen) {
            // Priority: Story Images > Shop Images (Array) > Shop Image (String)
            let imgs: string[] = []
            if (initialHomeStory?.images?.length) {
                imgs = initialHomeStory.images
            } else if (shop?.shop_images?.length) {
                imgs = shop.shop_images.map((i: any) => i.image_url)
            } else if (shop?.image_url) {
                imgs = [shop.image_url]
            }
            setStoryImages(imgs)
            setLocalHomeStory(initialHomeStory)
        }
    }, [isOpen, initialHomeStory, shop])

    // Lock Scroll
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden'
        else document.body.style.overflow = 'unset'
        return () => { document.body.style.overflow = 'unset' }
    }, [isOpen])

    if (!mounted || !isOpen || !shop) return null

    // --- Handlers ---
    const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length || !currentUser) return
        setUploading(true)
        try {
            const files = Array.from(e.target.files)
            const urls = await uploadHomeStoryImages(supabase, shop.id, files)

            const newImages = [...storyImages, ...urls]
            // Optimistic Update
            setStoryImages(newImages)
            if (onStoryUpdate) onStoryUpdate(newImages)

            const { data, error } = await supabase
                .from('home_story')
                .upsert({
                    property_id: shop.id,
                    user_id: currentUser.id,
                    images: newImages,
                    summary_text: localHomeStory?.summary_text || ''
                }, { onConflict: 'property_id' })
                .select()
                .single()

            if (error) throw error
            setLocalHomeStory(data)
        } catch (error) {
            console.error('Upload failed:', error)
            alert('Upload failed. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    // --- Render Helpers ---
    const fmtPrice = (p: number) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p)

    const isClaimedByYou = claimRecord?.user_id === currentUser?.id
    const hasImages = storyImages.length > 0

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
            {/* Dark Backdrop */}
            <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-md transition-opacity" onClick={onClose} />

            {/* Modal Card */}
            <div className="relative w-full max-w-7xl h-[90vh] bg-white dark:bg-stone-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-in zoom-in-95 duration-300 border border-stone-200 dark:border-stone-800">

                {/* Close Button (Left Aligned - World Class UX) */}
                <button
                    onClick={onClose}
                    className="absolute top-5 left-5 z-[2010] p-2.5 bg-white/90 backdrop-blur hover:bg-white rounded-full shadow-lg transition-transform hover:scale-105 group"
                >
                    <X size={20} className="text-stone-800" />
                </button>

                {/* LEFT: The Mosaic Gallery (60% Width) */}
                <div className="w-full md:w-[60%] h-64 md:h-full bg-stone-100 dark:bg-stone-950 relative overflow-y-auto no-scrollbar">

                    {!hasImages ? (
                        // Empty State
                        <div className="flex h-full flex-col items-center justify-center gap-6 text-stone-400 bg-stone-50 dark:bg-stone-900/50">
                            <div className="p-8 bg-white dark:bg-stone-800 rounded-full shadow-sm">
                                <Camera size={48} className="text-stone-300" />
                            </div>
                            <div className="text-center space-y-2">
                                <p className="font-semibold text-xl text-stone-600 dark:text-stone-300">No photos yet</p>
                                {isClaimedByYou && <p className="text-sm text-stone-500">Upload visuals to bring this home to life</p>}
                            </div>
                        </div>
                    ) : (
                        // THE MOSAIC GRID
                        <div className="h-full w-full p-2">
                            {/* Case 1: Single Hero */}
                            {storyImages.length === 1 && (
                                <img src={storyImages[0]} alt="Hero" className="w-full h-full object-cover rounded-xl" />
                            )}

                            {/* Case 2: Split View */}
                            {storyImages.length === 2 && (
                                <div className="grid grid-cols-2 gap-2 h-full">
                                    <img src={storyImages[0]} alt="1" className="w-full h-full object-cover rounded-l-xl" />
                                    <img src={storyImages[1]} alt="2" className="w-full h-full object-cover rounded-r-xl" />
                                </div>
                            )}

                            {/* Case 3: 1 Main + 2 Stacked */}
                            {storyImages.length === 3 && (
                                <div className="grid grid-cols-2 gap-2 h-full">
                                    <img src={storyImages[0]} alt="Main" className="w-full h-full object-cover rounded-l-xl" />
                                    <div className="grid grid-rows-2 gap-2 h-full">
                                        <img src={storyImages[1]} alt="2" className="w-full h-full object-cover rounded-tr-xl" />
                                        <img src={storyImages[2]} alt="3" className="w-full h-full object-cover rounded-br-xl" />
                                    </div>
                                </div>
                            )}

                            {/* Case 4: Airbnb Grid (1 Main + 4 Grid) */}
                            {storyImages.length >= 4 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-2 gap-2 h-full">
                                    {/* Main Image (Spans 2x2) */}
                                    <div className="col-span-2 row-span-2 relative">
                                        <img src={storyImages[0]} alt="Main" className="w-full h-full object-cover rounded-l-xl" />
                                    </div>
                                    {/* Grid Images */}
                                    <img src={storyImages[1]} alt="2" className="w-full h-full object-cover hidden md:block" />
                                    <img src={storyImages[2]} alt="3" className="w-full h-full object-cover rounded-tr-xl hidden md:block" />
                                    <img src={storyImages[3]} alt="4" className="w-full h-full object-cover hidden md:block" />
                                    <div className="relative hidden md:block">
                                        <img src={storyImages[4] || storyImages[1]} alt="5" className="w-full h-full object-cover rounded-br-xl" />
                                        {storyImages.length > 5 && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-br-xl">
                                                <span className="text-white font-bold text-lg">+{storyImages.length - 5} photos</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Owner Upload Button (Floating) */}
                    {isClaimedByYou && (
                        <div className="absolute bottom-6 right-6 z-20">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="flex items-center gap-2 px-6 py-3 bg-stone-900 text-white rounded-full shadow-xl hover:scale-105 transition font-semibold"
                            >
                                <Camera size={18} />
                                {uploading ? 'Uploading...' : 'Add Photos'}
                            </button>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleUpload} />
                        </div>
                    )}
                </div>

                {/* RIGHT: Content Column */}
                <div className="w-full md:w-[40%] h-full overflow-y-auto border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
                    <div className="p-8 pb-32 space-y-8">

                        {/* Header */}
                        <div>
                            <h1 className="text-4xl font-bold text-stone-900 dark:text-stone-100 tracking-tight mb-2">
                                {shop.house_number} {shop.street}
                            </h1>
                            <div className="flex items-center gap-3 mb-6">
                                <span className="px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-sm font-medium">
                                    {shop.postcode}
                                </span>
                                {isClaimedByYou && (
                                    <span className="flex items-center gap-1 text-teal-600 font-bold text-sm">
                                        <Star size={14} className="fill-teal-600" /> Verified Owner
                                    </span>
                                )}
                            </div>

                            {/* Price Block */}
                            <div className="flex items-baseline gap-2 pb-6 border-b border-stone-100">
                                {shop.last_sale_price ? (
                                    <>
                                        <span className="text-2xl font-bold text-stone-900">{fmtPrice(shop.last_sale_price)}</span>
                                        <span className="text-stone-400 text-sm">Last sold {shop.last_sale_date?.split('-')[0]}</span>
                                    </>
                                ) : (
                                    <span className="text-stone-400 italic">Price history unavailable</span>
                                )}
                            </div>
                        </div>

                        {/* Story */}
                        {localHomeStory?.summary_text ? (
                            <div className="prose prose-stone">
                                <p className="text-lg leading-relaxed text-stone-700">{localHomeStory.summary_text}</p>
                            </div>
                        ) : (
                            <div className="p-6 bg-stone-50 rounded-xl text-center border border-dashed border-stone-200">
                                <p className="text-stone-400 text-sm">Owner hasn't written a story yet.</p>
                            </div>
                        )}

                        {/* Facts & Stats (Reusing Logic) */}
                        <ShopDetailClient
                            shopId={shop.id}
                            shop={shop}
                            votes={shop.votes || { quality_score: 0, bitcoin_verified_score: 0, total_votes: 0 }}
                            currentUser={currentUser}
                        />

                        {/* Map Context */}
                        <div className="h-48 rounded-2xl overflow-hidden border border-stone-200">
                            <ShopMap previewProperties={[shop] as any} center={[shop.lat, shop.lon]} zoom={16} />
                        </div>

                    </div>

                    {/* Sticky Action Footer */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-md border-t border-stone-100 flex gap-3">
                        {onMessage && (
                            <button
                                onClick={onMessage}
                                className="flex-1 py-4 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition shadow-lg flex justify-center items-center gap-2"
                            >
                                <MessageCircle size={18} />
                                {isClaimedByYou ? 'View Inbox' : (claimRecord ? 'Message Owner' : 'Leave Note')}
                            </button>
                        )}
                        <button className="p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition text-stone-600">
                            <Share2 size={20} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}