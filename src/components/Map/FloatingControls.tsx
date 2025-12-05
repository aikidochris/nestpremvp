import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { User as UserIcon, LogOut as LogOutIcon, Menu as MenuIcon } from "lucide-react";

type FilterValue = "all" | "open" | "claimed";

interface FloatingControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onLocationSelect: (lat: number, lon: number) => void;
  activeFilter: FilterValue;
  onFilterChange: (value: FilterValue) => void;
  isListOpen?: boolean;
  onToggleList?: () => void;
  currentUser?: { email?: string | null } | null;
  onLogout?: () => void;
  onOpenInbox?: () => void;
}

const chips: Array<{ label: string; value: FilterValue; activeClass?: string }> = [
  { label: "Show All", value: "all" },
  { label: "Open to Talking", value: "open", activeClass: "bg-primary text-white" },
  { label: "Claimed", value: "claimed", activeClass: "bg-secondary text-white" },
];

export default function FloatingControls({
  searchQuery,
  onSearchChange,
  onLocationSelect,
  activeFilter,
  onFilterChange,
  isListOpen,
  onToggleList,
  currentUser,
  onLogout,
  onOpenInbox,
}: FloatingControlsProps) {
  const [suggestions, setSuggestions] = useState<Array<{ display_name: string; lat: string; lon: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement | null>(null);
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

  return (
    <div className="pointer-events-none absolute top-4 left-0 right-0 z-50 px-4">
      <div className="relative flex flex-col gap-3">
        <div className="relative flex items-center gap-3">
          <div className="pointer-events-auto flex items-center gap-3 w-full max-w-3xl">
            {onToggleList && (
              <button
                type="button"
                onClick={onToggleList}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 backdrop-blur-md text-brand-dark font-bold shadow-md ring-1 ring-gray-100 border border-gray-100"
                aria-label={isListOpen ? "Hide list" : "Show list"}
              >
                <MenuIcon className="h-5 w-5" />
              </button>
            )}
            <a
              href="/"
              className="hidden sm:block select-none cursor-pointer font-bold text-2xl tracking-tight text-brand-dark"
            >
              Nest
            </a>
            <div className="relative w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                onKeyDown={handleKeyDown}
                ref={inputRef}
                placeholder="Search streets, postcodes..."
                className="w-full rounded-full bg-white/80 backdrop-blur-md shadow-xl border border-white/20 px-4 py-3 pl-10 text-sm font-medium text-brand-dark placeholder:text-slate-400 ring-1 ring-slate-200/60 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl bg-white/95 backdrop-blur-md shadow-2xl ring-1 ring-slate-200 z-[100]">
                  {suggestions.map((item, idx) => (
                    <button
                      key={`${item.display_name}-${idx}`}
                      type="button"
                      onClick={() => handleSuggestionClick(item)}
                      className={`flex w-full items-start p-3 text-left text-sm text-slate-700 hover:bg-teal-50 cursor-pointer border-t border-slate-100 first:border-t-0 truncate ${
                        idx === highlightedIndex ? "bg-teal-50" : ""
                      }`}
                    >
                      <span className="truncate">{item.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="pointer-events-auto absolute top-0 right-0">
            {!currentUser ? (
              <a
                href="/auth/login"
                className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-[#006868] transition"
              >
                Log in
              </a>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur-md text-brand-dark font-bold shadow-md ring-1 ring-gray-100 border border-gray-100"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  {emailInitial}
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-xl border border-gray-100 p-2">
                    <div className="text-xs text-gray-500 px-3 py-2 border-b border-gray-100 truncate">
                      {currentUser.email}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onOpenInbox?.();
                      }}
                      className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Messages
                    </button>
                    <a
                      href="/my-follows"
                      onClick={() => setMenuOpen(false)}
                      className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <UserIcon className="h-4 w-4" />
                      My Follows
                    </a>
                    <a
                      href="/my-homes"
                      onClick={() => setMenuOpen(false)}
                      className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <UserIcon className="h-4 w-4" />
                      My Dashboard
                    </a>
                    <button
                      type="button"
                      onClick={handleLogoutClick}
                      className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOutIcon className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1">
          {chips.map((chip) => {
            const isActive = activeFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => onFilterChange(chip.value)}
                className={[
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition",
                  isActive
                    ? chip.activeClass ?? "bg-slate-900 text-white"
                    : "bg-white/90 backdrop-blur-sm shadow-sm text-slate-700 border-slate-200 hover:border-primary hover:text-primary",
                ].join(" ")}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
