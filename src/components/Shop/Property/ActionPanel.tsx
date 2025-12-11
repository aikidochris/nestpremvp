'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, MessageCircle, AlertCircle, Home } from 'lucide-react'
import { CardMode } from '@/types/social'
import { getSupabaseClient } from '@/lib/supabaseClient'
import CardMessaging from './CardMessaging'

interface ActionPanelProps {
    mode: CardMode
    isSettled?: boolean
    propertyId?: string
    currentUserId?: string
    ownerId?: string
    onMessageOwner?: () => void
    onLayoutChange?: () => void // Optional callback to help parent re-measure height if needed
    onClaim?: () => void
    onNoteSent?: () => void // New callback to trigger neighbor routing
}

export default function ActionPanel({
    mode,
    isSettled,
    propertyId,
    currentUserId,
    ownerId,
    onMessageOwner,
    onLayoutChange,
    onClaim,
    onNoteSent
}: ActionPanelProps) {
    const [isNoteOpen, setIsNoteOpen] = useState(false)
    const [noteContent, setNoteContent] = useState('')
    const [noteSending, setNoteSending] = useState(false)
    const [noteSent, setNoteSent] = useState(false)

    // Handler for sending a note
    const handleSendNote = async () => {
        if (!noteContent.trim() || !propertyId || !currentUserId) return

        setNoteSending(true)
        const supabase = getSupabaseClient()

        const { error } = await supabase
            .from('unclaimed_notes')
            .insert({
                property_id: propertyId,
                sender_user_id: currentUserId,
                message: noteContent
            })

        setNoteSending(false)

        if (!error) {
            setNoteSent(true)
            onNoteSent?.() // Trigger neighbor routing
            setTimeout(() => {
                setIsNoteOpen(false)
                setNoteSent(false)
                setNoteContent('')
            }, 3000)
        } else {
            alert('Failed to send note. Please try again.')
        }
    }

    // 1. Unclaimed Mode: "Leave a Friendly Note"
    if (mode === 'unclaimed') {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <AnimatePresence mode="wait">
                    {!isNoteOpen ? (
                        <div className="space-y-4 pt-2">
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                onClick={() => {
                                    setIsNoteOpen(true)
                                    onLayoutChange?.()
                                }}
                                className="w-full py-3.5 bg-teal-600 text-white rounded-xl shadow-md hover:shadow-lg hover:bg-teal-700 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <Send size={18} /> Leave a Friendly Note
                            </motion.button>

                            {onClaim && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="text-center pt-2"
                                >
                                    <button
                                        onClick={onClaim}
                                        className="text-xs text-slate-400 hover:text-slate-600 underline decoration-slate-300 underline-offset-2 transition-colors flex items-center justify-center gap-1.5 mx-auto"
                                    >
                                        <Home size={12} />
                                        Is this your home? Claim ownership
                                    </button>
                                </motion.div>
                            )}
                        </div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            onAnimationComplete={onLayoutChange}
                            className="space-y-3"
                        >
                            {!noteSent ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold uppercase text-slate-500">Leaving a note for the future owner</span>
                                        <button
                                            onClick={() => setIsNoteOpen(false)}
                                            className="text-xs text-slate-400 hover:text-slate-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <textarea
                                        autoFocus
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        placeholder="Hi! I'm interested in this home because..."
                                        className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-slate-900 outline-none resize-none h-24"
                                    />
                                    <button
                                        disabled={noteSending || !noteContent.trim()}
                                        onClick={handleSendNote}
                                        className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {noteSending ? 'Sending...' : 'Send Note'}
                                    </button>
                                </>
                            ) : (
                                <div className="py-4 flex flex-col items-center justify-center text-emerald-600 dark:text-emerald-400">
                                    <span className="font-bold text-lg">Note Sent!</span>
                                    <span className="text-xs text-slate-500">It will be waiting for the owner when they join.</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    // 2. Buyer Mode: "Message Owner" or "Settled"
    if (mode === 'buyer' || mode === 'neighbor') {
        if (isSettled) {
            return (
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 text-slate-400 text-sm italic">
                    <AlertCircle size={16} /> Home is settled. Not open to messages.
                </div>
            )
        }

        if (propertyId && ownerId && currentUserId) {
            return (
                <CardMessaging
                    propertyId={propertyId}
                    ownerId={ownerId}
                    currentUserId={currentUserId}
                    isSettled={isSettled}
                />
            )
        }

        // Fallback if data missing
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-400">
                Sign in to message owner.
            </div>
        )
    }

    // 3. Owner Mode (Can be extended later)
    if (mode === 'owner') {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                <span className="text-sm text-slate-500">You own this property. Manage it above.</span>
            </div>
        )
    }

    return null
}
