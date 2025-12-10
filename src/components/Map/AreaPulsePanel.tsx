import { useState, useEffect, useMemo, useRef } from "react";
import { Activity, MapPin, TrendingUp, Anchor, Coffee, GraduationCap, ArrowRight, Home, Castle, Palette, Umbrella, Trees, Fish, Train, Sprout, Ship, ChevronUp, ChevronDown } from "lucide-react";
import clsx from "clsx";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { VIBE_ZONES, VibeZone } from "@/data/vibeZones";
import { AnimatePresence, motion } from "framer-motion";

interface AreaPulsePanelProps {
    currentCenter?: [number, number]; // Lat, Lon
    currentZoom?: number;
    className?: string; // For mobile toggle visibility
}

// --- Constants ---
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

const NEAR_THRESHOLD = 0.015;

interface AreaPulsePanelProps {
    currentCenter?: [number, number]; // Lat, Lon
    currentZoom?: number;
    className?: string; // For mobile toggle visibility
    onLocationSelect?: (lat: number, lon: number) => void;
}

// ... helper functions omitted for brevity, they remain the same ...
// Simple distance function (degrees)
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


export default function AreaPulsePanel({ currentCenter, currentZoom, className, onLocationSelect }: AreaPulsePanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState<'live' | 'vibe'>('live');
    const [tickerState, setTickerState] = useState<'feed' | 'vibe'>('feed');

    // Prepare location for hook (stable object)
    const feedLocation = useMemo(() => {
        if (!currentCenter) return null;
        return { lat: currentCenter[0], lon: currentCenter[1], radius: 5000 };
    }, [currentCenter]);

    const { feedItems, isLoading } = useActivityFeed(null, feedLocation); // Local feed
    const displayFeed = (!isLoading && feedItems) ? feedItems : [];

    // Determine current Vibe based on center
    const currentVibe = useMemo(() => {
        if (!currentCenter) return DEFAULT_VIBE;
        return getAreaVibe(currentCenter[0], currentCenter[1]);
    }, [currentCenter]);

    // Ticker Rotation Logic
    useEffect(() => {
        if (isExpanded) return;
        const interval = setInterval(() => {
            setTickerState(prev => prev === 'feed' ? 'vibe' : 'feed');
        }, 5000);
        return () => clearInterval(interval);
    }, [isExpanded]);

    // Construct Ticker Text
    const tickerText = useMemo(() => {
        if (tickerState === 'feed') {
            if (displayFeed.length > 0) {
                return `📡 ${displayFeed[0].summary_text}`;
            }
            return "📡 Quiet day in the neighborhood...";
        } else {
            return `📍 ${currentVibe.name} — ${currentVibe.punchline}`;
        }
    }, [tickerState, displayFeed, currentVibe]);

    // Toggle Expansion
    const toggleExpand = () => setIsExpanded(!isExpanded);

    const handleFeedItemClick = (item: any) => {
        if (onLocationSelect && item.lat && item.lon) {
            onLocationSelect(item.lat, item.lon);
            // Optional: Close panel or give feedback?
        }
    }

    return (
        <div className={clsx(
            "fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-[900] transition-all duration-500 ease-in-out font-sans",
            // VISIONOS GLASS STYLE - 80% opacity for better readibility on the sheet
            "bg-white/80 dark:bg-stone-900/80 backdrop-blur-2xl border border-white/40 shadow-2xl shadow-black/10 ring-1 ring-black/5 rounded-2xl overflow-hidden",
            className
        )}>
            {/* COLLAPSED HEADER (Always Visible) */}
            <div
                onClick={toggleExpand}
                className="h-12 flex items-center justify-between px-4 cursor-pointer hover:bg-white/20 active:bg-white/30 transition-colors"
            >
                <div className="flex-1 flex items-center gap-2 overflow-hidden">
                    {/* Animated Ticker Text */}
                    <AnimatePresence mode="wait">
                        <motion.span
                            key={tickerState}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate"
                        >
                            {tickerText}
                        </motion.span>
                    </AnimatePresence>
                </div>

                {/* Chevron */}
                <div className="text-slate-500 dark:text-slate-400">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </div>
            </div>

            {/* EXPANDED CONTENT AREA */}
            <div className={clsx(
                "transition-[max-height] duration-500 ease-in-out overflow-hidden bg-white/40 dark:bg-black/20",
                isExpanded ? "max-h-[60vh]" : "max-h-0"
            )}>
                {/* Tab Switcher */}
                <div className="flex p-2 gap-2 border-b border-white/20">
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('live'); }}
                        className={clsx(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                            activeTab === 'live'
                                ? "bg-white/80 dark:bg-black/50 shadow-sm text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:bg-white/30 hover:text-gray-900"
                        )}
                    >
                        <Activity size={14} /> Live Feed
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveTab('vibe'); }}
                        className={clsx(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 flex items-center justify-center gap-2",
                            activeTab === 'vibe'
                                ? "bg-white/80 dark:bg-black/50 shadow-sm text-gray-900 dark:text-white"
                                : "text-gray-500 dark:text-gray-400 hover:bg-white/30 hover:text-gray-900"
                        )}
                    >
                        <MapPin size={14} /> Area Vibe
                    </button>
                </div>

                {/* SCROLLABLE CONTENT */}
                <div className="overflow-y-auto scrollbar-hide max-h-[50vh] p-4">

                    {/* TAB: LIVE FEED */}
                    {activeTab === 'live' && (
                        <div className="space-y-3">
                            {isLoading && <div className="text-center text-xs text-gray-400 py-4">Listening for local signals...</div>}

                            {!isLoading && displayFeed.length === 0 && (
                                <div className="text-center py-6">
                                    <Coffee className="mx-auto h-8 w-8 text-teal-500/50 mb-2" />
                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Quiet day nearby...</p>
                                    <p className="text-xs text-slate-500">Nothing happening in this area recently.</p>
                                </div>
                            )}

                            {!isLoading && displayFeed.map((item) => (
                                <div
                                    key={item.event_id}
                                    onClick={() => handleFeedItemClick(item)}
                                    className="flex gap-3 p-3 rounded-xl bg-white/40 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/60 transition-colors cursor-pointer group"
                                >
                                    {/* Thumbnail or Icon */}
                                    <div className="shrink-0">
                                        {item.market_image_url ? (
                                            <img
                                                src={item.market_image_url}
                                                alt="Property"
                                                className="h-10 w-10 rounded-lg object-cover border border-white/20 shadow-sm"
                                            />
                                        ) : (
                                            <div className={clsx(
                                                "h-10 w-10 rounded-lg flex items-center justify-center shadow-sm border border-white/40",
                                                item.type === 'CLAIM' && "bg-teal-100 text-teal-600",
                                                item.type === 'STATUS' && "bg-teal-50 text-teal-500",
                                                item.type === 'STORY' && "bg-purple-100 text-purple-600"
                                            )}>
                                                {item.type === 'CLAIM' && <Home size={16} />}
                                                {item.type === 'STATUS' && <Activity size={16} />}
                                                {item.type === 'STORY' && <MapPin size={16} />}
                                                {!['CLAIM', 'STATUS', 'STORY'].includes(item.type) && <Activity size={16} className="text-gray-500" />}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {/* Rich Text: Bold Street Name */}
                                        <p className="text-xs font-medium text-slate-900 dark:text-gray-100 leading-snug">
                                            {item.type === 'CLAIM' && "New Claim on "}
                                            {item.type === 'STORY' && "New Story on "}
                                            {item.type === 'STATUS' && "Update on "}
                                            <span className="font-bold">{item.street || "a property"}</span>
                                        </p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight mt-0.5 truncate">
                                            {item.summary_text.replace(/New .* on /, '')}
                                        </p>

                                        <div className="flex items-center gap-2 mt-1.5">
                                            <p className="text-[10px] text-gray-400">
                                                {/* Relative Time Mockup - ideally use date-fns/dayjs */}
                                                {/* Simple JS formatter for now */}
                                                {new Date(item.created_at).toLocaleDateString() === new Date().toLocaleDateString()
                                                    ? new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : new Date(item.created_at).toLocaleDateString()}
                                            </p>
                                            {/* Pulsating Action Arrow */}
                                            <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-teal-600 gap-1">
                                                <span className="text-[10px] font-bold">FLY TO</span>
                                                <ArrowRight size={12} className="animate-pulse" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* TAB: AREA VIBE */}
                    {activeTab === 'vibe' && (
                        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300">
                            {/* ... same as before, preserving vibe logic ... */}
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
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Known For</p>
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
                                    <div className="bg-white/40 dark:bg-white/5 p-4 rounded-2xl border border-white/40 dark:border-white/10 text-center">
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold mb-1">Average Price</p>
                                        <p className="text-xl font-black text-slate-900 dark:text-white">{currentVibe.priceBand}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
