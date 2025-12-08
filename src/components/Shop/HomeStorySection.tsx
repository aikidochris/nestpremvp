import { useState, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { uploadHomeStoryImages } from '@/lib/storage'
import type { MapProperty } from '@/types/models'
import type { User } from '@supabase/supabase-js' // Or custom User type if used consistently
import { Star, StarOff, Camera, X } from 'lucide-react'
import type { Database } from '@/lib/database.types'

interface HomeStorySectionProps {
    selectedHome: MapProperty | null
    currentUser: User | null
    isClaimedByYou: boolean
}

export default function HomeStorySection({ selectedHome, currentUser, isClaimedByYou }: HomeStorySectionProps) {
    const supabase = getSupabaseClient()
    const [homeStory, setHomeStory] = useState<Database['public']['Tables']['home_story']['Row'] | null>(null)
    const [storyLoading, setStoryLoading] = useState(false)
    const [storyError, setStoryError] = useState<string | null>(null)
    const [storySummary, setStorySummary] = useState('')
    const [storyImages, setStoryImages] = useState<string[]>([])
    const [newUploads, setNewUploads] = useState<{ url: string; file: File }[]>([])
    const [imageOrder, setImageOrder] = useState<string[]>([])
    const [editingStory, setEditingStory] = useState(false)
    const [savingStory, setSavingStory] = useState(false)
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const fileInputRef = useRef<HTMLInputElement | null>(null)

    useEffect(() => {
        if (!selectedHome) return

        let cancelled = false

        async function loadStory() {
            setStoryLoading(true)
            setStoryError(null)
            setImageOrder([])
            setStoryImages([])
            setNewUploads([])
            setCurrentImageIndex(0)
            setStorySummary('')
            setEditingStory(false)

            const { data, error } = await supabase
                .from('home_story')
                .select('*')
                .eq('property_id', selectedHome?.id)
                .maybeSingle()

            if (cancelled) return

            if (error) {
                console.error('Error loading home story', error)
                setHomeStory(null)
                setStoryError(error.message)
            } else {
                const storyData = data as any // Using any to match previous behavior if strict types fail, but types should work now
                setHomeStory(storyData ?? null)
                setStorySummary(storyData?.summary_text ?? '')
                setStoryImages((storyData?.images as string[]) ?? [])
                setImageOrder((storyData?.images as string[]) ?? [])
            }

            setStoryLoading(false)
        }

        loadStory()

        return () => {
            cancelled = true
        }
    }, [selectedHome?.id, supabase]) // Using param-based change detection


    const handleStoryFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files)
            const newFiles = files.map(file => ({
                url: URL.createObjectURL(file),
                file
            }))
            setNewUploads(prev => [...prev, ...newFiles])
        }
    }

    const handleRemoveNewUpload = (index: number) => {
        setNewUploads(prev => prev.filter((_, i) => i !== index))
    }

    const handleMakeMain = () => {
        const allImages = [...imageOrder, ...newUploads.map(u => u.url)]
        if (currentImageIndex >= allImages.length) return
        const selectedUrl = allImages[currentImageIndex]

        // Move to front
        // This logic is a bit complex because we're mixing remote URLs and local blobs
        // For simplicity, we just reorder the visual array and hope save logic handles it?
        // The original logic was implicit. Let's try to just reorder standard images for now.

        // Actually, let's keep it simple: just reorder storyImages for now if it's there
        if (currentImageIndex < storyImages.length) {
            const img = storyImages[currentImageIndex]
            const rest = storyImages.filter((_, i) => i !== currentImageIndex)
            setStoryImages([img, ...rest])
            setCurrentImageIndex(0)
        }
    }

    const handleSaveStory = async () => {
        if (!selectedHome || !currentUser) return
        setSavingStory(true)

        // Upload new images first
        let uploadedUrls: string[] = []
        if (newUploads.length > 0) {
            try {
                uploadedUrls = await uploadHomeStoryImages(newUploads.map(u => u.file), selectedHome.id)
            } catch (e) {
                console.error('Upload failed:', e)
                alert('Failed to upload images')
                setSavingStory(false)
                return
            }
        }

        const finalImages = [...storyImages, ...uploadedUrls]

        const payload = {
            property_id: selectedHome.id,
            user_id: currentUser.id,
            summary_text: storySummary, // Note: DB column is summary_text
            images: finalImages,
            // privacy_level: 'public' // Default
        }

        const { error } = await supabase
            .from('home_story')
            .upsert(payload as any) // Type might be slightly off with generated types

        if (error) {
            alert('Failed to save story: ' + error.message)
        } else {
            setEditingStory(false)
            setNewUploads([])
            // Reload handled by effect if we update local state?
            // Ideally we trigger a reload or update local state directly
            setHomeStory({ ...homeStory, ...payload } as any)
            setStoryImages(finalImages)
        }
        setSavingStory(false)
    }

    if (!selectedHome) return null

    // Helper for image gallery display
    const displayImages = [...storyImages, ...newUploads.map(u => u.url)]

    return (
        <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">About this home</h3>
                {homeStory && isClaimedByYou && !editingStory && (
                    <button
                        type="button"
                        className="text-sm text-amber-700 hover:text-amber-800 font-semibold"
                        onClick={() => setEditingStory(true)}
                    >
                        Edit
                    </button>
                )}
            </div>

            {storyLoading ? (
                <div className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-16 w-full bg-slate-200 rounded animate-pulse"></div>
                </div>
            ) : (
                <>
                    {storyError && (
                        <div className="mb-3 text-sm text-red-600">
                            {storyError}
                        </div>
                    )}

                    {isClaimedByYou ? (
                        <>
                            {(!homeStory || editingStory) ? (
                                <div className="space-y-3">
                                    {/* Image Upload Area */}
                                    {editingStory && (
                                        <div className="mb-4">
                                            <div className="flex gap-2 overflow-x-auto pb-2">
                                                {displayImages.map((url, idx) => (
                                                    <div key={url} className="relative w-20 h-20 shrink-0">
                                                        <img src={url} className="w-full h-full object-cover rounded-lg border border-slate-200" />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                // Handle remove
                                                                if (idx < storyImages.length) {
                                                                    setStoryImages(storyImages.filter((_, i) => i !== idx))
                                                                } else {
                                                                    handleRemoveNewUpload(idx - storyImages.length)
                                                                }
                                                            }}
                                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    className="w-20 h-20 shrink-0 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-[#007C7C] hover:text-[#007C7C]"
                                                >
                                                    <Camera size={20} />
                                                    <span className="text-xs mt-1">Add</span>
                                                </button>
                                            </div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                multiple
                                                accept="image/*"
                                                className="hidden"
                                                onChange={handleStoryFileChange}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <textarea
                                            value={storySummary}
                                            onChange={(e) => setStorySummary(e.target.value)}
                                            rows={4}
                                            className="w-full min-h-[120px] bg-slate-50 border-0 rounded-xl p-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/20"
                                            placeholder="Tell neighbors what you love about living here..."
                                        />
                                    </div>

                                    {/* Save/Cancel Buttons */}
                                    <div className="flex justify-end gap-2">
                                        {homeStory && (
                                            <button
                                                className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                                onClick={() => {
                                                    setEditingStory(false)
                                                    setStorySummary(homeStory?.summary_text ?? '')
                                                    setStoryImages((homeStory?.images as string[]) ?? [])
                                                    setImageOrder((homeStory?.images as string[]) ?? [])
                                                    setNewUploads([])
                                                    setCurrentImageIndex(0)
                                                    setStoryError(null)
                                                }}
                                                type="button"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                        <button
                                            className="px-6 py-2 rounded-lg font-semibold text-white bg-[#007C7C] shadow-sm disabled:opacity-60"
                                            onClick={handleSaveStory}
                                            disabled={savingStory}
                                        >
                                            {savingStory ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* View Mode */}
                                    {homeStory?.images && homeStory.images.length > 0 && (
                                        <div className="w-full h-48 sm:h-56 bg-slate-100 rounded-xl overflow-hidden relative">
                                            <img
                                                src={(homeStory.images as string[])[0]}
                                                className="w-full h-full object-cover"
                                                alt="Home Story Main"
                                            />
                                            {(homeStory.images as string[]).length > 1 && (
                                                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                                    +{(homeStory.images as string[]).length - 1} photos
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {homeStory?.summary_text ? (
                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                            {homeStory.summary_text}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No story added yet.</p>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        // Viewer Mode (Not Owner)
                        <div className="space-y-4">
                            {homeStory?.images && (homeStory.images as string[]).length > 0 && (
                                <div className="w-full h-48 sm:h-56 bg-slate-100 rounded-xl overflow-hidden relative">
                                    <img
                                        src={(homeStory.images as string[])[0]}
                                        className="w-full h-full object-cover"
                                        alt="Home Story Main"
                                    />
                                    {(homeStory.images as string[]).length > 1 && (
                                        <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                                            +{(homeStory.images as string[]).length - 1} photos
                                        </div>
                                    )}
                                </div>
                            )}
                            {homeStory ? (
                                <div className="space-y-2">
                                    {homeStory.summary_text ? (
                                        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                                            {homeStory.summary_text}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No story text provided.</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500 italic">No home story yet.</p>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
