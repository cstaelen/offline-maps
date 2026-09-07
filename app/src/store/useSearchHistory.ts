import { useCallback, useState } from "react";
import { GeocodeHit } from "../api/photon";

const STORAGE_KEY = "mapstack-search-history";
const MAX_ENTRIES = 10;

function readHistory(): GeocodeHit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(hits: GeocodeHit[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hits));
  } catch {
    // localStorage unavailable (private browsing, quota) — history just won't persist.
  }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<GeocodeHit[]>(readHistory);

  const addToHistory = useCallback((hit: GeocodeHit) => {
    setHistory((prev) => {
      const deduped = prev.filter(
        (h) => h.point.lat !== hit.point.lat || h.point.lng !== hit.point.lng,
      );
      const next = [hit, ...deduped].slice(0, MAX_ENTRIES);
      writeHistory(next);
      return next;
    });
  }, []);

  return { history, addToHistory };
}
