import { useState, useEffect, useMemo } from "react";
import { Activity, MapPin, TrendingUp, Anchor, Coffee, GraduationCap, ArrowRight, Home, Castle, Palette, Umbrella, Trees, Fish, Train, Sprout, Ship } from "lucide-react";
import clsx from "clsx";
import { useActivityFeed } from "@/hooks/useActivityFeed";

interface AreaPulsePanelProps {
    currentCenter?: [number, number]; // Lat, Lon
    currentZoom?: number;
    className?: string; // For mobile toggle visibility
}

// --- Vibe Data Engine ---
const VIBE_ZONES = [
    {
        name: "Tynemouth",
        coords: [55.018, -1.422],
        title: "The Trophy Location",
        desc: "Historic grandeur meets surf culture. Aspirational and buzzing.",
        tags: [
            { label: "History", icon: Castle, color: "amber" },
            { label: "Surf", icon: Anchor, color: "blue" },
            { label: "Foodie", icon: Coffee, color: "rose" }
        ],
        stats: { price: "£385k", neighbors: "Active" }
    },
    {
        name: "Cullercoats",
        coords: [55.034, -1.432],
        title: "The Bohemian Bay",
        desc: "A tight-knit artistic community sheltered by the cliffs.",
        tags: [
            { label: "Artistic", icon: Palette, color: "purple" },
            { label: "Sea Swim", icon: Anchor, color: "cyan" },
            { label: "Indie", icon: Coffee, color: "orange" }
        ],
        stats: { price: "£290k", neighbors: "Creative" }
    },
    {
        name: "Whitley Bay",
        coords: [55.046, -1.446],
        title: "The Coastal Revival",
        desc: "Golden sands, Spanish City, and a thriving family scene.",
        tags: [
            { label: "Iconic", icon: Castle, color: "yellow" },
            { label: "Beach", icon: Umbrella, color: "blue" },
            { label: "Family", icon: UsersIcon, color: "emerald" }
        ],
        stats: { price: "£320k", neighbors: "Thriving" }
    },
    {
        name: "Monkseaton",
        coords: [55.042, -1.468],
        title: "The Village Suburb",
        desc: "Traditional pubs, incredible schools, and a village pace.",
        tags: [
            { label: "Leafy", icon: Trees, color: "green" },
            { label: "Craft Beer", icon: Coffee, color: "amber" },
            { label: "Top Schools", icon: GraduationCap, color: "indigo" }
        ],
        stats: { price: "£340k", neighbors: "Settled" }
    },
    {
        name: "North Shields Fish Quay",
        coords: [55.009, -1.442],
        title: "Industrial Chic",
        desc: "Heritage grit turned into the region's hottest dining spot.",
        tags: [
            { label: "Seafood", icon: Fish, color: "blue" },
            { label: "Heritage", icon: Anchor, color: "slate" },
            { label: "River Views", icon: Ship, color: "sky" }
        ],
        stats: { price: "£210k", neighbors: "Buzzing" }
    },
    {
        name: "Preston",
        coords: [55.022, -1.455],
        title: "The Quiet Achiever",
        desc: "Big gardens, solid 1930s homes, and great connections.",
        tags: [
            { label: "Big Gardens", icon: Sprout, color: "green" },
            { label: "Safe", icon: Home, color: "emerald" },
            { label: "Smart Buy", icon: TrendingUp, color: "teal" }
        ],
        stats: { price: "£260k", neighbors: "Stable" }
    },
    {
        name: "Shiremoor",
        coords: [55.038, -1.503],
        title: "The Modern Connector",
        desc: "Purpose-built convenience, fast Metro links, new estates.",
        tags: [
            { label: "Commuter", icon: Train, color: "violet" },
            { label: "New Build", icon: Home, color: "blue" },
            { label: "Convenience", icon: Coffee, color: "slate" }
        ],
        stats: { price: "£200k", neighbors: "Growing" }
    },
    {
        name: "Backworth",
        coords: [55.045, -1.528],
        title: "Heritage Meets Modern",
        desc: "Ancient stone cottages surrounded by family estates.",
        tags: [
            { label: "Golf", icon: Sprout, color: "emerald" },
            { label: "Historic", icon: Castle, color: "stone" },
            { label: "Rural Edge", icon: Trees, color: "green" }
        ],
        stats: { price: "£280k", neighbors: "Family" }
    },
    {
        name: "West Monkseaton",
        coords: [55.045, -1.487],
        title: "The Green Fringe",
        desc: "Where the suburbs meet the open fields of Northumberland.",
        tags: [
            { label: "Country Edge", icon: Trees, color: "lime" },
            { label: "Dog Walking", icon: Sprout, color: "emerald" },
            { label: "Active", icon: Activity, color: "orange" }
        ],
        stats: { price: "£310k", neighbors: "Outdoorsy" }
    },
    {
        name: "Seaton Sluice",
        coords: [55.083, -1.474],
        title: "The Nature Escape",
        desc: "Harbour walks, dunes, and the best fish & chips.",
        tags: [
            { label: "Harbour", icon: Anchor, color: "blue" },
            { label: "Dunes", icon: Umbrella, color: "yellow" },
            { label: "Fish & Chips", icon: Fish, color: "orange" }
        ],
        stats: { price: "£250k", neighbors: "Peaceful" }
    }
];

const DEFAULT_VIBE = {
    name: "North Tyneside",
    title: "The Coastal Corridor",
    desc: "Explore the hidden market of the coast. Start your journey.",
    tags: [],
    stats: { price: "---", neighbors: "---" }
};

// Simple distance function (degrees) - approx 1km is roughly 0.009 deg lat, 0.015 deg lon
// We'll use a threshold of 0.015 degrees (approx 1.5km) for "near"
const NEAR_THRESHOLD = 0.015;

function getAreaVibe(lat: number, lon: number) {
    let closest = null;
    let minDist = Infinity;

    for (const zone of VIBE_ZONES) {
        const dLat = zone.coords[0] - lat;
        const dLon = zone.coords[1] - lon;
        const dist = Math.sqrt(dLat * dLat + dLon * dLon);

        if (dist < minDist) {
            minDist = dist;
            closest = zone;
        }
    }

    if (closest && minDist <= NEAR_THRESHOLD) {
        return closest;
    }
    return DEFAULT_VIBE;
}

// Icon helper
function UsersIcon(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
}


export default function AreaPulsePanel({ currentCenter, currentZoom, className }: AreaPulsePanelProps) {
    const [activeTab, setActiveTab] = useState<'live' | 'vibe'>('live');
    const [tickerIndex, setTickerIndex] = useState(0);
    const { feedItems, isLoading } = useActivityFeed(null); // Global feed
    // Real Feed without Mock Fillers
    const displayFeed = (!isLoading && feedItems) ? feedItems : [];

    // Determine current Vibe based on center
    const currentVibe = useMemo(() => {
        if (!currentCenter) return DEFAULT_VIBE;
        return getAreaVibe(currentCenter[0], currentCenter[1]);
    }, [currentCenter]);

    // Ticker Logic
    const tickerItems = useMemo(() => {
        const items = [];
        if (displayFeed.length > 0) {
            items.push(`🔥 Live: ${displayFeed[0].summary_text}`);
            if (displayFeed[1]) items.push(`📢 ${displayFeed[1].summary_text}`);
            if (displayFeed[2]) items.push(`📍 Market Alert: ${displayFeed[2].summary_text}`);
        } else {
            items.push("📍 Welcome to Nest. The pulse of the market is quiet right now.");
        }
        return items;
    }, [displayFeed]);

    useEffect(() => {
        if (tickerItems.length === 0) return;
        const interval = setInterval(() => {
            setTickerIndex((prev) => (prev + 1) % tickerItems.length);
        }, 8000);
        return () => clearInterval(interval);
    }, [tickerItems.length]);


    // Auto-switch to Vibe tab if zoomed out or user drags to a new zone?
    // For now, let's keep it manual to avoid annoyance.

    return (
        <div className={clsx(
            "absolute top-24 left-4 w-80 rounded-3xl z-[900] overflow-hidden transition-all duration-500",
            // VISIONOS GLASS STYLE
            "bg-white/70 dark:bg-stone-900/60 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-black/10 ring-1 ring-black/5",
            className
        )}>

            {/* Top Ticker (Marquee) */}
            <div className="bg-gradient-to-r from-teal-500/10 to-blue-500/10 px-4 py-2 border-b border-white/20 overflow-hidden whitespace-nowrap">
                <div className="inline-block animate-marquee text-[11px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wide">
                    {tickerItems.join("  •  ")}
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex p-1 gap-1 border-b border-white/20 bg-white/10">
                <button
                    onClick={() => setActiveTab('live')}
                    className={clsx(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2",
                        activeTab === 'live'
                            ? "bg-white/80 dark:bg-black/50 shadow-sm text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:bg-white/30 hover:text-gray-900"
                    )}
                >
                    <Activity size={14} /> Live Feed
                </button>
                <button
                    onClick={() => setActiveTab('vibe')}
                    className={clsx(
                        "flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2",
                        activeTab === 'vibe'
                            ? "bg-white/80 dark:bg-black/50 shadow-sm text-gray-900 dark:text-white"
                            : "text-gray-500 dark:text-gray-400 hover:bg-white/30 hover:text-gray-900"
                    )}
                >
                    <MapPin size={14} /> Area Vibe
                </button>
            </div>

            {/* Content Area */}
            <div className="h-72 overflow-y-auto custom-scrollbar p-0 relative">

                {/* TAB: LIVE FEED */}
                {activeTab === 'live' && (
                    <div className="flex flex-col divide-y divide-white/10">
                        {isLoading && <div className="p-8 text-xs text-gray-400 text-center font-medium">Listening to the market...</div>}

                        {!isLoading && displayFeed.length === 0 && (
                            <div className="p-8 text-center">
                                <Coffee className="mx-auto h-8 w-8 text-teal-300 mb-2 opacity-50" />
                                <p className="text-xs text-gray-500 font-medium">Quiet day in Tyneside...</p>
                                <p className="text-[10px] text-gray-400 mt-1">Be the first to make a move.</p>
                            </div>
                        )}

                        {!isLoading && displayFeed.map((item) => (
                            <div key={item.event_id} className="flex gap-3 p-4 hover:bg-white/40 dark:hover:bg-black/20 transition-colors cursor-pointer group">
                                <div className={clsx(
                                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-white/40",
                                    item.type === 'CLAIM' && "bg-teal-100 text-teal-600",
                                    item.type === 'STATUS' && "bg-teal-50 text-teal-500",
                                    item.type === 'STORY' && "bg-purple-100 text-purple-600"
                                )}>
                                    {item.type === 'CLAIM' && <Home size={14} />}
                                    {item.type === 'STATUS' && <Activity size={14} />}
                                    {item.type === 'STORY' && <MapPin size={14} />}
                                    {/* Default fallback icon if needed */}
                                    {!['CLAIM', 'STATUS', 'STORY'].includes(item.type) && <Activity size={14} className="text-gray-500" />}
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-snug">
                                        {item.summary_text}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        <ArrowRight size={8} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* TAB: AREA VIBE */}
                {activeTab === 'vibe' && (
                    <div className="p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* Header */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {currentVibe.name}
                                </h3>
                                {/* Mobile/Status Indicator */}
                                <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                            </div>
                            <p className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                                {currentVibe.title}
                            </p>
                        </div>

                        {/* Description */}
                        <div className="p-3 rounded-xl bg-white/40 dark:bg-black/20 border border-white/30 dark:border-white/10">
                            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                "{currentVibe.desc}"
                            </p>
                        </div>

                        {/* Tags */}
                        {currentVibe.tags.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Known For</p>
                                <div className="flex flex-wrap gap-2">
                                    {currentVibe.tags.map((tag: any, i: number) => {
                                        const Icon = tag.icon;
                                        return (
                                            <span key={i} className={clsx(
                                                "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border shadow-sm transition-transform hover:scale-105 cursor-default",
                                                tag.color === "amber" && "bg-amber-50 text-amber-700 border-amber-100",
                                                tag.color === "blue" && "bg-blue-50 text-blue-700 border-blue-100",
                                                tag.color === "rose" && "bg-rose-50 text-rose-700 border-rose-100",
                                                tag.color === "purple" && "bg-purple-50 text-purple-700 border-purple-100",
                                                tag.color === "cyan" && "bg-cyan-50 text-cyan-700 border-cyan-100",
                                                tag.color === "orange" && "bg-orange-50 text-orange-700 border-orange-100",
                                                tag.color === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                                                tag.color === "green" && "bg-green-50 text-green-700 border-green-100",
                                                tag.color === "indigo" && "bg-indigo-50 text-indigo-700 border-indigo-100",
                                                tag.color === "slate" && "bg-slate-50 text-slate-700 border-slate-100",
                                                tag.color === "sky" && "bg-sky-50 text-sky-700 border-sky-100",
                                                tag.color === "teal" && "bg-teal-50 text-teal-700 border-teal-100",
                                                tag.color === "violet" && "bg-violet-50 text-violet-700 border-violet-100",
                                                tag.color === "stone" && "bg-stone-50 text-stone-700 border-stone-100",
                                                tag.color === "lime" && "bg-lime-50 text-lime-700 border-lime-100",
                                                tag.color === "yellow" && "bg-yellow-50 text-yellow-700 border-yellow-100",
                                            )}>
                                                <Icon size={12} /> {tag.label}
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quick Stats */}
                        {currentVibe.name !== 'North Tyneside' && (
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div className="bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-white/40 dark:border-white/10 text-center">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Avg Price</p>
                                    <p className="text-lg font-black text-gray-900 dark:text-white">{currentVibe.stats.price}</p>
                                </div>
                                <div className="bg-white/50 dark:bg-white/5 p-3 rounded-2xl border border-white/40 dark:border-white/10 text-center">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Community</p>
                                    <p className="text-lg font-black text-gray-900 dark:text-white">{currentVibe.stats.neighbors}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
