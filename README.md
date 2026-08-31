# OFFLINE MAPS - Work in progress

Self-hosted routing, geocoding, and map tiles stack ([Mapstack](https://github.com/Coding-Kiwi/mapstack): GraphHopper + Photon + VersaTiles) with custom UI based on [GraphHopper-maps](https://github.com/graphhopper/graphhopper-maps).

## Install

Download or clone the repo then:

```bash
docker compose up -d
```

## Usage

1. Open http://localhost:8080/admin
2. Pick a country (e.g. France) and start the data download
3. You can follow logs using `docker compose logs` while processing
4. Services restart automatically once ready

## Containers

- `mapstack` — gateway + admin dashboard
- `photon` — geocoding
- `versatiles` — map tiles
- `graphhopper` — routing (custom build)
- `graphhopper-maps` — web UI (custom build)
- `valkey` — config sync between services

## Endpoints

Everything is exposed through the gateway on port `9988`:

- Routing: `http://localhost:9988/routing/route`
- Geocoding: `http://localhost:9988/geocode/api`
- Tiles: `http://localhost:9988/tiles/{z}/{x}/{y}`

Fully offline once a country's data is downloaded.

## UI

- Web: http://localhost:8888 

## Maps config (elevation, ...)

File: `docker/graphhopper-highmem/config.yml` 
Restart and remove cache :
1. `docker compose down`
2. `rm -rf var/graphhopper/cache` (forces a re-import)
3. `docker compose up -d`
4. Re-trigger the country deployment from http://localhost:8080/admin