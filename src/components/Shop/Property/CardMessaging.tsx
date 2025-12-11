'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Image as ImageIcon, MessageCircle } from 'lucide-react'
import { useMessaging } from '@/hooks/useMessaging'

interface CardMessagingProps {
    propertyId: string
    ownerId: string
    currentUserId: string
    isSettled?: boolean
}

export default function CardMessaging({ propertyId, ownerId, currentUserId, isSettled }: CardMessagingProps) {
    const { thread, messages, isLoading, isSending, startThread, sendMessage } = useMessaging(propertyId, currentUserId)
    const [inputValue, setInputValue] = useState('')
    const [isExpanded, setIsExpanded] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Auto-scroll to bottom of messages
    useEffect(() => {
        if (isExpanded) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, isExpanded])

    const handleSend = async () => {
        if (!inputValue.trim()) return

        if (!thread) {
            await startThread(inputValue, ownerId)
        } else {
            await sendMessage(inputValue)
        }
        setInputValue('')
    }

    if (isLoading) {
        return <div className="p-4 text-center text-xs text-slate-400">Loading chat...</div>
    }

    // Settled View
    if (isSettled) {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-sm italic text-slate-400">This home is settled and not accepting messages.</p>
            </div>
        )
    }

    // Default Collapsed View (Call to Action)
    if (!isExpanded && !thread) {
        return (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => setIsExpanded(true)}
                    className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-lg hover:shadow-xl font-bold flex items-center justify-center gap-2 transition-all transform active:scale-95"
                >
                    <MessageCircle size={18} />
                    Message Owner
                </button>
            </div>
        )
    }

    // Expanded / Active Thread View
    return (
        <div className="flex flex-col h-[400px] border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            {/* Header / Collapse */}
            <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-10">
                <span className="text-xs font-bold uppercase text-slate-500">
                    {thread ? 'Conversation' : 'Start a Conversation'}
                </span>
                <button
                    onClick={() => setIsExpanded(false)}
                    className="text-xs text-slate-400 hover:text-slate-600 px-2"
                >
                    Close
                </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <MessageCircle size={32} className="mb-2" />
                        <p className="text-sm">Say hello to the owner!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${isMe
                                        ? 'bg-slate-900 text-white rounded-br-none'
                                        : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">

                {/* Tools (e.g. Request Photos) */}
                {thread && (
                    <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                            <ImageIcon size={12} /> Request Photos
                        </button>
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-slate-900 dark:focus:ring-white outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button
                        disabled={isSending || !inputValue.trim()}
                        onClick={handleSend}
                        className="p-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl disabled:opacity-50 hover:bg-slate-800 dark:hover:bg-slate-200 transition"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
