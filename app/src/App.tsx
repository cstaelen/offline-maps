import { useEffect, useState } from "react";
import clsx from "clsx";
import { MapIcon, Search } from "lucide-react";
import Map from "./components/Map";
import RouteLayer, { CLICKABLE_LAYER_IDS, useMapClickToAddPoint } from "./components/RouteLayer";
import SearchBox from "./components/SearchBox";
import RouteForm from "./components/RouteForm";
import RouteDetails from "./components/RouteDetails";
import RouteInstructions from "./components/RouteInstructions";
import ThemeToggle from "./components/ThemeToggle";
import GeolocateMarker from "./components/GeolocateMarker";
import GeolocateButton from "./components/GeolocateButton";
import { useThemeStore } from "./store/useThemeStore";

export default function App() {
  const handleClick = useMapClickToAddPoint();
  const theme = useThemeStore((s) => s.theme);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="relative h-full overflow-auto">
      <div
        className={clsx(
          mobilePanelOpen ? "flex" : "hidden",
          "bg-orange-50 dark:bg-monokai-surface fixed inset-0 z-30 flex-col gap-2 overflow-y-auto p-2 pb-28",
          "md:relative md:z-10 md:flex md:h-auto md:w-80 md:overflow-visible md:p-0 md:border-b-2 md:border-b-white",
        )}
      >
        <div className="md:absolute w-full left-4 top-4 z-12 flex items-start gap-2 md:w-80">
          <SearchBox onSelect={() => setMobilePanelOpen(false)} />
          <GeolocateButton />
        </div>
        <div className="md:absolute w-full left-4 top-16 z-10 space-y-2">
          <RouteForm />
          <RouteInstructions />
          <RouteDetails />
        </div>
      </div>
      <button
        onClick={() => setMobilePanelOpen((open) => !open)}
        aria-label={mobilePanelOpen ? "Close search" : "Open search"}
        title={mobilePanelOpen ? "Close search" : "Open search"}
        className={clsx(
          "fixed bottom-8 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full border shadow-lg",
          "border-monokai-border bg-monokai-bg text-monokai-text hover:bg-monokai-surface",
          "dark:border-slate-200 dark:bg-white dark:text-slate-700 dark:hover:bg-slate-50",
          "md:hidden",
        )}
      >
        {mobilePanelOpen ? (
          <MapIcon aria-hidden="true" className="h-8 w-8" />
        ) : (
          <Search aria-hidden="true" className="h-6 w-6" />
        )}
      </button>
      <div className="fixed right-[10px] top-[90px] z-10">
        <ThemeToggle />
      </div>
      <div className="fixed h-screen w-screen">
        <Map onClick={handleClick} interactiveLayerIds={CLICKABLE_LAYER_IDS}>
          <RouteLayer />
          <GeolocateMarker />
        </Map>
      </div>
    </div>
  );
}
