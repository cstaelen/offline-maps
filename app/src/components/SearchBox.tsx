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

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<GeocodeHit[]>([]);
  const [open, setOpen] = useState(false);
  // clearTimeout(undefined) is a spec-defined no-op, so no initial value is needed.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
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

  function handleSelect(hit: GeocodeHit) {
    addPoint([hit.point.lng, hit.point.lat], formatHit(hit));
    addToHistory(hit);
    setQuery("");
    setHits([]);
    setOpen(false);
  }

  const showingHistory = query.trim() === "";
  const displayedItems = showingHistory ? history : hits;

  return (
    <div className="relative w-full z-20">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => (hits.length > 0 || history.length > 0) && setOpen(true)}
        placeholder="Rechercher une adresse…"
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-monokai-border dark:bg-monokai-bg dark:text-monokai-text"
      />
      {open && (
        <ul className="absolute z-12 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-monokai-border dark:bg-monokai-bg">
          {displayedItems.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">Aucun résultat</li>
          ) : (
            displayedItems.map((hit, i) => (
              <li
                key={`${hit.point.lat},${hit.point.lng},${i}`}
                onClick={() => handleSelect(hit)}
                className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-100 dark:text-monokai-text dark:hover:bg-monokai-surface"
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
