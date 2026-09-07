import type { DetailSegment, RouteDetails } from "../api/graphhopper";

export type MetricKind = "categorical" | "boolean" | "numeric";

export interface MetricInfo {
  name: string;
  kind: MetricKind;
  distinctValues: Array<string | number | boolean | null>;
}

// Only metrics with more than one distinct value on the current route are
// worth a chart view -- a route entirely in one country, or entirely
// 'road_access: yes', has nothing to visualize.
export function usableMetrics(details: RouteDetails): MetricInfo[] {
  const result: MetricInfo[] = [];
  for (const [name, segments] of Object.entries(details)) {
    const values = Array.from(new Set(segments.map((s) => s[2])));
    if (values.length < 2) continue;
    result.push({ name, kind: detectKind(values), distinctValues: values });
  }
  return result;
}

function detectKind(values: Array<string | number | boolean | null>): MetricKind {
  const nonNull = values.filter((v) => v !== null);
  if (nonNull.every((v) => typeof v === "boolean")) return "boolean";
  if (nonNull.every((v) => typeof v === "number")) return "numeric";
  return "categorical";
}

// Deterministic color per distinct categorical value, so the same value
// (e.g. "primary" road class) always gets the same color across renders
// without maintaining a hand-written palette per possible OSM value.
//
// Hue is quantized to 12 buckets (30 degrees apart) rather than using the
// raw hash mod 360: two unrelated values (e.g. OSM road_class "secondary"
// vs "tertiary", or neighboring country codes) can otherwise hash to hues a
// few degrees apart -- indistinguishable as adjacent chart bands. 12 buckets
// still requires no per-metric knowledge (any string hashes into the same
// fixed set), at the cost of two unrelated values occasionally sharing a
// bucket exactly instead of merely being close.
const HUE_BUCKETS = 12;
export function colorForValue(value: string | number | boolean | null): string {
  if (value === null) return "#94a3b8"; // slate-400, "not set"
  const str = String(value);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const hue = (Math.abs(hash) % HUE_BUCKETS) * (360 / HUE_BUCKETS);
  return `hsl(${hue}, 65%, 55%)`;
}

// Maps a numeric value to a green->red gradient position between the
// observed min/max for that metric on the current route (not a fixed global
// scale, since e.g. max_speed's meaningful range differs hugely between a
// foot profile and a car profile).
export function numericColor(value: number, min: number, max: number): string {
  const range = Math.max(max - min, 1);
  const t = (value - min) / range;
  const hue = 120 - t * 120; // 120=green (low) -> 0=red (high)
  return `hsl(${hue}, 70%, 50%)`;
}

// Converts a detail's [startIdx, endIdx, value] segments (indices into the
// decoded points array) into [startDistanceKm, endDistanceKm] ranges, using
// a precomputed cumulative-distance-per-point array (see RouteDetails.tsx).
export function segmentsToDistanceRanges(
  segments: DetailSegment[],
  cumulativeDistances: number[],
): Array<{ startKm: number; endKm: number; value: DetailSegment[2] }> {
  return segments.map(([startIdx, endIdx, value]) => ({
    startKm: (cumulativeDistances[startIdx] ?? 0) / 1000,
    endKm: (cumulativeDistances[Math.min(endIdx, cumulativeDistances.length - 1)] ?? 0) / 1000,
    value,
  }));
}

// Math.min(...arr)/Math.max(...arr) throw RangeError on large arrays (the
// spread becomes a function call with one argument per element, hitting the
// engine's argument-count limit around 100k-200k depending on runtime) --
// a real risk here since `arr` can be a coordinate sample per route point on
// a long route. A plain reduce loop has no such limit.
export function minMax(values: number[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

// Merges adjacent same-color ranges (e.g. several consecutive OSM ways that
// all resolve to the same road_class color) into one, without losing any
// visual information -- a route with a detail that changes every few meters
// over many km can otherwise produce thousands of individually-rendered
// chart overlay elements for no visible difference.
export function mergeAdjacentRanges<T extends { startKm: number; endKm: number; color: string }>(
  ranges: T[],
): T[] {
  const merged: T[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && last.color === r.color && last.endKm >= r.startKm) {
      last.endKm = Math.max(last.endKm, r.endKm);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}
