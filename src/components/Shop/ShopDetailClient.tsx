'use client'

import { useState } from 'react'
import VoteButton from '@/components/Voting/VoteButton'
import CommentForm from '@/components/Comments/CommentForm'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, History, Home, Zap, TrendingUp } from 'lucide-react'

interface ShopDetailClientProps {
  shopId: string
  shop: {
    last_sale_price?: number | null
    last_sale_date?: string | null
    energy_rating?: string | null
    epc_floor_area?: number | null
    epc_property_type?: string | null
    [key: string]: any
  }
  votes: {
    quality_score: number
    bitcoin_verified_score: number
    total_votes: number
  }
}

function PropertyInsights({ property }: { property: any }) {
  const [isOpen, setIsOpen] = useState(false)

  // Format Price: £350,000
  const fmtPrice = (p: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(p)

  // Format Date: "Nov 2021"
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })

  return (
    <div className="mt-6 mb-8 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
      {/* Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg text-teal-600 dark:text-teal-400">
            <TrendingUp size={20} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Property History & Insights</h3>
            <p className="text-xs text-slate-500">
              {property.last_sale_price
                ? `Last sold for ${fmtPrice(property.last_sale_price)}`
                : 'View market history and specs'}
            </p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 duration-200">

          {/* Left Column: Timeline */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <History size={14} /> Transaction History
            </h4>
            <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-2 pl-6 py-1 space-y-6">
              <div className="relative">
                <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-teal-500 ring-4 ring-white dark:ring-slate-900" />
                <p className="text-sm font-medium text-slate-900 dark:text-slate-200">Nest Market Value</p>
                <p className="text-xs text-slate-500">Tracking live interest</p>
              </div>

              <div className="relative">
                <div className="absolute -left-[29px] top-1.5 w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-700" />
                {property.last_sale_price ? (
                  <>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{fmtPrice(property.last_sale_price)}</p>
                    <p className="text-xs text-slate-500">Sold on {fmtDate(property.last_sale_date)}</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 italic">No previous sales recorded</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Stats */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
              <Home size={14} /> Building Specs
            </h4>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Type</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-200 capitalize">
                  {property.epc_property_type || 'Residential'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Floor Area</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-200">
                  {property.epc_floor_area ? `${property.epc_floor_area} sq m` : 'Unknown'}
                </span>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-500">
                  <Zap size={14} className="text-yellow-500" />
                  <span className="text-sm">Energy Rating</span>
                </div>
                {property.energy_rating ? (
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold text-white
                    ${['A', 'B'].includes(property.energy_rating) ? 'bg-emerald-500' : ''}
                    ${['C', 'D'].includes(property.energy_rating) ? 'bg-yellow-500' : ''}
                    ${['E', 'F', 'G'].includes(property.energy_rating) ? 'bg-orange-500' : ''}
                  `}>
                    {property.energy_rating}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">N/A</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ShopDetailClient({ shopId, votes, shop }: ShopDetailClientProps) {
  const router = useRouter()
  return (
    <>
      <PropertyInsights property={shop} />
      <div className="glass-effect rounded-2xl shadow-lg p-6 border border-stone-200 dark:border-stone-800 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">⭐</span>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Community Rating</h3>
        </div>
        <VoteButton shopId={shopId} voteType="shop_quality" initialScore={votes.quality_score} label="Home Quality" />
        <div className="h-2" />
        <VoteButton shopId={shopId} voteType="bitcoin_verified" initialScore={votes.bitcoin_verified_score} label="Location Verified" />
      </div>
      <div className="glass-effect rounded-2xl shadow-lg p-6 border border-stone-200 dark:border-stone-800">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">✍️</span>
          <h3 className="text-xl font-bold text-stone-900 dark:text-stone-100">Leave a Comment</h3>
        </div>
        <CommentForm shopId={shopId} onCommentAdded={() => router.refresh()} />
      </div>
    </>
  )
}