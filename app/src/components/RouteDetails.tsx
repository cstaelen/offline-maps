import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { useRouteStore } from "../store/useRouteStore";
import {
  usableMetrics,
  colorForValue,
  numericColor,
  segmentsToDistanceRanges,
  minMax,
  mergeAdjacentRanges,
} from "../lib/routeMetrics";

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const METRIC_LABELS: Record<string, string> = {
  elevation: "Elevation",
  country: "Country",
  road_class: "Road class",
  road_environment: "Environment",
  road_access: "Access",
  max_speed: "Max speed",
  surface: "Surface",
  smoothness: "Road condition",
  roundabout: "Roundabout",
};

function labelFor(name: string): string {
  return METRIC_LABELS[name] ?? name.replace(/_/g, " ");
}

function formatMetricValue(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "Unspecified";
  return String(value);
}

function ChartTooltip({
  active,
  label,
  value,
}: {
  active?: boolean;
  label?: string | number;
  value?: string;
}) {
  if (!active) return null;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs shadow-md dark:border-monokai-border dark:bg-monokai-bg">
      <p className="font-medium text-slate-900 dark:text-monokai-text">{value}</p>
      <p className="text-slate-400 dark:text-monokai-muted">
        {typeof label === "number" ? `${label.toFixed(1)} km` : label}
      </p>
    </div>
  );
}

export default function RouteDetails() {
  const route = useRouteStore((s) => s.route);
  const selectedPathIndex = useRouteStore((s) => s.selectedPathIndex);
  const path = route?.paths[selectedPathIndex];
  const [selectedMetric, setSelectedMetric] = useState("elevation");
  const [expanded, setExpanded] = useState(false);
  const [expandedTop, setExpandedTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  function toggleExpanded() {
    if (!expanded && containerRef.current) {
      setExpandedTop(containerRef.current.getBoundingClientRect().top);
    }
    setExpanded((e) => !e);
  }

  const chartData = useMemo(() => {
    if (!path) return null;
    const coords = path.points.coordinates as [number, number, number][];
    if (coords.length < 2 || coords[0].length < 3) return null;

    let cumulative = 0;
    const cumulativeDistances: number[] = [0];
    const samples: Array<{ km: number; ele: number }> = [{ km: 0, ele: coords[0][2] }];

    for (let i = 1; i < coords.length; i++) {
      cumulative += haversineMeters(
        [coords[i - 1][0], coords[i - 1][1]],
        [coords[i][0], coords[i][1]],
      );
      cumulativeDistances.push(cumulative);
      samples.push({ km: cumulative / 1000, ele: coords[i][2] });
    }
    if (cumulative === 0) return null;

    return { samples, cumulativeDistances, totalKm: cumulative / 1000 };
  }, [path]);

  const metrics = useMemo(() => (path ? usableMetrics(path.details) : []), [path]);
  const metricOptions = chartData
    ? ["elevation", ...metrics.map((m) => m.name)]
    : metrics.map((m) => m.name);
  const activeMetric = metrics.find((m) => m.name === selectedMetric);

  useEffect(() => {
    if (!metricOptions.includes(selectedMetric)) {
      setSelectedMetric(metricOptions[0] ?? "elevation");
    }
  }, [metricOptions, selectedMetric]);

  const eleMinMax = useMemo(
    () => (chartData ? minMax(chartData.samples.map((s) => s.ele)) : null),
    [chartData],
  );

  const metricRanges = useMemo(() => {
    if (!path || !chartData || !activeMetric || selectedMetric === "elevation") return [];
    const segments = path.details[selectedMetric];
    return segmentsToDistanceRanges(segments, chartData.cumulativeDistances);
  }, [path, chartData, activeMetric, selectedMetric]);

  const overlays = useMemo(() => {
    if (!activeMetric || selectedMetric === "elevation") return [];
    let colored: Array<{ startKm: number; endKm: number; color: string }>;
    if (activeMetric.kind === "numeric") {
      const nums = activeMetric.distinctValues.filter((v): v is number => typeof v === "number");
      const { min, max } = minMax(nums);
      colored = metricRanges.map((r) => ({
        startKm: r.startKm,
        endKm: r.endKm,
        color: typeof r.value === "number" ? numericColor(r.value, min, max) : "#94a3b8",
      }));
    } else {
      colored = metricRanges.map((r) => ({
        startKm: r.startKm,
        endKm: r.endKm,
        color: colorForValue(r.value),
      }));
    }

    return mergeAdjacentRanges(colored);
  }, [metricRanges, activeMetric, selectedMetric]);

  function valueAtKm(km: number): string | number | boolean | null | undefined {
    const range = metricRanges.find((r) => km >= r.startKm && km <= r.endKm);
    return range?.value;
  }

  if (!path || !chartData || !eleMinMax) return null;
  const { min: minEle, max: maxEle } = eleMinMax;

  return (
    <div
      ref={containerRef}
      style={expanded ? { top: expandedTop } : undefined}
      className={`space-y-2 rounded-md border border-slate-200 bg-white p-3 text-sm shadow dark:border-monokai-border dark:bg-monokai-bg dark:text-monokai-text ${
        expanded ? "fixed inset-x-4 z-40 md:inset-x-8" : "w-full"
      }`}
    >
      <div className="flex items-center justify-between">
        <select
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs dark:border-monokai-border dark:bg-monokai-surface"
        >
          {metricOptions.map((name) => (
            <option key={name} value={name}>
              {labelFor(name)}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            {chartData.totalKm.toFixed(1)} km · {Math.round(minEle)}–{Math.round(maxEle)} m
          </span>
          <button
            onClick={toggleExpanded}
            aria-label={expanded ? "Collapse panel" : "Expand panel"}
            title={expanded ? "Collapse panel" : "Expand panel"}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-monokai-text"
          >
            {expanded ? (
              <Minimize2 aria-hidden="true" className="h-4 w-4" />
            ) : (
              <Maximize2 aria-hidden="true" className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={chartData.samples} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="km" tickFormatter={(v) => `${v.toFixed(0)}`} fontSize={10} />
          <YAxis domain={["dataMin - 5", "dataMax + 5"]} fontSize={10} width={30} />
          <Tooltip
            cursor={{ stroke: "currentColor", strokeOpacity: 0.3 }}
            content={({ active, label, payload }) => {
              const km = payload?.[0]?.payload?.km;
              const value =
                selectedMetric === "elevation"
                  ? `${Math.round(Number(payload?.[0]?.value))} m`
                  : formatMetricValue(valueAtKm(Number(km)));
              return <ChartTooltip active={active} label={label} value={value} />;
            }}
          />
          <Area type="monotone" dataKey="ele" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} />
          {overlays.map((o, i) => (
            <ReferenceArea
              key={i}
              x1={o.startKm}
              x2={o.endKm}
              fill={o.color}
              fillOpacity={0.35}
              stroke="none"
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>

      {activeMetric && selectedMetric !== "elevation" && activeMetric.kind !== "numeric" && (
        <div className="flex flex-wrap gap-2 text-xs">
          {activeMetric.distinctValues.map((v) => (
            <span key={String(v)} className="flex items-center gap-1">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorForValue(v) }}
              />
              {v === null ? "Unspecified" : String(v)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
