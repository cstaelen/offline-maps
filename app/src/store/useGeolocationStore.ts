import { create } from "zustand";

interface GeolocationStoreState {
  position: [number, number] | null;
  error: string | null;
  // True when `position` is from a fix older than the most recent (failed)
  // attempt -- e.g. the user clicked again and got denied/timed out. The
  // marker stays on the map (still useful) but should look visually
  // untrusted rather than silently pretending it's current.
  stale: boolean;
  setPosition: (position: [number, number] | null) => void;
  setError: (error: string | null) => void;
}

export const useGeolocationStore = create<GeolocationStoreState>((set) => ({
  position: null,
  error: null,
  stale: false,
  setPosition: (position) => set({ position, error: null, stale: false }),
  setError: (error) => set((state) => ({ error, stale: state.position !== null })),
}));
