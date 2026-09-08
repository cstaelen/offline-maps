# Offline Maps - Mapstack UI (work in progress)

Self-hosted routing, geocoding, and map tiles stack (using [Mapstack](https://github.com/Coding-Kiwi/mapstack): GraphHopper + Photon + VersaTiles) with a modern ReactJS front-end.

## Install

Create a new `docker-compose.yml` :

```yaml
services:
  photon:
    image: codingkiwi/mapstack-photon:1
    volumes:
      - ./var/photon:/app/photon_data
    environment:
      # `-latest` file version returns 404, until next release, use:
      COUNTRY_DOWNLOAD_URL: "https://download1.graphhopper.com/public/experimental/extracts/by-country-code/<COUNTRY>/photon-db-<COUNTRY>-250720.tar.bz2"

  versatiles:
    image: codingkiwi/mapstack-versatiles:1
    volumes:
      - ./var/versatiles:/app/versatiles_data

  graphhopper:
    image: codingkiwi/mapstack-graphhopper:1
    # use "build:" instead of "image:" to increase memory heap
    # build: ./docker/graphhopper
    volumes:
      - ./var/graphhopper/data:/app/graphhopper_data

  valkey:
    image: valkey/valkey:9

  mapstack:
    image: codingkiwi/mapstack:1
    ports:
      - 9988:80
      - 8080:8080

  mapstackui:
    image: cstaelen/mapstackui:latest"
    ports:
      - 8889:80
    environment:
      GRAPHHOPPER_URL: http://mapstack:80
      PHOTON_URL: http://mapstack:80
      VERSATILES_URL: http://mapstack:80
```

Then run :

```bash
docker compose up -d
```

## Usage

1. Open http://localhost:8080/admin
2. Pick a country and start the data download (can take a while)
3. You can follow logs using `docker compose logs` while processing
4. Services restart automatically once ready

## Containers

- `photon` — geocoding
- `versatiles` — map tiles
- `graphhopper` — routing
- `valkey` — config sync between services
- `mapstack` — gateway + admin dashboard
- `mapstackui` — homemade web UI (custom build)

## UI

- Web: http://localhost:8889

## Maps config (elevation, ...)

Load config file from container :

```bash
docker run --rm --entrypoint cat codingkiwi/mapstack-graphhopper:1 /app/graphhopper/config.yml > var/graphhopper/config.yml
```

Then add to `graphhopper`container the volume below:

```
  volumes:
      - ...
      - ./var/graphhopper/config.yml:/app/graphhopper/config.yml
```

Some settings only take effect on a fresh import, not just a restart.
`profiles_ch`/`profiles_lm` (CH/LM speedup preparation), `graph.encoded_values`,
and `graph.elevation.*` all affect the graph structure itself. If you change
one of these, force a re-import:
1. `docker compose down`
2. `rm -rf var/graphhopper/data/cache`
3. `docker compose up -d`
4. Re-trigger the country deployment from http://localhost:8080/admin

Anything else (e.g. `routing.timeout_ms`) just needs `docker compose restart graphhopper`.