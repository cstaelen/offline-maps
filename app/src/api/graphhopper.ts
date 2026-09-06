export interface RoutingProfile {
  name: string
}

export interface RoutingInfo {
  profiles: RoutingProfile[]
  bbox: [number, number, number, number]
  encoded_values: Record<string, unknown>
}

export interface Instruction {
  text: string
  distance: number // meters
  time: number // ms
  // GraphHopper turn-instruction sign code (small fixed vocabulary, e.g. 0 =
  // continue straight, 6 = roundabout). See directionIcons.tsx for the
  // sign -> icon mapping -- keep that as the single source of truth for the
  // full value list rather than duplicating it here.
  sign: number
  street_name: string
  interval: [number, number] // indices into the decoded points array
  exit_number?: number
}

// GraphHopper path_details are [startPointIndex, endPointIndex, value] triples.
// value's type varies by detail name: string (road_class, country, ...),
// boolean (roundabout, car_access, ...), number (max_speed, ...), or null
// (e.g. max_speed on an unrestricted way). Consumers must not assume a type.
export type DetailSegment = [number, number, string | number | boolean | null]
export type RouteDetails = Record<string, DetailSegment[]>

export interface RoutePath {
  points: GeoJSON.LineString
  distance: number
  time: number
  ascend: number
  descend: number
  instructions: Instruction[]
  details: RouteDetails
}

export interface RouteResult {
  paths: RoutePath[]
}

interface RawPath {
  points: string
  points_encoded: boolean
  points_encoded_multiplier?: number
  distance: number
  time: number
  ascend?: number
  descend?: number
  instructions?: Instruction[]
  details?: RouteDetails
}

interface RawRouteResponse {
  paths: RawPath[]
  message?: string
}

const ROUTING_BASE = '/routing/'

export async function getRoutingInfo(): Promise<RoutingInfo> {
  const response = await fetch(ROUTING_BASE + 'info', {
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`GraphHopper /info failed: ${response.status}`)
  return response.json()
}

export async function route(
  points: Array<[number, number]>,
  profile: string,
  detailNames: string[] = [],
  alternatives: boolean = false,
): Promise<RouteResult> {
  const response = await fetch(ROUTING_BASE + 'route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      points,
      profile,
      points_encoded: true,
      instructions: true,
      elevation: true,
      details: detailNames,
      // GraphHopper only computes alternatives for a plain 2-point request
      // (algorithm defaults to "alternative_route" needs origin+destination,
      // not a multi-waypoint route) -- callers must not pass true otherwise.
      ...(alternatives && {
        algorithm: 'alternative_route',
        'alternative_route.max_paths': 3,
      }),
    }),
  })

  const result = (await response.json()) as RawRouteResponse

  if (!response.ok) {
    throw new Error(result.message ?? `GraphHopper /route failed: ${response.status}`)
  }

  if (result.paths.length === 0) {
    throw new Error(result.message ?? 'GraphHopper /route returned no paths')
  }

  return {
    paths: result.paths.map(path => ({
      points: {
        type: 'LineString',
        coordinates: decodePath(path.points, path.points_encoded_multiplier ?? 1e5),
      },
      distance: path.distance,
      time: path.time,
      ascend: path.ascend ?? 0,
      descend: path.descend ?? 0,
      instructions: path.instructions ?? [],
      details: path.details ?? {},
    })),
  }
}

// GraphHopper's GET-based /route endpoint supports type=gpx natively, so no
// client-side GPX generation is needed -- just build the URL. Note the
// coordinate order flip: this app's internal convention is [lng, lat]
// everywhere else, but GraphHopper's GET query parameter format expects
// lat,lon for the `point` param. This is the only place that needs the flip.
export function buildGpxUrl(points: Array<[number, number]>, profile: string): string {
  const url = new URL(ROUTING_BASE + 'route', window.location.origin)
  for (const [lng, lat] of points) {
    url.searchParams.append('point', `${lat},${lng}`)
  }
  url.searchParams.set('profile', profile)
  url.searchParams.set('type', 'gpx')
  return url.toString()
}

// Ported from docker/graphhopper-maps/Api.ts (ApiImpl.decodePath). Always
// decodes 3 values (lng, lat, elevation) since `elevation: true` is always
// requested above — GraphHopper always returns 3D-encoded points in that case.
function decodePath(encoded: string, multiplier: number): number[][] {
  const len = encoded.length
  let index = 0
  const array: number[][] = []
  let lat = 0
  let lng = 0
  let ele = 0

  while (index < len) {
    let b
    let shift = 0
    let result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1
    lat += deltaLat

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const deltaLon = result & 1 ? ~(result >> 1) : result >> 1
    lng += deltaLon

    shift = 0
    result = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const deltaEle = result & 1 ? ~(result >> 1) : result >> 1
    ele += deltaEle

    array.push([lng / multiplier, lat / multiplier, ele / 100])
  }
  return array
}
