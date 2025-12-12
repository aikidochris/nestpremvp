'use client'

import { MessageCircle, Home, PoundSterling, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

interface IntentControlsProps {
    intent: {
        is_open_to_talking: boolean
        is_for_sale: boolean
        is_for_rent: boolean
        is_claimed: boolean
    }
    onIntentChange: (key: string, value: boolean) => void
    isGhosted?: boolean // Visual state: white/ghosted until clicked
}

export default function IntentControls({ intent, onIntentChange, isGhosted = false }: IntentControlsProps) {

    // Derived state: Settled is true if no active intent flags
    const isSettled = !intent.is_open_to_talking && !intent.is_for_sale && !intent.is_for_rent

    const options = [
        {
            key: 'settled',
            label: 'Settled',
            icon: CheckCircle2,
            activeColor: 'bg-slate-800 text-white',
            inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50',
            isActive: isSettled
        },
        {
            key: 'open_to_talking',
            label: 'Open to Chat',
            icon: MessageCircle,
            activeColor: 'bg-teal-500 text-white',
            inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50',
            isActive: intent.is_open_to_talking
        },
        {
            key: 'for_sale',
            label: 'For Sale',
            icon: PoundSterling,
            activeColor: 'bg-rose-500 text-white',
            inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50',
            isActive: intent.is_for_sale
        },
        {
            key: 'for_rent',
            label: 'For Rent',
            icon: Home,
            activeColor: 'bg-indigo-500 text-white',
            inactiveColor: 'bg-white text-slate-600 hover:bg-slate-50',
            isActive: intent.is_for_rent
        }
    ]

    const handleOptionClick = (key: string, isActive: boolean) => {
        if (key === 'settled') {
            // Selecting "Settled" turns off everything else (handled by onIntentChange logic usually, 
            // but we pass false to notify parent to switch to settled)
            onIntentChange('settled', true)
        } else {
            // Toggling others
            onIntentChange(key, !isActive)
        }
    }

    return (
        <div className={clsx("grid grid-cols-2 gap-2", isGhosted && "opacity-75 hover:opacity-100 transition-opacity")}>
            {options.map((opt) => {
                const Icon = opt.icon
                return (
                    <button
                        key={opt.key}
                        onClick={() => handleOptionClick(opt.key, opt.isActive)}
                        className={clsx(
                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 shadow-sm min-h-[80px]",
                            opt.isActive
                                ? `${opt.activeColor} border-transparent ring-2 ring-offset-1 ring-offset-white ring-${opt.activeColor.split(' ')[0].replace('bg-', '')}`
                                : `${opt.inactiveColor} border-slate-200`
                        )}
                    >
                        <Icon size={20} className="mb-1.5" />
                        <span className="text-xs font-bold leading-tight text-center">{opt.label}</span>
                    </button>
                )
            })}
        </div>
    )
}
