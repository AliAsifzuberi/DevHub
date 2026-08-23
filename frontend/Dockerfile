# syntax=docker/dockerfile:1
#
# Multi-stage frontend image.
#
# Stage 1: Vite production build (TypeScript + React → static assets in dist/).
# Stage 2: nginx serves those assets and reverse-proxies /api to the backend
# so the browser stays same-origin (no CORS dance, WebSockets work via Upgrade).
#
# Build from repo root:
#   docker build -f frontend/Dockerfile -t devhub-web ./frontend

FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM nginx:1.27-alpine AS runtime

# Official nginx image runs envsubst on /etc/nginx/templates/*.template
# at start. Filter so only our vars are substituted — leaving nginx's own
# $host / $uri alone.
ENV NGINX_ENVSUBST_FILTER="BACKEND_|LISTEN_"
ENV LISTEN_PORT=80
ENV BACKEND_UPSTREAM=api:8000
ENV BACKEND_HOST=api
ENV BACKEND_SCHEME=http

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD wget -qO- http://127.0.0.1/ || exit 1
