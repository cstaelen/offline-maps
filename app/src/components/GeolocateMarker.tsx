import { Marker } from "react-map-gl/maplibre";
import { useGeolocationStore } from "../store/useGeolocationStore";

export default function GeolocateMarker() {
  const position = useGeolocationStore((s) => s.position);
  const stale = useGeolocationStore((s) => s.stale);
  if (!position) return null;
  return (
    <Marker longitude={position[0]} latitude={position[1]}>
      <div
        title={stale ? "Dernière position connue (non confirmée)" : undefined}
        className={
          stale
            ? "h-4 w-4 rounded-full border-2 border-white bg-slate-400 opacity-60 shadow-[0_0_0_6px_rgba(148,163,184,0.3)]"
            : "h-4 w-4 rounded-full border-2 border-white bg-blue-500 shadow-[0_0_0_6px_rgba(59,130,246,0.3)]"
        }
      />
    </Marker>
  );
}
