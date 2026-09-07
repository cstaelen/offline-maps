import { LocateFixed } from "lucide-react";
import { useGeolocationStore } from "../store/useGeolocationStore";
import { useRouteStore } from "../store/useRouteStore";

export default function GeolocateButton() {
  const error = useGeolocationStore((s) => s.error);
  const setPosition = useGeolocationStore((s) => s.setPosition);
  const setError = useGeolocationStore((s) => s.setError);
  const setSinglePoint = useRouteStore((s) => s.setSinglePoint);

  function handleClick() {
    if (!navigator.geolocation) {
      setError("Géolocalisation non disponible sur ce navigateur");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coord: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setPosition(coord);
        // Replaces any in-progress route with a single "My position" point,
        // rather than adding it as just another waypoint alongside whatever
        // was already there. RouteLayer (inside the map) reacts to the
        // resulting flyToCoord/points change -- this component doesn't need
        // its own map instance access.
        setSinglePoint(coord, "My position");
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Autorisation de géolocalisation refusée"
            : err.code === err.TIMEOUT
              ? "La localisation a pris trop de temps"
              : "Impossible de déterminer votre position",
        );
      },
      // A recentering button doesn't need a brand-new GPS fix on every click;
      // tolerating a recent one keeps repeat clicks fast. `timeout` ensures a
      // stuck request (ignored permission prompt, flaky hardware) surfaces an
      // error instead of leaving the button silently unresponsive forever.
      { maximumAge: 30000, timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        aria-label="Me localiser"
        title="Me localiser"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow hover:bg-slate-50 dark:border-monokai-border dark:bg-monokai-bg dark:text-monokai-text dark:hover:bg-monokai-surface"
      >
        <LocateFixed aria-hidden="true" className="h-5 w-5" />
      </button>
      {error && (
        <p className="max-w-[10rem] rounded bg-red-50 px-2 py-1 text-xs text-red-700 shadow dark:bg-monokai-surface dark:text-monokai-pink">
          {error}
        </p>
      )}
    </div>
  );
}
