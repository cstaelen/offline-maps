FROM node:20-alpine AS build

RUN apk add --no-cache git

WORKDIR /app
RUN git clone --depth 1 https://github.com/graphhopper/graphhopper-maps.git .

COPY config-local.js ./config-local.js
COPY config.js ./config.js
COPY MapOptionsStore.ts ./src/stores/MapOptionsStore.ts
COPY Api.ts ./src/api/Api.ts

RUN npm ci
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY local-style.json /usr/share/nginx/html/local-style.json
COPY nginx.conf /etc/nginx/conf.d/default.conf
