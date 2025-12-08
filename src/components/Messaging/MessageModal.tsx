import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import type { MapProperty } from '@/types/models'
import type { User } from '@supabase/supabase-js'

type MessageMode = 'direct' | 'note' | 'future'

interface MessageModalProps {
    isOpen: boolean
    onClose: () => void
    selectedHome: MapProperty
    currentUser: User | null
    intentFlags: {
        sale: boolean
        rent: boolean
        open: boolean
    }
    initialMode?: MessageMode
}

export default function MessageModal({ isOpen, onClose, selectedHome, currentUser, intentFlags, initialMode }: MessageModalProps) {
    const supabase = getSupabaseClient()
    const [messageMode, setMessageMode] = useState<MessageMode>('direct')
    const [messageHeader, setMessageHeader] = useState('Message Owner')
    const [messageSubtext, setMessageSubtext] = useState<string | null>(null)
    const [messageBody, setMessageBody] = useState('')
    const [messageSending, setMessageSending] = useState(false)
    const [messageError, setMessageError] = useState<string | null>(null)
    const [messageSuccess, setMessageSuccess] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen) {
            if (initialMode) {
                setMessageMode(initialMode)
                setMessageHeader(initialMode === 'future'
                    ? 'Leave a note for the future owner'
                    : initialMode === 'direct' ? 'Message Owner' : 'Leave an Interest Note'
                )
                setMessageSubtext(initialMode === 'note'
                    ? 'This owner isn\'t actively looking. We will let them know you are interested, but they may not reply immediately.'
                    : initialMode === 'future'
                        ? 'This home isn\'t claimed yet. We\'ll save your note and notify the owner the moment they join Nest.'
                        : null
                )
            } else {
                const { sale, rent, open } = intentFlags
                const nextMode: MessageMode = sale || rent || open ? 'direct' : 'note'
                setMessageMode(nextMode)
                setMessageHeader(nextMode === 'direct' ? 'Message Owner' : 'Leave an Interest Note')
                setMessageSubtext(nextMode === 'note'
                    ? 'This owner isn\'t actively looking. We will let them know you are interested, but they may not reply immediately.'
                    : null
                )
            }
            setMessageBody('')
            setMessageError(null)
            setMessageSuccess(null)
        }
    }, [isOpen, intentFlags, initialMode])


    const handleSendMessage = async () => {
        if (!currentUser || !selectedHome) return
        setMessageSending(true)
        setMessageError(null)

        try {
            // Enforce rate limit (basic check)
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            const { count: sentCount, error: rateLimitError } = await (supabase as any)
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('sender_id', currentUser.id)
                .gte('created_at', since)

            if (rateLimitError) throw rateLimitError
            if ((sentCount || 0) > 10) {
                throw new Error('You have sent too many messages today. Please try again tomorrow.')
            }

            // Check if conversation exists
            // TODO: Use better logic for threading, simplified for now

            const payload = {
                sender_id: currentUser.id,
                receiver_id: selectedHome.claimed_by_user_id, // Might be null for notes?
                property_id: selectedHome.id,
                body: messageBody,
                status: messageMode === 'note' ? 'pending_request' : 'unread',
                // conversation_id? 
            }

            const { error } = await (supabase as any) // Types missing for messages insert currently in strict mode
                .from('messages')
                .insert(payload)

            if (error) throw error

            setMessageSuccess('Message sent successfully!')
            setTimeout(() => {
                onClose()
            }, 1500)

        } catch (e: any) {
            console.error('Send error:', e)
            setMessageError(e.message || 'Failed to send message')
        } finally {
            setMessageSending(false)
        }
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
                <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
                    <div className="flex items-start justify-between border-b border-slate-200 p-4">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">{messageHeader}</h3>
                            {messageSubtext && (
                                <p className="mt-1 text-xs text-slate-500">{messageSubtext}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                            onClick={onClose}
                            aria-label="Close message modal"
                        >
                            &times;
                        </button>
                    </div>

                    {!messageSuccess ? (
                        <div className="p-4 space-y-3">
                            <textarea
                                className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:border-[#007C7C] focus:outline-none focus:ring-2 focus:ring-[#007C7C]/20"
                                rows={4}
                                placeholder={
                                    messageMode === 'direct'
                                        ? 'Write a message to the owner...'
                                        : messageMode === 'future'
                                            ? 'Leave a note for the future owner...'
                                            : 'Tell the owner you are interested...'
                                }
                                value={messageBody}
                                onChange={(e) => setMessageBody(e.target.value)}
                            />
                            {messageError && (
                                <p className="text-xs text-red-600">{messageError}</p>
                            )}
                            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 mt-2">
                                <button
                                    type="button"
                                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                    onClick={onClose}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="rounded-lg bg-[#007C7C] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#006868] disabled:opacity-60"
                                    onClick={handleSendMessage}
                                    disabled={messageSending || !messageBody.trim()}
                                >
                                    {messageSending
                                        ? 'Sending...'
                                        : messageMode === 'direct'
                                            ? 'Send message'
                                            : 'Send note'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
                                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Sent!</h3>
                            <p className="text-sm text-gray-500 mt-2">Your message has been delivered.</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
