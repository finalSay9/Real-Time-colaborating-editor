FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/logger/package.json ./packages/logger/
COPY packages/tracing/package.json ./packages/tracing/
COPY services/auth-service/package.json ./services/auth-service/

RUN npm install --workspace=services/auth-service

FROM base AS development
COPY packages/ ./packages/
COPY services/auth-service/ ./services/auth-service/
WORKDIR /app/services/auth-service
EXPOSE 3001 9229

FROM base AS builder
COPY packages/ ./packages/
COPY services/auth-service/ ./services/auth-service/
WORKDIR /app/services/auth-service
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/services/auth-service/dist ./dist
COPY --from=builder /app/services/auth-service/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
USER node
EXPOSE 3001
CMD ["node", "dist/index.js"]
