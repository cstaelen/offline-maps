import { useEffect, useRef, useState } from "react";
import { History } from "lucide-react";
import { geocode, GeocodeHit } from "../api/photon";
import { useRouteStore } from "../store/useRouteStore";
import { useSearchHistory } from "../store/useSearchHistory";

function formatHit(hit: GeocodeHit): string {
  const address = [
    hit.housenumber && hit.street ? `${hit.housenumber} ${hit.street}` : hit.street,
    hit.city,
    hit.country,
  ].filter(Boolean);

  if (!hit.name || address.includes(hit.name)) return address.join(", ");
  return [hit.name, ...address].join(", ");
}

export default function SearchBox({ onSelect }: { onSelect?: () => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // clearTimeout(undefined) is a spec-defined no-op, so no initial value is needed.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const addPoint = useRouteStore((s) => s.addPoint);
  const { history, addToHistory } = useSearchHistory();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setHits([]);
      return;
    }
    let cancelled = false;
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await geocode(query);
        if (cancelled) return;
        setHits(results);
        setOpen(true);
      } catch {
        if (cancelled) return;
        setHits([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(debounceRef.current);
    };
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  function handleSelect(hit: GeocodeHit) {
    addPoint([hit.point.lng, hit.point.lat], formatHit(hit));
    addToHistory(hit);
    setQuery("");
    setHits([]);
    setOpen(false);
    onSelect?.();
  }

  const showingHistory = query.trim() === "";
  const displayedItems = showingHistory ? history : hits;

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      e.currentTarget.blur();
      return;
    }
    if (!open || displayedItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % displayedItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? displayedItems.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < displayedItems.length) {
        e.preventDefault();
        handleSelect(displayedItems[activeIndex]);
      }
    }
  }

  return (
    <div ref={containerRef} className="relative w-full z-20">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(-1);
        }}
        onFocus={() => (hits.length > 0 || history.length > 0) && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search for an address…"
        role="combobox"
        aria-expanded={open}
        aria-controls="search-box-listbox"
        aria-activedescendant={activeIndex >= 0 ? `search-box-option-${activeIndex}` : undefined}
        autoComplete="off"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-monokai-border dark:bg-monokai-bg dark:text-monokai-text"
      />
      {open && (
        <ul
          id="search-box-listbox"
          role="listbox"
          className="absolute z-12 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-monokai-border dark:bg-monokai-bg"
        >
          {displayedItems.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No results</li>
          ) : (
            displayedItems.map((hit, i) => (
              <li
                key={`${hit.point.lat},${hit.point.lng},${i}`}
                id={`search-box-option-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => handleSelect(hit)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm dark:text-monokai-text ${
                  i === activeIndex
                    ? "bg-slate-100 dark:bg-monokai-surface"
                    : "hover:bg-slate-100 dark:hover:bg-monokai-surface"
                }`}
              >
                {showingHistory && (
                  <History className="h-4 w-4 text-slate-400" aria-hidden="true" />
                )}
                {formatHit(hit)}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
