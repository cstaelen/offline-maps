import { useEffect } from 'react'
import { Marker, Source, Layer, MapLayerMouseEvent, useMap } from 'react-map-gl/maplibre'
import type { LngLatBoundsLike } from 'maplibre-gl'
import { useRouteStore } from '../store/useRouteStore'
import { useThemeStore } from '../store/useThemeStore'

export default function RouteLayer() {
  const points = useRouteStore(s => s.points)
  const route = useRouteStore(s => s.route)
  const bbox = useRouteStore(s => s.bbox)
  const theme = useThemeStore(s => s.theme)
  // slate-500 reads fine on the light style's pale background, but is too
  // close to the dark style's near-black background to be reliably visible
  // -- slate-400 keeps roughly the same subtlety while staying legible
  // against both.
  const bboxLineColor = theme === 'dark' ? '#94a3b8' : '#64748b'
  // The default blue reads fine on the light style, but has weak contrast
  // (~2.7:1) against the Monokai Pro dark style's background -- swap to the
  // palette's own blue accent, which both fixes contrast and keeps the
  // route line visually consistent with the rest of the dark theme.
  const routeLineColor = theme === 'dark' ? '#78dce8' : '#2563eb'
  const altLineColor = theme === 'dark' ? '#5b595c' : '#94a3b8'
  const shouldFitBounds = useRouteStore(s => s.shouldFitBounds)
  const consumeFitBounds = useRouteStore(s => s.consumeFitBounds)
  const flyToCoord = useRouteStore(s => s.flyToCoord)
  const consumeFlyTo = useRouteStore(s => s.consumeFlyTo)
  const movePoint = useRouteStore(s => s.movePoint)
  const removePoint = useRouteStore(s => s.removePoint)
  const selectedPathIndex = useRouteStore(s => s.selectedPathIndex)
  const { current: map } = useMap()
  const selectedPath = route?.paths[selectedPathIndex]

  // Only auto-zoom when a new point was just added (likely off-screen) --
  // not when an existing point is nudged, reordered, or removed, where the
  // user can already see what they're adjusting and a viewport jump would
  // just be disruptive. See useRouteStore's addPoint/shouldFitBounds.
  useEffect(() => {
    if (!shouldFitBounds || !selectedPath || !map) return
    consumeFitBounds()

    const coords = selectedPath.points.coordinates
    if (coords.length === 0) return

    let minLng = coords[0][0], maxLng = coords[0][0]
    let minLat = coords[0][1], maxLat = coords[0][1]
    for (const [lng, lat] of coords) {
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
    const bounds: LngLatBoundsLike = [
      [minLng, minLat],
      [maxLng, maxLat],
    ]
    map.fitBounds(bounds, { padding: 50, duration: 500 })
  }, [shouldFitBounds, selectedPath, map, consumeFitBounds])

  // Flies to a single point (e.g. right after geolocating) when there's no
  // route yet to fit bounds to. See useRouteStore's setSinglePoint/flyToCoord.
  useEffect(() => {
    if (!flyToCoord || !map) return
    consumeFlyTo()
    map.flyTo({ center: flyToCoord, zoom: 14, duration: 800 })
  }, [flyToCoord, map, consumeFlyTo])

  // Highlights whichever alternative-route line is under the cursor (via
  // feature-state, read by route-alternatives-line/-glow's paint expressions
  // below) and swaps the cursor to a pointer, signaling it's clickable --
  // same feature-state pattern MapLibre's own examples use for hover effects,
  // since line layers have no native :hover pseudo-state. Wired directly to
  // the map's own "mousemove" event (rather than threaded through as a prop,
  // like onClick) so it only exists where a map instance is guaranteed --
  // this component, unlike App, renders inside <Map>'s MapProvider context.
  useEffect(() => {
    if (!map) return
    let hoveredId: number | null = null

    const onMouseMove = (event: MapLayerMouseEvent) => {
      const altFeature = event.features?.find(f => f.layer.id === 'route-alternatives-line')
      const nextId = typeof altFeature?.id === 'number' ? altFeature.id : null
      if (hoveredId === nextId) return

      if (hoveredId !== null) {
        map.setFeatureState({ source: 'route-alternatives', id: hoveredId }, { hover: false })
      }
      if (nextId !== null) {
        map.setFeatureState({ source: 'route-alternatives', id: nextId }, { hover: true })
      }
      hoveredId = nextId
      map.getCanvas().style.cursor = nextId !== null ? 'pointer' : ''
    }

    const onMouseLeave = () => {
      if (hoveredId !== null) {
        map.setFeatureState({ source: 'route-alternatives', id: hoveredId }, { hover: false })
        hoveredId = null
      }
      map.getCanvas().style.cursor = ''
    }

    map.on('mousemove', 'route-alternatives-line', onMouseMove)
    map.on('mouseleave', 'route-alternatives-line', onMouseLeave)
    return () => {
      map.off('mousemove', 'route-alternatives-line', onMouseMove)
      map.off('mouseleave', 'route-alternatives-line', onMouseLeave)
    }
  }, [map])

  return (
    <>
      {points.map((point, index) => (
        <Marker
          key={point.id}
          longitude={point.coord[0]}
          latitude={point.coord[1]}
          draggable
          onDragEnd={e => movePoint(point.id, [e.lngLat.lng, e.lngLat.lat])}
        >
          {/* Double-click removal is mouse-only; RouteForm's list (Task 9)
              gives keyboard/touch users an accessible way to remove a point. */}
          <div
            onDoubleClick={() => removePoint(point.id)}
            title={`${point.label ?? `Point ${index + 1}`} (double-clic pour supprimer)`}
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded-full border-2 border-white bg-blue-600 text-xs font-bold text-white shadow"
          >
            {index + 1}
          </div>
        </Marker>
      ))}

      {/* Glow effect: a wide, blurred, low-opacity line underneath the crisp
          line on top. MapLibre has no CSS-style glow filter for vector lines,
          so this is the standard way to fake one -- "line-blur" softens the
          wide copy's edges into a halo instead of a hard-edged wider stripe. */}
      {route && route.paths.length > 1 && (
        <Source
          id="route-alternatives"
          type="geojson"
          data={{
            type: 'FeatureCollection',
            features: route.paths
              .map((path, i) => ({ type: 'Feature' as const, id: i, properties: { index: i }, geometry: path.points }))
              .filter(f => f.properties.index !== selectedPathIndex),
          }}
        >
          <Layer
            id="route-alternatives-glow"
            type="line"
            paint={{
              'line-color': altLineColor,
              // Widen and brighten the hovered alternative's halo so it reads
              // as "clickable" before the user commits to the click.
              'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 14, 10],
              'line-blur': 6,
              'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.7, 0.5],
            }}
          />
          {/* Kept as the click target (CLICKABLE_LAYER_IDS below) since it's
              the narrower, more precisely-hit layer of the pair. */}
          <Layer
            id="route-alternatives-line"
            type="line"
            paint={{
              'line-color': altLineColor,
              'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 5, 4],
            }}
          />
        </Source>
      )}

      {selectedPath && (
        <Source id="route" type="geojson" data={{ type: 'Feature', properties: {}, geometry: selectedPath.points }}>
          <Layer
            id="route-glow"
            type="line"
            paint={{ 'line-color': routeLineColor, 'line-width': 16, 'line-blur': 8, 'line-opacity': 0.6 }}
          />
          <Layer
            id="route-line"
            type="line"
            paint={{ 'line-color': routeLineColor, 'line-width': 5 }}
          />
        </Source>
      )}

      {bbox && (
        <Source
          id="coverage-bbox"
          type="geojson"
          data={{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [bbox[0], bbox[1]],
                  [bbox[2], bbox[1]],
                  [bbox[2], bbox[3]],
                  [bbox[0], bbox[3]],
                  [bbox[0], bbox[1]],
                ],
              ],
            },
          }}
        >
          <Layer
            id="coverage-bbox-line"
            type="line"
            paint={{ 'line-color': bboxLineColor, 'line-width': 1.5, 'line-dasharray': [2, 2] }}
          />
        </Source>
      )}
    </>
  )
}

// Layer ids that should intercept a map click instead of letting it add a
// new point. Passed to <Map interactiveLayerIds> so MapLibre populates
// event.features for these layers only (querying every layer on every click
// would be wasteful and could match unrelated basemap features).
export const CLICKABLE_LAYER_IDS = ['route-alternatives-line']

export function useMapClickToAddPoint() {
  const addPoint = useRouteStore(s => s.addPoint)
  const selectPath = useRouteStore(s => s.selectPath)

  return (event: MapLayerMouseEvent) => {
    const altFeature = event.features?.find(f => f.layer.id === 'route-alternatives-line')
    if (altFeature) {
      const index = altFeature.properties?.index
      if (typeof index === 'number') selectPath(index)
      return
    }
    addPoint([event.lngLat.lng, event.lngLat.lat])
  }
}
