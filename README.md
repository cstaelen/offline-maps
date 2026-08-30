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

## Endpoints

Everything is exposed through the gateway on port `9988`:

- Routing: `http://localhost:9988/routing/route`
- Geocoding: `http://localhost:9988/geocode/api`
- Tiles: `http://localhost:9988/tiles/{z}/{x}/{y}`

Fully offline once a country's data is downloaded.

## UI

- Web: http://localhost:8888 (`graphhopper-maps`, built locally from source with a patched tile layer pointing at the local VersaTiles/GraphHopper/Photon services — no cloud dependency)
- Android: https://f-droid.org/de/packages/com.graphhopper.maps/

## Elevation

Not enabled yet — `graph.elevation.provider: srtm` is set in
`docker/graphhopper-highmem/config.yml` (cache pointed at the persistent
`graphhopper_data` volume) but requires a full graph re-import to take
effect, which downloads SRTM tiles on the fly (needs network access during
import) and takes longer / uses more disk. To enable it:

1. `docker compose down`
2. `rm -rf var/graphhopper/cache` (forces a re-import)
3. `docker compose up -d`
4. Re-trigger the country deployment from http://localhost:8080/admin