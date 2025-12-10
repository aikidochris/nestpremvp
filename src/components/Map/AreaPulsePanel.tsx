import { useState, useEffect, useMemo } from "react";
import { Activity, MapPin, TrendingUp, Anchor, Coffee, GraduationCap, ArrowRight, Home, Castle, Train, Trees, ChevronUp, ChevronDown, Key, Tag, Building2, BookOpen, Radio, Maximize2 } from "lucide-react";
import clsx from "clsx";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { VIBE_ZONES, VibeZone } from "@/data/vibeZones";
import { AnimatePresence, motion } from "framer-motion";

// --- Types ---
type SheetState = 'collapsed' | 'half' | 'full';

interface AreaPulsePanelProps {
    currentCenter?: [number, number]; // Lat, Lon
    currentZoom?: number;
    className?: string;
    onLocationSelect?: (lat: number, lon: number) => void;
    onFlyToProperty?: (lat: number, lon: number, propertyId: string) => void;
}

// --- Constants ---
const DEFAULT_VIBE: VibeZone = {
    id: "north-tyneside",
    name: "North Tyneside",
    centroid: [0, 0],
    punchline: "The Coastal Corridor",
    vibe: "Explore the hidden market of the coast. Start your journey.",
    tags: [],
    priceBand: "---",
    description: "Welcome to Nest. Pan around to discover the unique vibes of each neighborhood."
};

const NEAR_THRESHOLD = 0.015;


// --- Helper Functions ---
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

// Relative time formatter (no external dependency)
function formatRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Get feed item type styling
function getFeedItemStyle(type: string): { bg: string; text: string; Icon: typeof Key } {
    switch (type) {
        case 'CLAIM':
            return { bg: 'bg-amber-100', text: 'text-amber-700', Icon: Key };
        case 'STATUS':
            return { bg: 'bg-rose-100', text: 'text-rose-700', Icon: Tag };
        case 'STORY':
            return { bg: 'bg-purple-100', text: 'text-purple-700', Icon: BookOpen };
        default:
            return { bg: 'bg-blue-100', text: 'text-blue-700', Icon: Building2 };
    }
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
    return Activity;
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


export default function AreaPulsePanel({ currentCenter, currentZoom, className, onLocationSelect, onFlyToProperty }: AreaPulsePanelProps) {
    // 3-State expansion logic
    const [sheetState, setSheetState] = useState<SheetState>('collapsed');
    const [activeTab, setActiveTab] = useState<'live' | 'vibe'>('live');
    const [tickerState, setTickerState] = useState<'feed' | 'vibe'>('feed');

    // Prepare location for hook
    const feedLocation = useMemo(() => {
        if (!currentCenter) return null;
        return { lat: currentCenter[0], lon: currentCenter[1], radius: 5000 };
    }, [currentCenter]);

    const { feedItems, isLoading } = useActivityFeed(null, feedLocation);
    const displayFeed = (!isLoading && feedItems) ? feedItems : [];

    // Determine current Vibe based on center
    const currentVibe = useMemo(() => {
        if (!currentCenter) return DEFAULT_VIBE;
        return getAreaVibe(currentCenter[0], currentCenter[1]);
    }, [currentCenter]);

    // Ticker Rotation Logic (only when collapsed)
    useEffect(() => {
        if (sheetState !== 'collapsed') return;
        const interval = setInterval(() => {
            setTickerState(prev => prev === 'feed' ? 'vibe' : 'feed');
        }, 5000);
        return () => clearInterval(interval);
    }, [sheetState]);

    // Construct Ticker Text
    const tickerText = useMemo(() => {
        if (tickerState === 'feed') {
            if (displayFeed.length > 0) {
                return `📡 ${displayFeed[0].summary_text}`;
            }
            return `📡 ${currentVibe.name} is waking up...`;
        } else {
            return `📍 ${currentVibe.name} — ${currentVibe.punchline}`;
        }
    }, [tickerState, displayFeed, currentVibe]);

    // State transitions
    const handleHeaderClick = () => {
        if (sheetState === 'collapsed') {
            setSheetState('half');
        } else if (sheetState === 'half') {
            setSheetState('collapsed');
        } else {
            setSheetState('half');
        }
    };

    const handleMaximize = (e: React.MouseEvent) => {
        e.stopPropagation();
        setSheetState('full');
    };

    const handleMinimize = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (sheetState === 'full') {
            setSheetState('half');
        } else {
            setSheetState('collapsed');
        }
    };

    const handleFeedItemClick = (item: any) => {
        if (onFlyToProperty && item.lat && item.lon && item.property_id) {
            setSheetState('collapsed');
            onFlyToProperty(item.lat, item.lon, item.property_id);
        } else if (onLocationSelect && item.lat && item.lon) {
            onLocationSelect(item.lat, item.lon);
        }
    };

    const isExpanded = sheetState !== 'collapsed';

    return (
        <div className={clsx(
            // Base positioning
            "fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-[900] font-sans",
            // VisionOS GLASS STYLE - High transparency
            "bg-white/60 dark:bg-stone-900/60",
            "backdrop-blur-2xl",
            "border-t border-x border-white/40",
            "shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]",
            "ring-1 ring-black/5",
            "rounded-t-2xl overflow-hidden",
            // Spring-like animation
            "transition-[height] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
            // Explicit height classes for Tailwind JIT
            sheetState === 'collapsed' && "h-14",
            sheetState === 'half' && "h-[40vh]",
            sheetState === 'full' && "h-[85vh]",
            className
        )}>
            {/* HEADER (Always Visible) */}
            <div
                onClick={handleHeaderClick}
                className="h-14 flex items-center justify-between px-4 cursor-pointer hover:bg-white/20 active:bg-white/30 transition-colors shrink-0"
            >
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={tickerState}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm font-semibold text-slate-900 dark:text-gray-100 truncate"
                        >
                            {tickerText}
                        </motion.span>
                    </AnimatePresence>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1">
                    {sheetState === 'half' && (
                        <button
                            onClick={handleMaximize}
                            className="p-1.5 rounded-lg hover:bg-white/30 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Expand"
                        >
                            <Maximize2 size={16} />
                        </button>
                    )}
                    <button
                        onClick={handleMinimize}
                        className="p-1.5 rounded-lg hover:bg-white/30 text-slate-500 dark:text-slate-400 transition-colors"
                    >
                        {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </button>
                </div>
            </div>

            {/* CONTENT AREA (visible when not collapsed) */}
            {isExpanded && (
                <div className="flex flex-col h-[calc(100%-3.5rem)] bg-white/30 dark:bg-black/20">
                    {/* Tab Switcher */}
                    <div className="flex p-2 gap-2 border-b border-white/20 shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveTab('live'); }}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                                activeTab === 'live'
                                    ? "bg-white/80 dark:bg-black/50 shadow-sm text-slate-900 dark:text-white"
                                    : "text-slate-500 dark:text-gray-400 hover:bg-white/30 hover:text-slate-900"
                            )}
                        >
                            <Activity size={14} /> Live Feed
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveTab('vibe'); }}
                            className={clsx(
                                "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                                activeTab === 'vibe'
                                    ? "bg-white/80 dark:bg-black/50 shadow-sm text-slate-900 dark:text-white"
                                    : "text-slate-500 dark:text-gray-400 hover:bg-white/30 hover:text-slate-900"
                            )}
                        >
                            <MapPin size={14} /> Area Vibe
                        </button>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-4">

                        {/* TAB: LIVE FEED */}
                        {activeTab === 'live' && (
                            <div className="space-y-3">
                                {isLoading && (
                                    <div className="text-center text-xs text-slate-500 py-4">
                                        Listening for local signals...
                                    </div>
                                )}

                                {/* EMPTY STATE - Evergreen Stats */}
                                {!isLoading && displayFeed.length === 0 && (
                                    <div className="text-center py-8 px-4">
                                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-teal-100 to-emerald-100 mb-4">
                                            <Radio className="h-8 w-8 text-teal-600" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                                            {currentVibe.name}
                                        </h3>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                            No recent activity in this view. Be the first to claim a home or share a story here.
                                        </p>
                                        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 text-xs font-medium">
                                            <TrendingUp size={12} />
                                            Explore unclaimed properties nearby
                                        </div>
                                    </div>
                                )}

                                {/* FEED ITEMS */}
                                {!isLoading && displayFeed.map((item) => {
                                    const style = getFeedItemStyle(item.type);
                                    const IconComponent = style.Icon;
                                    return (
                                        <div
                                            key={item.event_id}
                                            onClick={() => handleFeedItemClick(item)}
                                            className="flex gap-3 p-3 rounded-xl bg-white/50 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/70 dark:hover:bg-white/10 transition-colors cursor-pointer group"
                                        >
                                            {/* Thumbnail or Badge */}
                                            <div className="shrink-0">
                                                {item.market_image_url ? (
                                                    <img
                                                        src={item.market_image_url}
                                                        alt="Property"
                                                        className="h-12 w-12 rounded-lg object-cover border border-white/30 shadow-sm"
                                                    />
                                                ) : (
                                                    <div className={clsx(
                                                        "h-12 w-12 rounded-lg flex items-center justify-center shadow-sm border border-white/30",
                                                        style.bg, style.text
                                                    )}>
                                                        <IconComponent size={18} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                {/* Type Badge + Street */}
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className={clsx(
                                                        "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                                                        style.bg, style.text
                                                    )}>
                                                        {item.type}
                                                    </span>
                                                </div>
                                                <p className="text-sm font-medium text-slate-900 dark:text-gray-100 leading-snug truncate">
                                                    {item.street || "Property Update"}
                                                </p>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight mt-0.5 truncate">
                                                    {item.summary_text.replace(/New .* on /, '').substring(0, 50)}
                                                </p>

                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <p className="text-[10px] text-slate-400 font-medium">
                                                        {formatRelativeTime(item.created_at)}
                                                    </p>
                                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-teal-600 gap-1">
                                                        <span className="text-[10px] font-bold">FLY TO</span>
                                                        <ArrowRight size={12} className="animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* TAB: AREA VIBE */}
                        {activeTab === 'vibe' && (
                            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                                {/* Header */}
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                        {currentVibe.name}
                                    </h3>
                                    <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest mt-1">
                                        {currentVibe.punchline}
                                    </p>
                                </div>

                                {/* Vibe Quote */}
                                <div className="p-3 rounded-xl bg-teal-50/50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800/30">
                                    <p className="text-sm italic text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                        "{currentVibe.vibe}"
                                    </p>
                                </div>

                                {/* Description */}
                                <p className="text-sm text-slate-800 dark:text-gray-200 leading-relaxed">
                                    {currentVibe.description}
                                </p>

                                {/* Tags */}
                                {currentVibe.tags.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Known For</p>
                                        <div className="flex flex-wrap gap-2">
                                            {currentVibe.tags.map((tag, i) => {
                                                const Icon = getTagIcon(tag);
                                                const color = getTagColor(tag);
                                                return (
                                                    <span key={i} className={clsx(
                                                        "px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border shadow-sm cursor-default",
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
                                    <div className="pt-2">
                                        <div className="bg-white/50 dark:bg-white/5 p-4 rounded-2xl border border-white/40 dark:border-white/10 text-center">
                                            <p className="text-[10px] text-slate-500 dark:text-gray-400 uppercase font-bold mb-1">Average Price</p>
                                            <p className="text-xl font-black text-slate-900 dark:text-white">{currentVibe.priceBand}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
