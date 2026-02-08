# syntax=docker/dockerfile:1
# Build the observability-api service (expects build context at repo root)

FROM node:current-alpine AS build
WORKDIR /app
# Copy service manifests and local dependency (logging-utils)
COPY services/observability/observability-api/package*.json services/observability/observability-api/tsconfig.json ./services/observability/observability-api/
COPY packages/logging-utils ./packages/logging-utils
COPY services/observability/observability-api/src ./services/observability/observability-api/src

# Build shared logging-utils
WORKDIR /app/packages/logging-utils
RUN npm ci --include=dev
RUN npm run build

WORKDIR /app/services/observability/observability-api
RUN npm ci --include=dev
RUN npm run build
RUN npm prune --omit=dev

FROM node:current-alpine  AS prod
WORKDIR /app
ENV NODE_ENV=${APP_ENV:-development}

# Copy runtime artifacts
COPY --from=build /app/services/observability/observability-api/package*.json ./services/observability/observability-api/
COPY --from=build /app/services/observability/observability-api/node_modules ./services/observability/observability-api/node_modules
COPY --from=build /app/services/observability/observability-api/dist ./services/observability/observability-api/dist
COPY --from=build /app/packages/logging-utils ./packages/logging-utils

EXPOSE 4040
WORKDIR /app/services/observability/observability-api
CMD ["node", "dist/server.js"]
