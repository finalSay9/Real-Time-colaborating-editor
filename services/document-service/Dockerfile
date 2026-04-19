FROM node:20-alpine AS base

# Install netcat for wait scripts
RUN apk add --no-cache netcat-openbsd

WORKDIR /app

# Copy workspace root package.json so npm knows about workspaces
COPY package.json ./

# Copy all shared packages
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/logger/package.json ./packages/logger/
COPY packages/tracing/package.json ./packages/tracing/

# Copy this service's package.json
COPY services/document-service/package.json ./services/document-service/

# Install ALL dependencies including devDependencies
# --include=dev ensures ts-node-dev and typescript are installed
RUN npm install --workspaces --include=dev --ignore-scripts

FROM base AS development
# Copy source files
COPY packages/ ./packages/
COPY services/document-service/ ./services/document-service/
WORKDIR /app/services/document-service

# Verify ts-node-dev is available
RUN ls node_modules/.bin/ts-node-dev || echo "WARNING: ts-node-dev not found"

EXPOSE 3003

FROM base AS builder
COPY packages/ ./packages/
COPY services/document-service/ ./services/document-service/
WORKDIR /app/services/document-service
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/services/document-service/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
USER node
EXPOSE 3003
CMD ["node", "dist/index.js"]
