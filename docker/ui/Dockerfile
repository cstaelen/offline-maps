FROM node:20-alpine AS build
WORKDIR /app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/. .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

ENV GRAPHHOPPER_URL=http://mapstack:80
ENV PHOTON_URL=http://mapstack:80
ENV VERSATILES_URL=http://mapstack:80
COPY docker/ui/nginx.conf.template /etc/nginx/templates/default.conf.template
