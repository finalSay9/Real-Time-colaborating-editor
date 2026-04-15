FROM node:20-alpine AS base
WORKDIR /app
COPY services/api-gateway/package.json ./
RUN npm install

FROM base AS development
COPY services/api-gateway/src ./src
EXPOSE 3000 9229

FROM base AS builder
COPY services/api-gateway/src ./src
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
