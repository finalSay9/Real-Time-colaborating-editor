FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/logger/package.json ./packages/logger/
COPY packages/tracing/package.json ./packages/tracing/
COPY services/api-gateway/package.json ./services/api-gateway/

RUN npm install --workspace=services/api-gateway

FROM base AS development
COPY packages/ ./packages/
COPY services/api-gateway/ ./services/api-gateway/
WORKDIR /app/services/api-gateway
EXPOSE 3000 9229

FROM base AS builder
COPY packages/ ./packages/
COPY services/api-gateway/ ./services/api-gateway/
WORKDIR /app/services/api-gateway
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/services/api-gateway/dist ./dist
COPY --from=builder /app/services/api-gateway/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
