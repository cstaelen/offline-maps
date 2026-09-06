import { useMemo, useState } from 'react'
import { Download, ChevronDown, ChevronUp } from 'lucide-react'
import { useRouteStore } from '../store/useRouteStore'
import { buildGpxUrl } from '../api/graphhopper'
import { getDirectionIcon } from '../lib/directionIcons'

const INCLINE_BUCKETS = [
  { label: '>10%', min: 10, max: Infinity, color: '#dc2626' },
  { label: '6-10%', min: 6, max: 10, color: '#f87171' },
  { label: '3-6%', min: 3, max: 6, color: '#fb923c' },
  { label: '-6..3%', min: -6, max: 3, color: '#22c55e' },
  { label: '-10..-6%', min: -10, max: -6, color: '#60a5fa' },
  { label: '<-10%', min: -Infinity, max: -10, color: '#2563eb' },
]

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const lat1 = toRad(a[1])
  const lat2 = toRad(b[1])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default function RouteInstructions() {
  const route = useRouteStore(s => s.route)
  const selectedPathIndex = useRouteStore(s => s.selectedPathIndex)
  const path = route?.paths[selectedPathIndex]
  const points = useRouteStore(s => s.points)
  const profile = useRouteStore(s => s.profile)
  const setHoveredInstructionInterval = useRouteStore(s => s.setHoveredInstructionInterval)
  const [collapsed, setCollapsed] = useState(false)

  const inclineBuckets = useMemo(() => {
    if (!path) return null
    const coords = path.points.coordinates as [number, number, number][]
    if (coords.length < 2) return null

    const totals = INCLINE_BUCKETS.map(() => 0)
    for (let i = 1; i < coords.length; i++) {
      const dist = haversineMeters([coords[i - 1][0], coords[i - 1][1]], [coords[i][0], coords[i][1]])
      if (dist === 0) continue
      const gradePercent = ((coords[i][2] - coords[i - 1][2]) / dist) * 100
      const bucketIndex = INCLINE_BUCKETS.findIndex(b => gradePercent > b.min && gradePercent <= b.max)
      if (bucketIndex !== -1) totals[bucketIndex] += dist
    }
    const totalDist = totals.reduce((a, b) => a + b, 0)
    if (totalDist === 0) return null
    return INCLINE_BUCKETS.map((b, i) => ({ ...b, meters: totals[i], pct: (totals[i] / totalDist) * 100 }))
  }, [path])

  if (!path) return null

  const gpxUrl = buildGpxUrl(
    points.map(p => p.coord),
    profile,
  )

  return (
    <div className="w-full space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm shadow dark:border-monokai-border dark:bg-monokai-bg dark:text-monokai-text">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{Math.round(path.time / 60000)} min</span>
          <span className="ml-2 text-slate-500">{(path.distance / 1000).toFixed(1)} km</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={gpxUrl}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-monokai-surface"
            aria-label="Télécharger au format GPX"
            title="Télécharger au format GPX"
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            GPX
          </a>
          <button
            onClick={() => setCollapsed(c => !c)}
            aria-label={collapsed ? 'Afficher les instructions' : 'Cacher les instructions'}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-monokai-text"
          >
            {collapsed ? <ChevronDown aria-hidden="true" className="h-4 w-4" /> : <ChevronUp aria-hidden="true" className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {inclineBuckets && (
        <div className="space-y-1">
          <div className="flex h-2 overflow-hidden rounded-full">
            {inclineBuckets.map(b => (
              <div key={b.label} style={{ width: `${b.pct}%`, backgroundColor: b.color }} title={`${b.label}: ${Math.round(b.meters)} m`} />
            ))}
          </div>
        </div>
      )}

      {!collapsed && (
        <ul className="max-h-64 space-y-1 overflow-y-auto">
          {path.instructions.map((instruction, i) => {
            const Icon = getDirectionIcon(instruction.sign)
            return (
              <li
                key={i}
                className="flex items-start gap-2 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-monokai-surface"
                onMouseEnter={() => setHoveredInstructionInterval(instruction.interval)}
                onMouseLeave={() => setHoveredInstructionInterval(null)}
              >
                <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{instruction.text}</p>
                  {instruction.distance > 0 && (
                    <p className="text-xs text-slate-400">
                      {instruction.distance >= 1000
                        ? `${(instruction.distance / 1000).toFixed(1)} km`
                        : `${Math.round(instruction.distance)} m`}
                    </p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
