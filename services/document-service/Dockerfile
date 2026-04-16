FROM node:20-alpine AS base
WORKDIR /app

COPY package.json ./
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/logger/package.json ./packages/logger/
COPY packages/tracing/package.json ./packages/tracing/
COPY services/document-service/package.json ./services/document-service/

RUN npm install --workspace=services/document-service

FROM base AS development
COPY packages/ ./packages/
COPY services/document-service/ ./services/document-service/
WORKDIR /app/services/document-service
EXPOSE 3003 9229

FROM base AS builder
COPY packages/ ./packages/
COPY services/document-service/ ./services/document-service/
WORKDIR /app/services/document-service
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/services/document-service/dist ./dist
COPY --from=builder /app/services/document-service/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
USER node
EXPOSE 3003
CMD ["node", "dist/index.js"]
