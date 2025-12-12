'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Camera, X, Send, Loader2 } from 'lucide-react'
import { CardMode } from '@/types/social'
import type { MapProperty } from '@/types/models'

interface CardHeroProps {
    mode: CardMode
    property: MapProperty
    heroImage?: string | null
    onClose: () => void
    onUploadPhoto?: () => void
    onSendNote?: (note: string) => Promise<void>
}

export default function CardHero({
    mode,
    property,
    heroImage,
    onClose,
    onUploadPhoto,
    onSendNote
}: CardHeroProps) {
    const [isNoteOpen, setIsNoteOpen] = useState(false)
    const [noteContent, setNoteContent] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [noteSent, setNoteSent] = useState(false)

    // Handlers
    const handleNoteSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!noteContent.trim() || !onSendNote) return

        setIsSending(true)
        await onSendNote(noteContent)
        setIsSending(false)
        setNoteSent(true)
        setTimeout(() => {
            setNoteSent(false)
            setIsNoteOpen(false)
            setNoteContent('')
        }, 2000)
    }

    const hasPhoto = !!(heroImage || property.image_url || property.market_image_url)

    return (
        <div className="relative h-56 shrink-0 bg-slate-100 dark:bg-slate-800 group overflow-hidden">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white backdrop-blur-md transition-colors"
            >
                <X size={18} />
            </button>

            {/* --- UNCLAIMED MODE --- */}
            {mode === 'unclaimed' && (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-200 dark:bg-slate-800 relative">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover bg-center grayscale" />

                    <AnimatePresence mode="wait">
                        {!isNoteOpen ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="z-10 flex flex-col items-center gap-3"
                            >
                                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur px-4 py-2 rounded-full border border-white/50 shadow-sm flex items-center gap-2">
                                    <MapPin size={16} className="text-slate-400" />
                                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Unclaimed Property</span>
                                </div>

                                {onSendNote && (
                                    <button
                                        onClick={() => setIsNoteOpen(true)}
                                        className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition px-6 shadow-lg"
                                    >
                                        Leave a Note
                                    </button>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="z-20 w-full max-w-[85%] bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-3"
                            >
                                {!noteSent ? (
                                    <form onSubmit={handleNoteSubmit} className="flex gap-2">
                                        <input
                                            autoFocus
                                            type="text"
                                            value={noteContent}
                                            onChange={(e) => setNoteContent(e.target.value)}
                                            placeholder="I'm interested in this home..."
                                            className="flex-1 bg-transparent text-sm outline-none text-slate-800 dark:text-slate-200"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isSending || !noteContent.trim()}
                                            className="p-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50"
                                        >
                                            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        </button>
                                    </form>
                                ) : (
                                    <div className="flex items-center justify-center gap-2 text-emerald-600 font-medium text-sm py-1">
                                        <span>Note sent. Waiting for owner.</span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* --- OWNER MODE --- */}
            {mode === 'owner' && (
                <div
                    className={`w-full h-full flex flex-col items-center justify-center cursor-pointer ${!hasPhoto ? 'bg-gradient-to-br from-teal-400 to-blue-500' : ''}`}
                    onClick={onUploadPhoto}
                >
                    {!hasPhoto ? (
                        <>
                            <Camera size={32} className="text-white/80 mb-2" />
                            <span className="text-white font-bold text-sm bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                                Add a Photo
                            </span>
                        </>
                    ) : (
                        <>
                            <img
                                src={heroImage || property.image_url || property.market_image_url || ''}
                                alt="Home"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute bottom-3 right-3">
                                <button className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-colors">
                                    <Camera size={16} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* --- NEIGHBOR / BUYER / PUBLIC MODE --- */}
            {(mode === 'neighbor' || mode === 'buyer') && (
                <div className="w-full h-full relative">
                    <img
                        src={heroImage || property.image_url || property.market_image_url || 'https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80'}
                        alt="Home"
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                    <div className="absolute bottom-4 left-4">
                        <button className="px-3 py-1.5 bg-white/20 backdrop-blur-md border border-white/40 rounded-lg text-white text-xs font-bold hover:bg-white/30 transition">
                            View Gallery
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
