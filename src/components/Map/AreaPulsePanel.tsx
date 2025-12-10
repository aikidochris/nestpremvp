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
import { VIBE_ZONES, VibeZone } from "@/data/vibeZones";

const DEFAULT_VIBE: VibeZone = {
    id: "north-tyneside",
    name: "North Tyneside",
    centroid: [0, 0], // Not used for default
    punchline: "The Coastal Corridor",
    vibe: "Explore the hidden market of the coast. Start your journey.",
    tags: [],
    priceBand: "---",
    description: "Welcome to Nest. Pan around to discover the unique vibes of each neighborhood."
};

// Simple distance function (degrees) - approx 1km is roughly 0.009 deg lat, 0.015 deg lon
// We'll use a threshold of 0.015 degrees (approx 1.5km) for "near"
const NEAR_THRESHOLD = 0.015;

function getAreaVibe(lat: number, lon: number): VibeZone {
    let closest = null;
    let minDist = Infinity;

    for (const zone of VIBE_ZONES) {
        const dLat = zone.centroid[0] - lat;
        const dLon = zone.centroid[1] - lon;
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

// Tag Icon Helper
const getTagIcon = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('beach') || t.includes('sea') || t.includes('coast') || t.includes('water')) return Anchor;
    if (t.includes('food') || t.includes('drink') || t.includes('caf')) return Coffee;
    if (t.includes('school') || t.includes('family')) return GraduationCap;
    if (t.includes('train') || t.includes('metro') || t.includes('transport')) return Train;
    if (t.includes('green') || t.includes('park') || t.includes('rural') || t.includes('walk')) return Trees;
    if (t.includes('modern') || t.includes('new build')) return Home;
    if (t.includes('history') || t.includes('victorian') || t.includes('character')) return Castle;
    if (t.includes('value') || t.includes('smart')) return TrendingUp;
    return Activity; // Default
};

// Color Helper
const getTagColor = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes('beach') || t.includes('sea') || t.includes('coast')) return "blue";
    if (t.includes('green') || t.includes('park') || t.includes('village') || t.includes('garden')) return "emerald";
    if (t.includes('food') || t.includes('drink') || t.includes('caf')) return "rose";
    if (t.includes('school') || t.includes('family')) return "indigo";
    if (t.includes('new') || t.includes('modern')) return "slate";
    if (t.includes('value') || t.includes('smart')) return "teal";
    if (t.includes('history') || t.includes('victorian') || t.includes('heritage')) return "amber";
    if (t.includes('art') || t.includes('creative')) return "purple";
    if (t.includes('swim')) return "cyan";
    if (t.includes('indie') || t.includes('chips')) return "orange";
    if (t.includes('commuter') || t.includes('transport') || t.includes('metro')) return "violet";
    if (t.includes('sky') || t.includes('river') || t.includes('view')) return "sky";
    if (t.includes('active') || t.includes('sport') || t.includes('walk') || t.includes('golf')) return "lime";
    if (t.includes('iconic') || t.includes('dunes')) return "yellow";
    if (t.includes('character') || t.includes('charm') || t.includes('unique')) return "pink";
    if (t.includes('quiet') || t.includes('calm') || t.includes('peace') || t.includes('safe')) return "teal";
    return "stone";
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
            "bg-white/40 dark:bg-stone-900/40 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-black/10 ring-1 ring-black/5",
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
            <div className="max-h-[60vh] overflow-y-auto scrollbar-hide p-0 relative">

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
                                    <p className="text-xs font-semibold text-slate-900 dark:text-gray-200 leading-snug">
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
                    <div key={currentVibe.name} className="p-5 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

                        {/* Header */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {currentVibe.name}
                                </h3>
                                {/* Mobile/Status Indicator */}
                                <div className="h-2 w-2 rounded-full bg-teal-500 animate-pulse" />
                            </div>
                            <p className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                                {currentVibe.punchline}
                            </p>
                        </div>

                        {/* Vibe Box */}
                        <div className="p-3 rounded-xl bg-white/40 dark:bg-black/20 border border-white/30 dark:border-white/10">
                            <p className="text-sm italic text-slate-800 dark:text-gray-300 leading-relaxed font-medium">
                                "{currentVibe.vibe}"
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <p className="text-sm text-slate-900 dark:text-gray-200 leading-relaxed font-medium">
                                {currentVibe.description}
                            </p>
                        </div>

                        {/* Tags */}
                        {currentVibe.tags.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Known For</p>
                                <div className="flex flex-wrap gap-2">
                                    {currentVibe.tags.map((tag, i) => {
                                        const Icon = getTagIcon(tag);
                                        const color = getTagColor(tag);
                                        return (
                                            <span key={i} className={clsx(
                                                "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border shadow-sm transition-transform hover:scale-105 cursor-default",
                                                color === "amber" && "bg-amber-50 text-amber-700 border-amber-100",
                                                color === "blue" && "bg-blue-50 text-blue-700 border-blue-100",
                                                color === "rose" && "bg-rose-50 text-rose-700 border-rose-100",
                                                color === "purple" && "bg-purple-50 text-purple-700 border-purple-100",
                                                color === "cyan" && "bg-cyan-50 text-cyan-700 border-cyan-100",
                                                color === "orange" && "bg-orange-50 text-orange-700 border-orange-100",
                                                color === "emerald" && "bg-emerald-50 text-emerald-700 border-emerald-100",
                                                color === "indigo" && "bg-indigo-50 text-indigo-700 border-indigo-100",
                                                color === "slate" && "bg-slate-50 text-slate-700 border-slate-100",
                                                color === "sky" && "bg-sky-50 text-sky-700 border-sky-100",
                                                color === "teal" && "bg-teal-50 text-teal-700 border-teal-100",
                                                color === "violet" && "bg-violet-50 text-violet-700 border-violet-100",
                                                color === "lime" && "bg-lime-50 text-lime-700 border-lime-100",
                                                color === "yellow" && "bg-yellow-50 text-yellow-700 border-yellow-100",
                                                color === "pink" && "bg-pink-50 text-pink-700 border-pink-100",
                                                color === "stone" && "bg-stone-50 text-stone-700 border-stone-100",
                                            )}>
                                                <Icon size={12} /> {tag}
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Price Band */}
                        {currentVibe.id !== 'north-tyneside' && (
                            <div className="grid grid-cols-1 gap-3 pt-2">
                                <div className="bg-white/40 dark:bg-white/5 p-3 rounded-2xl border border-white/40 dark:border-white/10 text-center">
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Average Price</p>
                                    <p className="text-xl font-black text-slate-900 dark:text-white">{currentVibe.priceBand}</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
