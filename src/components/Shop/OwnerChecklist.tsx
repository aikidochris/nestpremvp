'use client'

import { CheckCircle2, Circle, Camera, Tag, Home as HomeIcon, FileText } from 'lucide-react'

interface OwnerChecklistProps {
    hasPhoto: boolean
    hasFacts: boolean
    hasStatusSet: boolean // true only if user explicitly clicked a status card
    onAddPhotoClick: () => void
    onVerifyFactsClick: () => void
    onSetStatusClick: () => void
}

const CHECKLIST_ITEMS = [
    { key: 'claim', label: 'Claim Home', icon: HomeIcon, percent: 25 },
    { key: 'photo', label: 'Add a Photo', icon: Camera, percent: 25 },
    { key: 'facts', label: 'Verify Facts', icon: FileText, percent: 25 },
    { key: 'status', label: 'Set Intent', icon: Tag, percent: 25 },
]

export default function OwnerChecklist({
    hasPhoto,
    hasFacts,
    hasStatusSet,
    onAddPhotoClick,
    onVerifyFactsClick,
    onSetStatusClick,
}: OwnerChecklistProps) {
    // Calculate completion
    // 1. Claim is always done if they see this
    const claimDone = true
    const photoDone = hasPhoto
    const factsDone = hasFacts
    const statusDone = hasStatusSet

    const completedCount = [claimDone, photoDone, factsDone, statusDone].filter(Boolean).length
    const totalCount = 4
    const percentage = Math.round((completedCount / totalCount) * 100)

    // If all done, don't show checklist
    // if (completedCount === totalCount) return null 
    // KEEP IT VISIBLE FOR NOW TO SHOW 100% STATE OR ANIMATION?
    // Actually standard is to hide if 100%, but for testing gamification let's hide only if truly done
    if (percentage === 100) return null

    const getItemState = (key: string) => {
        switch (key) {
            case 'claim': return claimDone
            case 'photo': return photoDone
            case 'facts': return factsDone
            case 'status': return statusDone
            default: return false
        }
    }

    const handleItemClick = (key: string) => {
        switch (key) {
            case 'photo':
                if (!photoDone) onAddPhotoClick()
                break
            case 'facts':
                if (!factsDone) onVerifyFactsClick() // Scroll to facts editor
                break
            case 'status':
                if (!statusDone) onSetStatusClick() // Scroll to status cards
                break
        }
    }

    return (
        <div className="mb-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div>
                    <p className="text-sm font-semibold text-amber-900">Profile Strength</p>
                    <p className="text-xs text-amber-700">Complete your home profile</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-amber-700">{percentage}%</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full rounded-full bg-amber-200/50 overflow-hidden mb-4">
                <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* Checklist Items */}
            <div className="space-y-2">
                {CHECKLIST_ITEMS.map((item) => {
                    const done = getItemState(item.key)
                    const isClickable = !done && item.key !== 'claim'
                    const IconComponent = item.icon

                    return (
                        <button
                            key={item.key}
                            type="button"
                            disabled={done || item.key === 'claim'}
                            onClick={() => handleItemClick(item.key)}
                            className={`
                w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all text-sm
                ${done
                                    ? 'bg-emerald-100/50 text-emerald-700 cursor-default'
                                    : isClickable
                                        ? 'bg-white/60 hover:bg-white text-amber-800 cursor-pointer hover:shadow-sm'
                                        : 'bg-slate-100/50 text-slate-500 cursor-default'
                                }
              `}
                        >
                            {done ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                            ) : (
                                <Circle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                            )}
                            <IconComponent className="h-4 w-4 flex-shrink-0" />
                            <span className="flex-1 font-medium">{item.label}</span>
                            {!done && (
                                <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                                    +25%
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
