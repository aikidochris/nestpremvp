'use client'

import { useState } from 'react'
import { Send, ImagePlus, Lock } from 'lucide-react'
import { MessageThread } from '@/types/social'

interface CardMessagingProps {
    thread?: MessageThread | null
    onSendMessage?: (text: string) => Promise<void>
    onRequestPhotos?: () => void
}

export default function CardMessaging({
    thread,
    onSendMessage,
    onRequestPhotos
}: CardMessagingProps) {
    const [inputText, setInputText] = useState('')

    if (!thread) return null

    const isLocked = thread.state === 'locked'
    const isTalking = thread.state === 'talking'

    return (
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-4">
            {isLocked ? (
                <div className="flex flex-col items-center justify-center p-4 text-slate-400">
                    <Lock size={20} className="mb-2" />
                    <p className="text-xs font-semibold">Conversation Settled</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Chat History Placeholder */}
                    <div className="min-h-[100px] bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 text-xs text-slate-400 flex items-center justify-center">
                        <span>Start of your conversation</span>
                    </div>

                    {/* Actions */}
                    {isTalking && onRequestPhotos && (
                        <button
                            onClick={onRequestPhotos}
                            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                        >
                            <ImagePlus size={14} />
                            Request Photos
                        </button>
                    )}

                    {/* Input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Type a message..."
                            className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ring-indigo-500/20"
                        />
                        <button
                            disabled={!inputText.trim()}
                            className="p-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 hover:bg-indigo-700 transition"
                            onClick={() => {
                                if (onSendMessage) {
                                    onSendMessage(inputText)
                                    setInputText('')
                                }
                            }}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
