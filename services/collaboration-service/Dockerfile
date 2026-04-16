FROM node:20-alpine AS base
WORKDIR /app

# Copy root workspace config first
COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/logger/package.json ./packages/logger/
COPY packages/tracing/package.json ./packages/tracing/
COPY services/collaboration-service/package.json ./services/collaboration-service/

# Install all workspace deps from root — this resolves @collab/* locally
RUN npm install --workspace=services/collaboration-service

FROM base AS development
COPY packages/ ./packages/
COPY services/collaboration-service/ ./services/collaboration-service/
WORKDIR /app/services/collaboration-service
EXPOSE 3002 9229

FROM base AS builder
COPY packages/ ./packages/
COPY services/collaboration-service/ ./services/collaboration-service/
WORKDIR /app/services/collaboration-service
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/services/collaboration-service/dist ./dist
COPY --from=builder /app/services/collaboration-service/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
USER node
EXPOSE 3002
CMD ["node", "dist/index.js"]
