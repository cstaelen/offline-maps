import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from 'recharts'
import { useRouteStore } from '../store/useRouteStore'
import {
  usableMetrics,
  colorForValue,
  numericColor,
  segmentsToDistanceRanges,
  minMax,
  mergeAdjacentRanges,
} from '../lib/routeMetrics'

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

const METRIC_LABELS: Record<string, string> = {
  elevation: 'Élévation',
  country: 'Pays',
  road_class: 'Classe de route',
  road_environment: 'Environnement',
  road_access: 'Accès',
  max_speed: 'Vitesse max',
  surface: 'Revêtement',
  smoothness: 'État de la route',
  roundabout: 'Rond-point',
}

function labelFor(name: string): string {
  return METRIC_LABELS[name] ?? name.replace(/_/g, ' ')
}

export default function RouteDetails() {
  const route = useRouteStore(s => s.route)
  const selectedPathIndex = useRouteStore(s => s.selectedPathIndex)
  const path = route?.paths[selectedPathIndex]
  const [selectedMetric, setSelectedMetric] = useState('elevation')

  const chartData = useMemo(() => {
    if (!path) return null
    const coords = path.points.coordinates as [number, number, number][]
    if (coords.length < 2 || coords[0].length < 3) return null

    let cumulative = 0
    const cumulativeDistances: number[] = [0]
    const samples: Array<{ km: number; ele: number }> = [{ km: 0, ele: coords[0][2] }]

    for (let i = 1; i < coords.length; i++) {
      cumulative += haversineMeters(
        [coords[i - 1][0], coords[i - 1][1]],
        [coords[i][0], coords[i][1]],
      )
      cumulativeDistances.push(cumulative)
      samples.push({ km: cumulative / 1000, ele: coords[i][2] })
    }
    if (cumulative === 0) return null

    return { samples, cumulativeDistances, totalKm: cumulative / 1000 }
  }, [path])

  const metrics = useMemo(() => (path ? usableMetrics(path.details) : []), [path])
  const metricOptions = ['elevation', ...metrics.map(m => m.name)]
  const activeMetric = metrics.find(m => m.name === selectedMetric)

  const eleMinMax = useMemo(
    () => (chartData ? minMax(chartData.samples.map(s => s.ele)) : null),
    [chartData],
  )

  const overlays = useMemo(() => {
    if (!path || !chartData || !activeMetric || selectedMetric === 'elevation') return []
    const segments = path.details[selectedMetric]
    const ranges = segmentsToDistanceRanges(segments, chartData.cumulativeDistances)
    let colored: Array<{ startKm: number; endKm: number; color: string }>
    if (activeMetric.kind === 'numeric') {
      const nums = activeMetric.distinctValues.filter((v): v is number => typeof v === 'number')
      const { min, max } = minMax(nums)
      colored = ranges.map(r => ({
        startKm: r.startKm,
        endKm: r.endKm,
        color: typeof r.value === 'number' ? numericColor(r.value, min, max) : '#94a3b8',
      }))
    } else {
      colored = ranges.map(r => ({ startKm: r.startKm, endKm: r.endKm, color: colorForValue(r.value) }))
    }
    
    return mergeAdjacentRanges(colored)
  }, [path, chartData, activeMetric, selectedMetric])

  if (!path || !chartData || !eleMinMax) return null
  const { min: minEle, max: maxEle } = eleMinMax

  return (
    <div className="w-full space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm shadow dark:border-monokai-border dark:bg-monokai-bg dark:text-monokai-text">
      <div className="flex items-center justify-between">
        <select
          value={selectedMetric}
          onChange={e => setSelectedMetric(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-monokai-border dark:bg-monokai-surface"
        >
          {metricOptions.map(name => (
            <option key={name} value={name}>
              {labelFor(name)}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">
          {chartData.totalKm.toFixed(1)} km · {Math.round(minEle)}–{Math.round(maxEle)} m
        </span>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={chartData.samples} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="km" tickFormatter={v => `${v.toFixed(0)}`} fontSize={10} />
          <YAxis domain={['dataMin - 5', 'dataMax + 5']} fontSize={10} width={30} />
          <Tooltip
            formatter={value => [`${Math.round(Number(value))} m`, 'Altitude']}
            labelFormatter={v => `${Number(v).toFixed(1)} km`}
          />
          <Area type="monotone" dataKey="ele" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
          {overlays.map((o, i) => (
            <ReferenceArea key={i} x1={o.startKm} x2={o.endKm} fill={o.color} fillOpacity={0.35} stroke="none" />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {activeMetric && selectedMetric !== 'elevation' && activeMetric.kind !== 'numeric' && (
        <div className="flex flex-wrap gap-2 text-xs">
          {activeMetric.distinctValues.map(v => (
            <span key={String(v)} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorForValue(v) }} />
              {v === null ? 'Non renseigné' : String(v)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
