import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { User as UserIcon, LogOut as LogOutIcon, Menu as MenuIcon, RefreshCw, Flame, MessageCircle, SlidersHorizontal, LayoutDashboard, PlusCircle, Info, Layers, Locate, Plus, Minus, GraduationCap, TrainFront, Satellite } from "lucide-react";
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
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">

      {/* 1. TOP CENTER SEARCH PILL */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-[1000] pointer-events-auto">
        <div className="relative">
          <div className="flex items-center gap-3 w-full bg-white/95 backdrop-blur-md shadow-xl rounded-full px-4 py-2 border border-stone-100 transition-shadow focus-within:ring-2 focus-within:ring-stone-200">
            {onToggleList && (
              <button
                type="button"
                onClick={onToggleList}
                className="xl:hidden sm:hidden inline-flex items-center justify-center text-slate-500 hover:text-slate-800"
                aria-label={isListOpen ? "Hide list" : "Show list"}
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            )}
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearch}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              placeholder="Search by street, postcode..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 h-9 font-medium tracking-tight"
            />
            {/* Divider */}
            <div className="w-px h-5 bg-stone-200 mx-1"></div>
            {/* Filter Toggle */}
            <button
              onClick={onOpenFilters}
              className="p-1.5 hover:bg-stone-50 rounded-full text-slate-500 hover:text-slate-800 transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl bg-white shadow-2xl ring-1 ring-stone-100 z-[101] overflow-hidden">
              {suggestions.map((item, idx) => (
                <button
                  key={`${item.display_name}-${idx}`}
                  type="button"
                  onClick={() => handleSuggestionClick(item)}
                  className={`flex w-full items-start p-3 text-left text-sm text-slate-700 hover:bg-teal-50 cursor-pointer border-t border-white/20 first:border-t-0 truncate ${idx === highlightedIndex ? "bg-teal-50" : ""
                    }`}
                >
                  <span className="truncate">{item.display_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>


      {/* 2. TOP RIGHT USER BUTTON */}
      <div className="absolute top-4 right-4 z-[1000] pointer-events-auto">
        <div className="flex items-center gap-3">
          <NotificationBell userId={currentUser?.id} />
          {!currentUser ? (
            <a
              href="/auth/login"
              className="inline-flex h-12 px-5 items-center justify-center rounded-full bg-teal-600 text-white shadow-xl hover:bg-teal-700 font-semibold text-sm transition-transform hover:scale-105 border border-white/20"
            >
              Log in
            </a>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((prev) => !prev)}
                className="h-12 w-12 flex items-center justify-center rounded-full bg-white/95 text-teal-700 font-bold shadow-xl border border-stone-100 hover:bg-stone-50 hover:scale-105 transition-all"
                aria-label="User Menu"
              >
                {emailInitial}
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-2xl border border-stone-100 p-2 animate-in fade-in slide-in-from-top-2 duration-200 origin-top-right">
                  <div className="text-xs text-gray-500 px-3 py-2 border-b border-gray-100 truncate">
                    {currentUser.email}
                  </div>
                  <div className="p-1 space-y-0.5">
                    {effectiveIsAdmin && (
                      <>
                        <a
                          href="/admin/dashboard"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 font-bold hover:bg-red-50/50 transition-colors"
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
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-teal-700 font-bold hover:bg-teal-50/50 transition-colors"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Add New Home
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenActivity?.();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-700 font-medium hover:bg-stone-50 transition-colors"
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
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-700 font-medium hover:bg-stone-50 transition-colors"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Messages
                    </button>
                    <a
                      href="/my-follows"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 font-medium hover:bg-stone-50 transition-colors"
                    >
                      <UserIcon className="h-4 w-4" />
                      My Follows
                    </a>
                    <a
                      href="/my-homes"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-gray-700 font-medium hover:bg-stone-50 transition-colors"
                    >
                      <UserIcon className="h-4 w-4" />
                      My Dashboard
                    </a>
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 font-bold hover:bg-red-50/50 transition-colors"
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

      {/* 3. BOTTOM RIGHT TOOL STACK */}
      <div className="absolute bottom-24 right-4 flex flex-col gap-3 z-[900] pointer-events-auto items-end">

        {/* Layer Menu Popover */}
        {showLayerMenu && layers && (
          <div className="mb-2 p-4 rounded-3xl bg-white/95 backdrop-blur-md border border-stone-200 shadow-xl w-48 animate-in fade-in slide-in-from-right-4 duration-300">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">Map Layers</h4>
            <div className="space-y-2">
              {/* Buzz / Heat */}
              <button
                onClick={() => handleToggleLayer('heat')}
                className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Flame size={16} className={layers.heat ? "text-purple-500 fill-purple-500" : "text-gray-400"} />
                  <span className={`text-sm font-bold ${layers.heat ? "text-slate-800" : "text-slate-500"}`}>Buzz</span>
                </div>
                {layers.heat && <div className="h-2 w-2 rounded-full bg-purple-500" />}
              </button>

              {/* Schools */}
              <button
                onClick={() => handleToggleLayer('schools')}
                className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap size={16} className={layers.schools ? "text-blue-500 fill-blue-500" : "text-gray-400"} />
                  <span className={`text-sm font-bold ${layers.schools ? "text-slate-800" : "text-slate-500"}`}>Schools</span>
                </div>
                {layers.schools && <div className="h-2 w-2 rounded-full bg-blue-500" />}
              </button>

              {/* Transport */}
              <button
                onClick={() => handleToggleLayer('transport')}
                className="flex items-center justify-between w-full p-2 rounded-xl hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <TrainFront size={16} className={layers.transport ? "text-emerald-500 fill-emerald-500" : "text-gray-400"} />
                  <span className={`text-sm font-bold ${layers.transport ? "text-slate-800" : "text-slate-500"}`}>Transport</span>
                </div>
                {layers.transport && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
              </button>

              {/* Satellite (Disabled) */}
              <button
                disabled
                className="flex items-center justify-between w-full p-2 rounded-xl opacity-50 cursor-not-allowed"
              >
                <div className="flex items-center gap-2">
                  <Satellite size={16} className="text-gray-400" />
                  <span className="text-sm font-bold text-gray-400">Satellite</span>
                </div>
                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Soon</span>
              </button>
            </div>
          </div>
        )}


        {/* Legend Card (Slide-out) */}
        {showLegend && (
          <div className="mb-2 p-4 rounded-3xl bg-white/95 backdrop-blur-md border border-stone-200 shadow-xl w-64 animate-in fade-in slide-in-from-right-4 duration-300">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Map Legend</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-teal-500 shadow-sm ring-1 ring-black/5"></div>
                <span className="text-sm font-medium text-gray-700">Open to Talking</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm ring-1 ring-black/5"></div>
                <span className="text-sm font-medium text-gray-700">For Rent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm ring-1 ring-black/5"></div>
                <span className="text-sm font-medium text-gray-700">For Sale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400 shadow-sm ring-1 ring-black/5"></div>
                <span className="text-sm font-medium text-gray-700">Claimed</span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}

        {/* Layer Menu Toggle */}
        <button
          onClick={() => setShowLayerMenu(prev => !prev)}
          className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all shadow-xl border border-stone-100 ${showLayerMenu
            ? "bg-slate-800 text-white"
            : "bg-white text-slate-700 hover:bg-stone-50"
            }`}
          title="Layers"
        >
          <Layers size={20} />
        </button>

        {/* Info / Legend */}
        <button
          onClick={onToggleLegend}
          className={`h-10 w-10 flex items-center justify-center rounded-xl transition-all shadow-xl border border-stone-100 ${showLegend
            ? "bg-teal-600 text-white"
            : "bg-white text-slate-700 hover:bg-stone-50"
            }`}
          title="Legend"
        >
          <Info size={20} />
        </button>

        {/* Locate Me */}
        {onLocateMe && (
          <button
            onClick={onLocateMe}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-white text-slate-700 shadow-xl border border-stone-100 hover:bg-stone-50 transition-all"
            title="Locate Me"
          >
            <Locate size={20} />
          </button>
        )}

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white text-slate-700 shadow-xl border border-stone-100 hover:bg-stone-50 transition-all"
          title="Zoom In"
        >
          <Plus size={20} />
        </button>

        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white text-slate-700 shadow-xl border border-stone-100 hover:bg-stone-50 transition-all"
          title="Zoom Out"
        >
          <Minus size={20} />
        </button>
      </div>

    </div>
  );
}
