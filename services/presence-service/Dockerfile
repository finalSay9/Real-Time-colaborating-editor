FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/logger/package.json ./packages/logger/
COPY packages/tracing/package.json ./packages/tracing/
COPY services/presence-service/package.json ./services/presence-service/

# Install ALL deps including devDependencies (needed for ts-node-dev)
RUN npm install --workspace=services/presence-service

FROM base AS development
COPY packages/ ./packages/
COPY services/presence-service/ ./services/presence-service/
WORKDIR /app/services/presence-service
EXPOSE 3004

FROM base AS builder
COPY packages/ ./packages/
COPY services/presence-service/ ./services/presence-service/
WORKDIR /app/services/presence-service
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/services/presence-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
USER node
EXPOSE 3004
CMD ["node", "dist/index.js"]
