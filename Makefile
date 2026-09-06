.PHONY: dev docker-build docker-push

dev:
	test -f var/graphhopper/config.yml || docker run --rm --entrypoint cat codingkiwi/mapstack-graphhopper:1 /app/graphhopper/config.yml > var/graphhopper/config.yml
	docker compose up -d --build photon versatiles graphhopper valkey mapstack
	cd app && npm install && npm run dev

docker-build:
	docker compose build mapstackui

# TODO: no registry destination decided yet for the ui image. Once one is
# chosen, tag and push it here (e.g. `docker tag mapstackui:latest
# <registry>/<repo>:<tag> && docker push <registry>/<repo>:<tag>`).
docker-push:
	@echo "docker-push: no registry configured yet -- see Makefile TODO"
