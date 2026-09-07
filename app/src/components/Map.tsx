import { PropsWithChildren, useEffect, useState } from "react";
import ReactMapGL, { MapLayerMouseEvent, NavigationControl } from "react-map-gl/maplibre";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useThemeStore } from "../store/useThemeStore";

interface MapProps {
  onClick?: (event: MapLayerMouseEvent) => void;
  interactiveLayerIds?: string[];
}

// The style JSON's tile/sprite/glyph paths are root-relative (e.g.
// "/tiles/osm/{z}/{x}/{y}"). MapLibre resolves some of these from a worker
// context with no implicit page origin, so a bare "/..." path fails there
// ("Failed to parse URL from /tiles/..."). Fetch the style and rewrite those
// paths to absolute URLs before handing it to MapLibre, instead of relying
// on an nginx-level rewrite (which wouldn't apply during `npm run dev`, and
// which we deliberately avoided reintroducing after the mixed-content bug
// in the old UI's hardcoded-http:// version of that same rewrite).
//
// Plain string concatenation, not `new URL(...)`: the tile/glyph templates
// contain literal "{z}"/"{fontstack}" placeholders that URL() percent-encodes
// (`{` -> `%7B`), which breaks MapLibre's own token substitution afterwards.
function absolutize(path: string): string {
  return window.location.origin + path;
}

function resolveStyle(style: StyleSpecification): StyleSpecification {
  return {
    ...style,
    glyphs: style.glyphs ? absolutize(style.glyphs) : style.glyphs,
    sprite:
      typeof style.sprite === "string"
        ? absolutize(style.sprite)
        : Array.isArray(style.sprite)
          ? style.sprite.map((s) => ({ ...s, url: absolutize(s.url) }))
          : style.sprite,
    sources: Object.fromEntries(
      Object.entries(style.sources).map(([id, source]) => [
        id,
        "tiles" in source && source.tiles
          ? { ...source, tiles: source.tiles.map(absolutize) }
          : source,
      ]),
    ),
  };
}

export default function Map({
  children,
  onClick,
  interactiveLayerIds,
}: PropsWithChildren<MapProps>) {
  const [style, setStyle] = useState<StyleSpecification | null>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    let cancelled = false;
    const styleUrl = theme === "dark" ? "/local-style-dark.json" : "/local-style.json";
    fetch(styleUrl)
      .then((res) => res.json())
      .then((raw: StyleSpecification) => {
        if (!cancelled) setStyle(resolveStyle(raw));
      })
      .catch((err) => {
        // Leave the previously-loaded style in place rather than blanking the
        // map — a failed theme-switch fetch shouldn't take down what's already
        // showing, though the toggle button/panels will visibly disagree with
        // the map until a retry succeeds.
        console.error(`Failed to load map style from ${styleUrl}`, err);
      });
    return () => {
      cancelled = true;
    };
  }, [theme]);

  if (!style) return null;

  return (
    <ReactMapGL
      // Placeholder default center (Paris) — no per-deployment configuration yet.
      initialViewState={{ longitude: 2.3522, latitude: 48.8566, zoom: 5 }}
      mapStyle={style}
      style={{ width: "100%", height: "100%" }}
      onClick={onClick}
      interactiveLayerIds={interactiveLayerIds}
    >
      <NavigationControl position="top-right" showCompass={false} />
      {children}
    </ReactMapGL>
  );
}
