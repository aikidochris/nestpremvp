'use client'

import React, { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { Users, Home, MessageSquare, Heart, Search, EyeOff, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AdminStats {
    total_users: number
    total_claims: number
    total_follows: number
    total_conversations: number
    intent_breakdown: {
        for_sale: number
        for_rent: number
        soft_listing: number
    }
    recent_activity: any[]
    ghost_searches: { query: string; found_count: number; created_at: string }[]
}

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [loading, setLoading] = useState(true)
    const supabase = getSupabaseClient()
    const router = useRouter()

    useEffect(() => {
        const fetchStats = async () => {
            // Check auth (Basic client-side check)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // router.push('/') // Uncomment to enforce auth
                // return
            }

            const { data, error } = await supabase.rpc('get_admin_stats')
            if (error) {
                console.error('Error fetching admin stats:', error)
            } else {
                setStats(data as AdminStats)
            }
            setLoading(false)
        }

        fetchStats()
    }, [supabase, router])

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-400">
                Loading God View...
            </div>
        )
    }

    if (!stats) return null

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">God View</h1>
                        <p className="text-slate-500">Real-time market health & demand signals</p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-sm font-medium text-slate-600">
                        {new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}
                    </div>
                </header>

                {/* 1. Growth Stats */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
                    <StatCard
                        icon={<Users className="text-blue-500" />}
                        label="Total Users"
                        value={stats.total_users}
                        trend="+12%"
                    />
                    <StatCard
                        icon={<Home className="text-emerald-500" />}
                        label="Claims (Supply)"
                        value={stats.total_claims}
                        trend="+5%"
                    />
                    <StatCard
                        icon={<Heart className="text-pink-500" />}
                        label="Follows (Demand)"
                        value={stats.total_follows}
                        trend="+24%"
                    />
                    <StatCard
                        icon={<MessageSquare className="text-indigo-500" />}
                        label="Conversations"
                        value={stats.total_conversations}
                        trend="+8%"
                    />
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    {/* 2. Market Breakdown (Chart-ish) */}
                    <div className="col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                        <h3 className="flex items-center gap-2 mb-6 font-semibold text-slate-800">
                            <TrendingUp size={20} className="text-slate-400" />
                            Market Intent Breakdown
                        </h3>

                        <div className="space-y-6">
                            <BarRow
                                label="For Sale (Active Supply)"
                                count={stats.intent_breakdown.for_sale}
                                color="bg-red-500"
                                total={stats.total_users || 100} // rough scale
                            />
                            <BarRow
                                label="For Rent"
                                count={stats.intent_breakdown.for_rent}
                                color="bg-orange-500"
                                total={stats.total_users || 100}
                            />
                            <BarRow
                                label="Soft Listing (Hidden Supply)"
                                count={stats.intent_breakdown.soft_listing}
                                color="bg-teal-500"
                                total={stats.total_users || 100}
                            />
                        </div>

                        <div className="mt-8 p-4 bg-slate-50 rounded-xl">
                            <h4 className="text-sm font-medium text-slate-700 mb-4">Recent Activity Feed</h4>
                            <div className="space-y-3">
                                {stats.recent_activity.map((act, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        <span className="text-xs text-slate-400 w-24">{new Date(act.created_at).toLocaleTimeString()}</span>
                                        <Badge type={act.type} />
                                        <span className="text-slate-600 truncate">Property {act.id.slice(0, 8)}...</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 3. Ghost Search Feed */}
                    <div className="col-span-1 rounded-2xl bg-white p-6 shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <EyeOff size={100} />
                        </div>
                        <h3 className="flex items-center gap-2 mb-6 font-semibold text-slate-800 relative z-10">
                            <Search size={20} className="text-slate-400" />
                            Ghost Searches (0 Results)
                        </h3>

                        <div className="relative z-10 space-y-4">
                            {stats.ghost_searches.length === 0 ? (
                                <p className="text-slate-400 italic text-sm">No failed searches yet.</p>
                            ) : (
                                stats.ghost_searches.map((s, i) => (
                                    <div key={i} className="flex flex-col gap-1 p-3 rounded-lg bg-red-50 border border-red-100/50">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-800 text-sm">"{s.query}"</span>
                                            <span className="text-[10px] text-red-400 font-medium">0 Res</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400">
                                            {new Date(s.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, trend }: any) {
    return (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-xl bg-slate-50">{icon}</div>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {trend}
                </span>
            </div>
            <div className="text-3xl font-bold text-slate-900 mb-1">{value.toLocaleString()}</div>
            <div className="text-sm text-slate-500">{label}</div>
        </div>
    )
}

function BarRow({ label, count, color, total }: any) {
    const pkg = (count / (total || 1)) * 100
    const width = Math.min(Math.max(pkg, 5), 100) + '%'

    return (
        <div>
            <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-slate-700">{label}</span>
                <span className="text-slate-900 font-bold">{count}</span>
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} rounded-full`} style={{ width }} />
            </div>
        </div>
    )
}

function Badge({ type }: { type: string }) {
    if (type === 'claim') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase">Claim</span>
    if (type === 'follow') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-pink-100 text-pink-700 uppercase">Follow</span>
    if (type === 'intent') return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">Update</span>
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">{type}</span>
}
