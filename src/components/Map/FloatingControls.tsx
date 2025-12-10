import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { User as UserIcon, LogOut as LogOutIcon, Menu as MenuIcon, RefreshCw, Flame, MessageCircle, SlidersHorizontal, LayoutDashboard, PlusCircle, Info, Layers, Locate, Plus, Minus, GraduationCap, TrainFront, Satellite, AlignLeft } from "lucide-react";
import NotificationBell from "@/components/Notifications/NotificationBell";
import { getSupabaseClient } from "@/lib/supabaseClient";

export interface LayerState {
  homes: boolean
  heat: boolean
  schools: boolean
  transport: boolean
}

interface FloatingControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onLocationSelect: (lat: number, lon: number) => void;
  isListOpen?: boolean;
  onToggleList?: () => void;
  currentUser?: { id?: string; email?: string | null } | null;
  onLogout?: () => void;
  onOpenInbox?: () => void;
  onOpenActivity?: () => void;
  onOpenFilters?: () => void;
  isAdmin?: boolean;
  onAddHomeClick?: () => void;
  showLegend?: boolean;
  onToggleLegend?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onLocateMe?: () => void;

  // New Layer Props
  layers?: LayerState;
  onLayerChange?: (layers: LayerState) => void;
}

export default function FloatingControls({
  searchQuery,
  onSearchChange,
  onLocationSelect,
  isListOpen,
  onToggleList,
  currentUser,
  onLogout,
  onOpenInbox,
  onOpenActivity,
  onOpenFilters,
  isAdmin,
  onAddHomeClick,
  showLegend,
  onToggleLegend,
  onZoomIn,
  onZoomOut,
  onLocateMe,
  layers,
  onLayerChange
}: FloatingControlsProps) {
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fetchedIsAdmin, setFetchedIsAdmin] = useState(false);

  // Layer Menu State
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  useEffect(() => {
    if (!isAdmin && currentUser?.id) {
      const checkAdmin = async () => {
        const userId = currentUser.id!;
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', userId)
          .single();

        const profile = data as any;

        if (profile?.role === 'admin') {
          setFetchedIsAdmin(true);
        }
      };

      checkAdmin();
    }
  }, [isAdmin, currentUser]);

  const effectiveIsAdmin = isAdmin || fetchedIsAdmin;

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    onSearchChange(e.target.value);
    setShowSuggestions(true);
  };

  const [menuOpen, setMenuOpen] = useState(false);
  const emailInitial = (currentUser?.email?.[0] ?? "?").toUpperCase();
  const handleLogoutClick = () => {
    setMenuOpen(false);
    onLogout?.();
  };

  useEffect(() => {
    const query = searchQuery.trim();
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length <= 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=gb&limit=5`;
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          console.error("Nominatim fetch failed", res.status, res.statusText);
          setSuggestions([]);
          setShowSuggestions(false);
          setHighlightedIndex(-1);
          return;
        }

        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data : []);
        setShowSuggestions(true);
        setHighlightedIndex(Array.isArray(data) && data.length ? 0 : -1);
      } catch (err) {
        console.error("Nominatim fetch error", err);
        setSuggestions([]);
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleSuggestionClick = (item: { display_name: string; lat: string; lon: string }) => {
    onSearchChange(item.display_name);
    onLocationSelect(parseFloat(item.lat), parseFloat(item.lon));
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((prev) => {
        const next = prev + 1;
        return next >= suggestions.length ? 0 : next;
      });
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setShowSuggestions(true);
      setHighlightedIndex((prev) => {
        const next = prev - 1;
        return next < 0 ? suggestions.length - 1 : next;
      });
      return;
    }
    if (e.key === "Enter") {
      if (suggestions.length === 0) return;
      e.preventDefault();
      const targetIndex = highlightedIndex >= 0 ? highlightedIndex : 0;
      const target = suggestions[targetIndex];
      if (target) {
        handleSuggestionClick(target);
        inputRef.current?.blur();
      }
    }
  };

  const handleToggleLayer = (key: keyof LayerState) => {
    if (!layers || !onLayerChange) return;
    onLayerChange({ ...layers, [key]: !layers[key] });
  };


  return (
    <div className="pointer-events-none absolute inset-0 z-[1000] overflow-hidden">

      {/* 1. TOP CENTER SEARCH PILL - GLASSMORPHISM */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[1000] pointer-events-auto">
        <div className="relative">
          <div className="flex items-center gap-3 w-full bg-white/95 backdrop-blur-md shadow-xl rounded-full px-4 py-3 border border-white/50 transition-shadow focus-within:ring-2 focus-within:ring-white/50 ring-1 ring-black/5">
            {onToggleList && (
              <button
                type="button"
                onClick={onToggleList}
                className="xl:hidden sm:hidden inline-flex items-center justify-center text-slate-500 hover:text-slate-800"
                aria-label={isListOpen ? "Hide list" : "Show list"}
              >
                <AlignLeft className="h-5 w-5" />
              </button>
            )}
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-500 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              placeholder="Search by street, postcode..."
              className="flex-1 bg-transparent border-none outline-none text-base text-slate-800 placeholder:text-slate-400 h-6 font-medium tracking-tight"
            />
            {/* Divider */}
            <div className="w-px h-5 bg-slate-200 mx-1"></div>
            {/* Filter Toggle */}
            <button
              onClick={onOpenFilters}
              className="p-1.5 hover:bg-white/50 rounded-full text-slate-500 hover:text-slate-900 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-3 rounded-3xl bg-white/90 backdrop-blur-xl shadow-2xl border border-white/50 p-2 z-[101] overflow-hidden">
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.display_name}-${idx}`}
                  type="button"
                  onClick={() => handleSuggestionClick(item)}
                  className={`flex w-full items-start p-3 text-left text-sm text-slate-700 hover:bg-white/60 rounded-xl cursor-pointer transition-colors ${idx === highlightedIndex ? "bg-white/60" : ""
                    }`}
                >
                  <div className="bg-slate-100 p-2 rounded-full mr-3 shrink-0">
                    <Locate size={14} className="text-slate-500" />
                  </div>
                  <span className="truncate py-1 font-medium">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* 2. TOP RIGHT USER SPOT - GLASSMORPHISM */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
        <div className="flex items-center gap-3">
          <NotificationBell userId={currentUser?.id} />
          {!currentUser ? (
            <a
              href="/auth/login"
              className="inline-flex h-12 px-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl hover:scale-105 font-bold text-sm transition-all border border-white/20"
            >
              Log in
            </a>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="h-12 w-12 flex items-center justify-center rounded-full bg-white/90 backdrop-blur-xl text-slate-900 font-bold shadow-xl border border-white/50 hover:scale-110 transition-all ring-1 ring-black/5 text-lg"
                aria-label="User Menu"
              >
                {emailInitial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-white/90 backdrop-blur-xl shadow-2xl border border-white/50 p-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right ring-1 ring-black/5">
                  <div className="text-xs font-bold text-slate-400 px-4 py-3 uppercase tracking-wider truncate">
                    {currentUser.email}
                  </div>
                  <div className="p-1 space-y-1">
                    {effectiveIsAdmin && (
                      <>
                        <a
                          href="/admin/dashboard"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-rose-600 font-bold hover:bg-rose-50/50 transition-colors"
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Admin Dashboard
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onAddHomeClick?.();
                          }}
                          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-teal-700 font-bold hover:bg-teal-50/50 transition-colors"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Add New Home
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenActivity?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-slate-700 font-bold hover:bg-white/60 transition-colors"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Activity Feed
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenInbox?.();
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-slate-700 font-bold hover:bg-white/60 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Messages
                    </button>
                    <a
                      href="/my-follows"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-700 font-bold hover:bg-white/60 transition-colors"
                    >
                      <UserIcon className="h-4 w-4" />
                      My Follows
                    </a>
                    <a
                      href="/my-homes"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-700 font-bold hover:bg-white/60 transition-colors"
                    >
                      <UserIcon className="h-4 w-4" />
                      My Dashboard
                    </a>
                    <div className="h-px bg-slate-100 my-1 mx-2" />
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm text-rose-600 font-bold hover:bg-rose-50/50 transition-colors"
                    >
                      <LogOutIcon className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. BOTTOM RIGHT TOOL STACK - GLASSMORPHISM */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-3 z-[900] pointer-events-auto items-end">

        {/* Layer Menu Popover (Compact, Left of Button) */}
        {showLayerMenu && layers && (
          <div className="absolute right-14 bottom-24 p-2 rounded-2xl bg-white/95 backdrop-blur-md border border-white/50 shadow-xl w-48 animate-in fade-in slide-in-from-right-2 duration-200 ring-1 ring-black/5 flex flex-col gap-1">
            {/* Buzz */}
            <button
              onClick={() => handleToggleLayer('heat')}
              className={`flex items-center justify-between w-full p-2 rounded-xl transition-all ${layers.heat ? "bg-purple-50 text-purple-900" : "hover:bg-slate-50 text-slate-600"}`}
            >
              <div className="flex items-center gap-2">
                <Flame size={16} className={layers.heat ? "text-purple-600" : "text-slate-400"} />
                <span className="text-sm font-bold">Buzz</span>
              </div>
              {layers.heat && <div className="h-2 w-2 rounded-full bg-purple-500" />}
            </button>

            {/* Schools */}
            <button
              onClick={() => handleToggleLayer('schools')}
              className={`flex items-center justify-between w-full p-2 rounded-xl transition-all ${layers.schools ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-600"}`}
            >
              <div className="flex items-center gap-2">
                <GraduationCap size={16} className={layers.schools ? "text-blue-600" : "text-slate-400"} />
                <span className="text-sm font-bold">Schools</span>
              </div>
              {layers.schools && <div className="h-2 w-2 rounded-full bg-blue-500" />}
            </button>

            {/* Transport */}
            <button
              onClick={() => handleToggleLayer('transport')}
              className={`flex items-center justify-between w-full p-2 rounded-xl transition-all ${layers.transport ? "bg-emerald-50 text-emerald-900" : "hover:bg-slate-50 text-slate-600"}`}
            >
              <div className="flex items-center gap-2">
                <TrainFront size={16} className={layers.transport ? "text-emerald-600" : "text-slate-400"} />
                <span className="text-sm font-bold">Transport</span>
              </div>
              {layers.transport && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
            </button>

            {/* Satellite (Disabled) */}
            <button
              disabled
              className="flex items-center justify-between w-full p-2 rounded-xl opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <Satellite size={16} className="text-slate-300" />
                <span className="text-sm font-bold text-slate-400">Satellite (Soon)</span>
              </div>
            </button>
          </div>
        )}

        {/* Legend Card (Slide-out) */}
        {showLegend && (
          <div className="absolute right-14 bottom-14 p-4 rounded-3xl bg-white/95 backdrop-blur-md border border-white/50 shadow-2xl w-56 animate-in fade-in slide-in-from-right-4 duration-300 ring-1 ring-black/5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal Guide</h4>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-teal-500 shadow-sm border border-white/50"></div>
                <span className="text-xs font-bold text-slate-700">Open to Talking</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-sm border border-white/50"></div>
                <span className="text-xs font-bold text-slate-700">For Sale</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-indigo-500 shadow-sm border border-white/50"></div>
                <span className="text-xs font-bold text-slate-700">For Rent</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-slate-500 shadow-sm border border-white/50"></div>
                <span className="text-xs font-bold text-slate-700">Claimed</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm border border-slate-300"></div>
                <span className="text-xs font-bold text-slate-700">Unclaimed</span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons Stack */}

        {/* Layer Menu Toggle */}
        <button
          onClick={() => {
            setShowLayerMenu(prev => !prev);
            if (showLegend) onToggleLegend?.(); // Auto close legend if layers open
          }}
          className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all shadow-xl border border-white/50 ${showLayerMenu
            ? "bg-slate-800 text-white"
            : "bg-white/95 backdrop-blur-md text-slate-600 hover:text-slate-900 hover:scale-105"
            }`}
          title="Layers"
        >
          <Layers size={20} />
        </button>

        {/* Info / Legend */}
        <button
          onClick={() => {
            onToggleLegend?.();
            setShowLayerMenu(false); // Auto close layers if legend open
          }}
          className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all shadow-xl border border-white/50 ${showLegend
            ? "bg-slate-800 text-white"
            : "bg-white/95 backdrop-blur-md text-slate-600 hover:text-slate-900 hover:scale-105"
            }`}
          title="Legend"
        >
          <Info size={20} />
        </button>

        {/* Locate Me */}
        {onLocateMe && (
          <button
            onClick={onLocateMe}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-md text-slate-600 hover:text-slate-900 shadow-xl border border-white/50 hover:scale-105 transition-all"
            title="Locate Me"
          >
            <Locate size={20} />
          </button>
        )}

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-md text-slate-600 hover:text-slate-900 shadow-xl border border-white/50 hover:scale-105 transition-all"
          title="Zoom In"
        >
          <Plus size={20} />
        </button>

        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/95 backdrop-blur-md text-slate-600 hover:text-slate-900 shadow-xl border border-white/50 hover:scale-105 transition-all"
          title="Zoom Out"
        >
          <Minus size={20} />
        </button>
      </div>

    </div>
  );
}
