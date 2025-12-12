'use client'

import React, { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { Users, Home, MessageSquare, Heart, Search, EyeOff, TrendingUp, Download, Trash2, CheckCircle, XCircle, ShieldAlert, FileText, LayoutGrid } from 'lucide-react'
import { useRouter } from 'next/navigation'

// --- Types ---
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
    daily_signups: { date: string; count: number }[]
    daily_claims: { date: string; count: number }[]
    hotspots: { district: string; active_homes: number; ghost_searches: number }[]
}

interface AdminUser {
    id: string
    email: string
    created_at: string
    display_name: string | null
    role: string
    avatar_url: string | null
}

interface AdminClaim {
    id: string
    property_id: string
    created_at: string
    status: string
    claimant_email: string
    street: string | null
    house_number: string | null
    postcode: string | null
}

interface PropertyFlag {
    id: string
    property_id: string
    user_id: string | null
    reason: string
    details: string | null
    status: string
    created_at: string
}

// --- Main Page Component ---
export default function AdminDashboardPage() {
    const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'claims' | 'flags'>('overview')
    const [stats, setStats] = useState<AdminStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const supabase = getSupabaseClient()
    const router = useRouter()

    useEffect(() => {
        const fetchStats = async () => {
            // Check auth (Basic client-side check)
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // router.push('/')
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

    const downloadCSV = (data: any[], filename: string) => {
        if (!data || data.length === 0) {
            alert("No data to export!")
            return
        }

        // 1. Convert JSON to CSV
        const headers = Object.keys(data[0]).join(",")
        const rows = data.map(row =>
            Object.values(row).map(v =>
                `"${String(v).replace(/"/g, '""')}"` // Escape quotes
            ).join(",")
        ).join("\n")
        const csvContent = `\uFEFF${headers}\n${rows}` // Add BOM for Excel compatibility

        // 2. Create Blob
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = window.URL.createObjectURL(blob)

        // 3. Force Download
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`)
        document.body.appendChild(link)
        link.click()

        // 4. Cleanup
        requestAnimationFrame(() => {
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
        })
    }

    const handleExport = async (type: 'users' | 'claims' | 'missed_searches') => {
        setExporting(true)
        try {
            const { data, error } = await supabase.rpc('get_admin_export_data', { export_type: type })

            if (error) throw error

            const rows = data as any[]
            let filename = 'Nest_Export'
            if (type === 'users') filename = 'Nest_Users'
            if (type === 'claims') filename = 'Nest_Claims'
            if (type === 'missed_searches') filename = 'Nest_Missed_Searches'

            downloadCSV(rows, filename)
        } catch (err: any) {
            console.error('Export failed:', err)
            alert('Export failed: ' + err.message)
        } finally {
            setExporting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-400">
                Loading God View...
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">God View</h1>
                        <p className="text-slate-500">Real-time market health & demand signals</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                            <span className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Export</span>
                            <div className="h-4 w-px bg-slate-200 mx-1"></div>
                            <button
                                onClick={() => handleExport('users')}
                                disabled={exporting}
                                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md transition disabled:opacity-50"
                            >
                                Users
                            </button>
                            <button
                                onClick={() => handleExport('claims')}
                                disabled={exporting}
                                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md transition disabled:opacity-50"
                            >
                                Claims
                            </button>
                            <button
                                onClick={() => handleExport('missed_searches')}
                                disabled={exporting}
                                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-md transition disabled:opacity-50"
                            >
                                Missed
                            </button>
                        </div>
                        <div className="bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 text-sm font-medium text-slate-600">
                            {new Date().toLocaleDateString(undefined, { dateStyle: 'full' })}
                        </div>
                    </div>
                </header>

                {/* Tabs */}
                <div className="mb-6 flex space-x-1 rounded-xl bg-slate-200/50 p-1 w-fit">
                    <TabButton
                        active={activeTab === 'overview'}
                        onClick={() => setActiveTab('overview')}
                        icon={<LayoutGrid size={18} />}
                        label="Overview"
                    />
                    <TabButton
                        active={activeTab === 'users'}
                        onClick={() => setActiveTab('users')}
                        icon={<Users size={18} />}
                        label="Users"
                    />
                    <TabButton
                        active={activeTab === 'claims'}
                        onClick={() => setActiveTab('claims')}
                        icon={<ShieldAlert size={18} />}
                        label="Claims"
                    />
                    <TabButton
                        active={activeTab === 'flags'}
                        onClick={() => setActiveTab('flags')}
                        icon={<FileText size={18} />}
                        label="Flags"
                    />
                </div>

                {/* Content Area */}
                <div className="space-y-6">
                    {activeTab === 'overview' && stats && <OverviewContent stats={stats} />}
                    {activeTab === 'users' && <UsersContent />}
                    {activeTab === 'claims' && <ClaimsContent />}
                    {activeTab === 'flags' && <FlagsContent />}
                </div>
            </div>
        </div>
    )
}

// --- Sub-Components ---

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                }`}
        >
            {icon}
            {label}
        </button>
    )
}

function OverviewContent({ stats }: { stats: AdminStats }) {
    return (
        <>
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

            {/* 1.5 Growth Chart */}
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="flex items-center gap-2 mb-6 font-semibold text-slate-800">
                    <TrendingUp size={20} className="text-slate-400" />
                    Growth Trends (Last 30 Days)
                </h3>
                <div className="h-64 w-full">
                    <GrowthChart
                        signups={stats.daily_signups || []}
                        claims={stats.daily_claims || []}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* 2. Market Breakdown & Hotspots */}
                <div className="col-span-2 space-y-8">
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
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
                    </div>

                    {/* Hotspots Leaderboard */}
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                        <h3 className="flex items-center gap-2 mb-4 font-semibold text-slate-800">
                            <Home size={20} className="text-slate-400" />
                            Top Hotspots (Postcode Districts)
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-500">
                                <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                                    <tr>
                                        <th className="px-4 py-2 rounded-l-lg">District</th>
                                        <th className="px-4 py-2">Active Homes</th>
                                        <th className="px-4 py-2 rounded-r-lg">Ghost Searches</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(stats.hotspots || []).map((spot, i) => (
                                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-900">{spot.district}</td>
                                            <td className="px-4 py-3 text-emerald-600 font-semibold">{spot.active_homes}</td>
                                            <td className="px-4 py-3 text-red-500">{spot.ghost_searches}</td>
                                        </tr>
                                    ))}
                                    {(!stats.hotspots || stats.hotspots.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-slate-400 italic">
                                                No hotspot data available yet.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* 3. Right Column: Recent Activity & Ghost Search Feed */}
                <div className="col-span-1 space-y-8">
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
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

                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 relative overflow-hidden">
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
        </>
    )
}

function UsersContent() {
    const [users, setUsers] = useState<AdminUser[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = getSupabaseClient()

    const fetchUsers = async () => {
        setLoading(true)
        const { data, error } = await supabase.rpc('admin_list_users')
        if (error) console.error(error)
        else setUsers((data as any[]) || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) return

        try {
            const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id })
            if (error) throw error
            setUsers(prev => prev.filter(u => u.id !== id))
        } catch (err: any) {
            alert('Error deleting user: ' + err.message)
        }
    }

    if (loading) return <div className="text-center p-12 text-slate-400">Loading users...</div>

    return (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                        <tr>
                            <th className="px-6 py-3">User</th>
                            <th className="px-6 py-3">Role</th>
                            <th className="px-6 py-3">Joined</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4 flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 overflow-hidden">
                                        {user.avatar_url ? (
                                            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            user.email?.[0].toUpperCase()
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900">{user.display_name || 'No Name'}</div>
                                        <div className="text-xs text-slate-400">{user.email}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {new Date(user.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => handleDelete(user.id)}
                                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                        title="Delete User"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function ClaimsContent() {
    const [claims, setClaims] = useState<AdminClaim[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = getSupabaseClient()

    const fetchClaims = async () => {
        setLoading(true)
        const { data, error } = await supabase.rpc('admin_list_claims')
        if (error) console.error(error)
        else setClaims((data as any[]) || [])
        setLoading(false)
    }

    useEffect(() => {
        fetchClaims()
    }, [])

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const { error } = await supabase.rpc('admin_update_claim_status', { claim_id: id, new_status: newStatus })
            if (error) throw error
            setClaims(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c))
        } catch (err: any) {
            alert('Error updating claim: ' + err.message)
        }
    }

    if (loading) return <div className="text-center p-12 text-slate-400">Loading claims...</div>

    return (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                        <tr>
                            <th className="px-6 py-3">Property</th>
                            <th className="px-6 py-3">Claimant</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {claims.map((claim) => (
                            <tr key={claim.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="font-medium text-slate-900">
                                        {claim.house_number} {claim.street}
                                    </div>
                                    <div className="text-xs text-slate-400">{claim.postcode}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {claim.claimant_email}
                                </td>
                                <td className="px-6 py-4">
                                    {new Date(claim.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold uppercase ${claim.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                                        claim.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {claim.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                    {claim.status === 'pending' && (
                                        <>
                                            <button
                                                onClick={() => handleUpdateStatus(claim.id, 'approved')}
                                                className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition-colors"
                                                title="Approve"
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleUpdateStatus(claim.id, 'rejected')}
                                                className="text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                                                title="Reject"
                                            >
                                                <XCircle size={18} />
                                            </button>
                                        </>
                                    )}
                                    {claim.status === 'approved' && (
                                        <button
                                            onClick={() => handleUpdateStatus(claim.id, 'rejected')}
                                            className="text-slate-400 hover:text-red-600 transition-colors text-xs font-medium"
                                        >
                                            Revoke
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function FlagsContent() {
    const [flags, setFlags] = useState<PropertyFlag[]>([])
    const [loading, setLoading] = useState(true)

    const fetchFlags = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/admin/flags?status=pending')
            if (response.ok) {
                const data = await response.json()
                setFlags(data.data || [])
            }
        } catch (error) {
            console.error('Error fetching flags:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchFlags()
    }, [])

    const handleAction = async (id: string, action: 'reviewed' | 'dismissed') => {
        try {
            await fetch(`/api/admin/flags/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: action })
            })
            setFlags(prev => prev.filter(f => f.id !== id))
        } catch (error) {
            console.error('Error updating flag:', error)
            alert('Failed to update flag')
        }
    }

    if (loading) return <div className="text-center p-12 text-slate-400">Loading flags...</div>

    return (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-500">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-700">
                        <tr>
                            <th className="px-6 py-3">Property</th>
                            <th className="px-6 py-3">Reported By</th>
                            <th className="px-6 py-3">Reason</th>
                            <th className="px-6 py-3">Details</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {flags.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center">
                                    <div className="text-4xl mb-2">🎉</div>
                                    <p className="text-slate-900 font-medium">No pending flags</p>
                                    <p className="text-slate-400">All caught up!</p>
                                </td>
                            </tr>
                        ) : (
                            flags.map((flag) => (
                                <tr key={flag.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900 font-mono">
                                            {flag.property_id.slice(0, 8)}...
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {flag.user_id ? 'User' : 'Anonymous'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-700">
                                            {flag.reason}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 max-w-xs truncate" title={flag.details || ''}>
                                        {flag.details || '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {new Date(flag.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleAction(flag.id, 'reviewed')}
                                            className="text-emerald-600 hover:bg-emerald-50 p-1.5 rounded transition-colors"
                                            title="Resolve"
                                        >
                                            <CheckCircle size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleAction(flag.id, 'dismissed')}
                                            className="text-slate-400 hover:bg-slate-100 p-1.5 rounded transition-colors"
                                            title="Dismiss"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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

function GrowthChart({ signups, claims }: { signups: { date: string; count: number }[]; claims: { date: string; count: number }[] }) {
    // Basic SVG line chart
    const allData = [...signups, ...claims];
    if (allData.length === 0) return <div className="flex h-full items-center justify-center text-slate-400 italic">No growth data yet</div>;

    const dates = Array.from(new Set(allData.map(d => d.date))).sort();
    const maxCount = Math.max(...allData.map(d => d.count), 5); // Minimum scale of 5

    // Normalize data to map key dates
    const dataMap = dates.reduce((acc, date) => {
        acc[date] = {
            signup: signups.find(s => s.date === date)?.count || 0,
            claim: claims.find(c => c.date === date)?.count || 0
        };
        return acc;
    }, {} as Record<string, { signup: number; claim: number }>);

    const width = 100;
    const height = 100;
    const padding = 5;

    // Generate points
    const pointsSignup = dates.map((date, i) => {
        const x = (i / (dates.length - 1)) * (width - padding * 2) + padding;
        const y = height - (dataMap[date].signup / maxCount) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    const pointsClaim = dates.map((date, i) => {
        const x = (i / (dates.length - 1)) * (width - padding * 2) + padding;
        const y = height - (dataMap[date].claim / maxCount) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="relative h-full w-full">
            <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible" preserveAspectRatio="none">
                {/* Grid lines (simplified) */}
                <line x1={0} y1={height - padding} x2={width} y2={height - padding} stroke="#f1f5f9" strokeWidth="0.5" />
                <line x1={0} y1={padding} x2={width} y2={padding} stroke="#f1f5f9" strokeWidth="0.5" />

                {/* Signup Line (Blue) */}
                <polyline points={pointsSignup} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                {/* Claim Line (Emerald) */}
                <polyline points={pointsClaim} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {/* Legend / Tooltip info - simplified as absolute labels for now */}
            <div className="absolute top-0 right-0 flex gap-4 text-xs font-semibold">
                <div className="flex items-center gap-1 text-blue-500">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div> Signups
                </div>
                <div className="flex items-center gap-1 text-emerald-500">
                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div> Claims
                </div>
            </div>
        </div>
    )
}
