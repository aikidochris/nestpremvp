'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabaseClient'

interface FlagModalProps {
    isOpen: boolean
    onClose: () => void
    propertyId: string
    userId?: string | null
}

const FLAG_REASONS = [
    { value: 'incorrect_info', label: 'Incorrect Information', placeholder: 'Please tell us what is wrong (e.g., wrong price, address, bedrooms)...' },
    { value: 'not_residential', label: 'Not a Residential Home', placeholder: 'Describe what type of property this is...' },
    { value: 'spam_offensive', label: 'Spam / Offensive Content', placeholder: 'Describe the offensive content...' },
    { value: 'duplicate', label: 'Duplicate Listing', placeholder: 'Link or describe the duplicate listing...' },
    { value: 'other', label: 'Other', placeholder: 'Please explain the issue...' },
] as const

export default function FlagModal({ isOpen, onClose, propertyId, userId }: FlagModalProps) {
    const supabase = getSupabaseClient()
    const [reason, setReason] = useState<string>('')
    const [details, setDetails] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const selectedReason = FLAG_REASONS.find(r => r.value === reason)
    const isDetailsRequired = reason === 'incorrect_info'

    const handleSubmit = async () => {
        if (!reason) {
            setError('Please select a reason')
            return
        }
        if (isDetailsRequired && !details.trim()) {
            setError('Please provide details about what is incorrect')
            return
        }

        setSubmitting(true)
        setError(null)

        const { error: insertError } = await supabase
            .from('property_flags')
            .insert({
                property_id: propertyId,
                user_id: userId || null,
                reason: selectedReason?.label || reason,
                details: details.trim() || null,
            })

        setSubmitting(false)

        if (insertError) {
            if (insertError.message.includes('unique_flag_per_user_prop')) {
                setError('You have already flagged this property')
            } else {
                setError('Failed to submit report. Please try again.')
            }
            return
        }

        // Success
        onClose()
        setReason('')
        setDetails('')
        alert('Report submitted. Thanks for helping Nest!')
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 m-4 animate-in zoom-in-95">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={20} />
                        <h2 className="text-lg font-semibold text-slate-900">Report this Property</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-full transition"
                    >
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Reason Selection */}
                <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-slate-700">What's the issue?</p>
                    {FLAG_REASONS.map((r) => (
                        <label
                            key={r.value}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${reason === r.value
                                    ? 'border-teal-500 bg-teal-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <input
                                type="radio"
                                name="reason"
                                value={r.value}
                                checked={reason === r.value}
                                onChange={(e) => setReason(e.target.value)}
                                className="accent-teal-600"
                            />
                            <span className="text-sm text-slate-700">{r.label}</span>
                        </label>
                    ))}
                </div>

                {/* Details Textarea */}
                {reason && (
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Details {isDetailsRequired && <span className="text-rose-500">*</span>}
                        </label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder={selectedReason?.placeholder || 'Additional details...'}
                            rows={3}
                            className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                        />
                    </div>
                )}

                {/* Error */}
                {error && (
                    <p className="text-sm text-rose-600 mb-4">{error}</p>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || !reason}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                </div>
            </div>
        </div>
    )
}
