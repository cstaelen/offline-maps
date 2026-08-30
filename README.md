# MAPSTACK

Self-hosted routing, geocoding, and map tiles stack ([Mapstack](https://github.com/Coding-Kiwi/mapstack): GraphHopper + Photon + VersaTiles).

## Install

```bash
docker compose up -d
```

## Usage

1. Open http://localhost:8080/admin
2. Pick a country (e.g. France) and start the data download
3. Services restart automatically once ready

## Containers

- `mapstack` — gateway + admin dashboard
- `photon` — geocoding
- `versatiles` — map tiles
- `graphhopper` — routing (custom build, see below)
- `graphhopper-maps` — web frontend (custom build, see below)
- `valkey` — config sync between services

### `graphhopper` (docker/graphhopper-highmem)

The official `codingkiwi/mapstack-graphhopper` image hardcodes a 4 GB heap for
the import step, which runs out of memory on country-sized OSM extracts
(e.g. France). This build patches the heap to 12 GB (import) / 6 GB (server).
Only needed the first time data is imported — switch back to
`image: codingkiwi/mapstack-graphhopper:1` once the graph cache exists.

### `graphhopper-maps` (docker/graphhopper-maps)

[GraphHopper Maps](https://github.com/graphhopper/graphhopper-maps) has no
official Docker image and is built from source here, patched to talk to our
self-hosted services instead of graphhopper.com/cloud tile providers:

- `MapOptionsStore.ts` — replaces every tile source with a single "Local"
  vector style (`local-style.json`, generated with `@versatiles/style`)
- `Api.ts` — the app is wired for the GraphHopper Directions API; this
  translates requests/responses to Photon's native format (param names,
  GeoJSON response shape)
- `config-local.js` — API URLs resolved at runtime from `window.location`,
  and `request.details` trimmed to the encoded_values actually enabled on
  this GraphHopper instance (see `/routing/info`)
- `nginx.conf` — serves the built app and proxies `/routing`, `/geocode`,
  `/tiles`, `/sprites`, `/fonts` to the gateway; also aliases
  `/geocode/geocode` (hardcoded in the app) to Photon's `/geocode/api`

## Endpoints

Everything is exposed through the gateway on port `9988`:

- Routing: `http://localhost:9988/routing/route`
- Geocoding: `http://localhost:9988/geocode/api`
- Tiles: `http://localhost:9988/tiles/{z}/{x}/{y}`

Fully offline once a country's data is downloaded.

## UI

- Web: http://localhost:8888 (`graphhopper-maps`, built locally from source with a patched tile layer pointing at the local VersaTiles/GraphHopper/Photon services — no cloud dependency)
- Android: https://f-droid.org/de/packages/com.graphhopper.maps/