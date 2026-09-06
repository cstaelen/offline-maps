import { create } from 'zustand'
import { getRoutingInfo, route as fetchRoute, RouteResult } from '../api/graphhopper'

export interface RoutePoint {
  id: string
  coord: [number, number] // [lng, lat]
  label?: string
}

type Status = 'idle' | 'loading' | 'error'

interface RouteStoreState {
  points: RoutePoint[]
  profile: string
  availableProfiles: string[]
  route: RouteResult | null
  status: Status
  errorMessage?: string
  // Geographic extent of the imported OSM data, from GraphHopper's /info
  // endpoint. Routing/geocoding only work inside this area. Null until
  // loadProfiles() resolves.
  bbox: [number, number, number, number] | null

  // Set when a route recompute is worth auto-zooming the map for (a new point
  // was added, likely somewhere off-screen) vs. not (an existing point was
  // nudged/reordered/removed, where the user can already see what they're
  // adjusting and a viewport jump would just be disruptive). RouteLayer reads
  // and clears this after acting on it.
  shouldFitBounds: boolean
  consumeFitBounds: () => void

  // Set when the map should fly to a single point rather than fit bounds to
  // a route -- used when only one point exists yet (e.g. right after
  // geolocating, before a second point makes a route/bbox possible).
  // RouteLayer reads and clears this after acting on it, same pattern as
  // shouldFitBounds.
  flyToCoord: [number, number] | null
  consumeFlyTo: () => void

  // Names of every path_detail GraphHopper can report, read once from
  // /info's encoded_values keys. Passed to route() so the server returns all
  // of them — RouteDetails then filters down to only the ones with more than
  // one distinct value on the current route (a single-value detail, e.g. a
  // route entirely in one country, isn't worth a chart view).
  // Assumes loadProfiles() runs at most once per app lifetime (true today --
  // no retry/reconnect path exists). If one is ever added, revisit whether a
  // stale detailNames from a first, possibly-degraded load should be
  // refreshed too (low risk in practice: this reflects GraphHopper's own
  // deployment config, which only changes on a redeploy anyway).
  detailNames: string[]

  // Written by the turn-by-turn instruction list, read by the map layer to
  // highlight the corresponding segment. Kept in this store rather than a
  // separate one (unlike theme/geolocation) because it's meaningless without
  // route/points, and every consumer here already uses field-level selectors,
  // so co-locating it causes no extra re-renders.
  hoveredInstructionInterval: [number, number] | null
  setHoveredInstructionInterval: (interval: [number, number] | null) => void

  // Index into route.paths of the currently displayed/selected alternative.
  // Only meaningful when route has more than one path (a plain 2-point
  // request with alternatives). Reset to 0 on every new route calculation.
  selectedPathIndex: number
  selectPath: (index: number) => void

  loadProfiles: () => Promise<void>
  setProfile: (profile: string) => void
  addPoint: (coord: [number, number], label?: string) => void
  movePoint: (id: string, coord: [number, number]) => void
  removePoint: (id: string) => void
  reorderPoints: (fromIndex: number, toIndex: number) => void
  clearPoints: () => void
  // Replaces the route with a single point (e.g. "My position" from
  // geolocation) and asks the map to fly there. Distinct from addPoint,
  // which appends to whatever route already exists.
  setSinglePoint: (coord: [number, number], label?: string) => void

  // Internal helper (not meant to be called by components), kept on the
  // interface rather than bolted on via `as any` so the store stays fully typed.
  _recalculate: () => Promise<void>
}

function newPointId() {
  return Math.random().toString(36).slice(2)
}

// Persists points + profile across page reloads. Route itself is not
// persisted (it's cheap to recompute once points/profile are restored, and
// storing a full RouteResult, including its polyline/details, would bloat
// localStorage for little benefit -- _recalculate() runs again on restore).
const PERSIST_KEY = 'mapstackui-route'

interface PersistedRoute {
  points: RoutePoint[]
  profile: string
}

function readPersistedRoute(): PersistedRoute | null {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed.points) || typeof parsed.profile !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function writePersistedRoute(points: RoutePoint[], profile: string) {
  try {
    if (points.length === 0) {
      localStorage.removeItem(PERSIST_KEY)
    } else {
      localStorage.setItem(PERSIST_KEY, JSON.stringify({ points, profile }))
    }
  } catch {
    // localStorage unavailable (private browsing, quota) -- just won't persist.
  }
}

export const useRouteStore = create<RouteStoreState>((set, get) => {
  // Guards against out-of-order responses: if the user moves a point again
  // before the previous route request resolves, the stale response is dropped.
  // Scoped to this store instance (not module-level) so multiple stores never
  // share a counter.
  let recalculateRequestId = 0

  // Writes the store's current points/profile to localStorage. Always reads
  // fresh via get() (called after the set() that changed state), never takes
  // points/profile as arguments, so a future action can't accidentally pass
  // stale pre-mutation values.
  function persist() {
    writePersistedRoute(get().points, get().profile)
  }

  return {
    points: [],
    profile: '',
    availableProfiles: [],
    route: null,
    status: 'idle',
    errorMessage: undefined,
    bbox: null,
    shouldFitBounds: false,
    consumeFitBounds: () => set({ shouldFitBounds: false }),

    flyToCoord: null,
    consumeFlyTo: () => set({ flyToCoord: null }),

    detailNames: [],
    hoveredInstructionInterval: null,
    setHoveredInstructionInterval: interval => set({ hoveredInstructionInterval: interval }),

    selectedPathIndex: 0,
    selectPath: index => set({ selectedPathIndex: index }),

    loadProfiles: async () => {
      try {
        const info = await getRoutingInfo()
        const names = info.profiles.map(p => p.name)
        const persisted = readPersistedRoute()
        // Only trust a persisted profile if it's still offered by this
        // GraphHopper instance -- a stale value from a previous deployment
        // (or a config change) should fall back to the normal default.
        const restoredProfile =
          persisted && names.includes(persisted.profile) ? persisted.profile : (names[0] ?? '')
        set({
          availableProfiles: names,
          profile: restoredProfile,
          bbox: info.bbox,
          detailNames: Object.keys(info.encoded_values ?? {}),
          points: persisted?.points ?? [],
          // Fit the map to the restored route on load, same as a freshly
          // added point -- the map's default view (centered on Paris) has
          // nothing to do with a restored route that could be anywhere.
          shouldFitBounds: Boolean(persisted && persisted.points.length >= 2),
        })
        if (persisted && persisted.points.length >= 2) get()._recalculate()
      } catch (err) {
        console.error('Failed to load routing profiles', err)
        set({ status: 'error', errorMessage: 'Service de routing indisponible' })
      }
    },

    setProfile: (profile: string) => {
      if (profile === get().profile) return
      set({ profile })
      persist()
      get()._recalculate()
    },

    addPoint: (coord, label) => {
      set(state => ({ points: [...state.points, { id: newPointId(), coord, label }], shouldFitBounds: true }))
      persist()
      get()._recalculate()
    },

    movePoint: (id, coord) => {
      set(state => ({
        points: state.points.map(p => (p.id === id ? { ...p, coord } : p)),
      }))
      persist()
      get()._recalculate()
    },

    removePoint: (id: string) => {
      set(state => ({ points: state.points.filter(p => p.id !== id) }))
      persist()
      const remaining = get().points
      if (remaining.length < 2) {
        set({ route: null, status: 'idle', errorMessage: undefined })
      } else {
        get()._recalculate()
      }
    },

    reorderPoints: (fromIndex: number, toIndex: number) => {
      set(state => {
        const points = [...state.points]
        const [moved] = points.splice(fromIndex, 1)
        points.splice(toIndex, 0, moved)
        return { points }
      })
      persist()
      get()._recalculate()
    },

    clearPoints: () => {
      set({ points: [], route: null, status: 'idle', errorMessage: undefined })
      persist()
    },

    setSinglePoint: (coord, label) => {
      set({
        points: [{ id: newPointId(), coord, label }],
        route: null,
        status: 'idle',
        errorMessage: undefined,
        flyToCoord: coord,
      })
      persist()
    },

    _recalculate: async () => {
      const { points, profile, detailNames } = get()
      if (points.length < 2 || !profile) return

      const requestId = ++recalculateRequestId
      set({ status: 'loading', errorMessage: undefined })
      try {
        const coords = points.map(p => p.coord)
        // Alternatives only make sense for a plain origin->destination trip --
        // GraphHopper's alternative_route algorithm doesn't support routing
        // through intermediate waypoints. See route()'s alternatives param.
        const result = await fetchRoute(coords, profile, detailNames, points.length === 2)
        if (requestId !== recalculateRequestId) return // superseded by a newer request
        set({ route: result, status: 'idle', selectedPathIndex: 0 })
      } catch (err) {
        if (requestId !== recalculateRequestId) return // superseded by a newer request
        // Clear shouldFitBounds here too: a failed request means RouteLayer's
        // effect never got a route to zoom to and never consumed the flag --
        // leaving it set would auto-zoom on some later, unrelated route change.
        set({
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Erreur de routing',
          shouldFitBounds: false,
        })
      }
    },
  }
})
