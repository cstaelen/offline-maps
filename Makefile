.PHONY: dev docker-build docker-push
IMAGE=cstaelen/mapstackui
IMAGE_TAG?=latest
PLATFORMS?=linux/amd64,linux/arm64
DOCKERFILE=./docker/ui/Dockerfile
DOCKER_COMPOSE  = $(or docker compose, docker-compose)

dev:
	test -f var/graphhopper/config.yml || docker run --rm --entrypoint cat codingkiwi/mapstack-graphhopper:1 /app/graphhopper/config.yml > var/graphhopper/config.yml
	docker compose up -d --build photon versatiles graphhopper valkey mapstack
	cd app && npm install && npm run dev

docker-build:
	docker buildx build --platform ${PLATFORMS} --build-arg VERSION=${BUILD_VERSION} -f ${DOCKERFILE} -t ${IMAGE}:${IMAGE_TAG} .
