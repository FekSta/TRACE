# TRACE frontend — built static bundle served by nginx (Module 8 decision:
# a built bundle means `docker compose up` is the only prerequisite — no host
# `node_modules`, no `npm install`. See Review.md §Module 8).
#
# Stage 1: build the React bundle (tsc -b && vite build).
FROM node:22-alpine AS build

WORKDIR /app

# Install from the lockfile first (layer caching).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The API base URL is baked in at build time. Its value comes ONLY from
# docker-compose.yml's `build.args` (sourced from the repo-root `.env` via
# ${VITE_API_URL:-...}) — there is deliberately no hardcoded default here, so
# `.env` stays the single source of truth (Retrofit 2026-09-08, Review.md).
# Vite reads VITE_API_URL from the environment during `vite build`; the ENV
# line also persists it into the build stage for clarity.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Stage 2: serve the static bundle with nginx.
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173
