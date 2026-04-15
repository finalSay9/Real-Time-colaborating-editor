FROM node:20-alpine AS base
WORKDIR /app
COPY services/collaboration-service/package.json ./
RUN npm install

FROM base AS development
COPY services/collaboration-service/src ./src
COPY packages ./../../packages
EXPOSE 3002 9229

FROM base AS builder
COPY services/collaboration-service/src ./src
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3002
CMD ["node", "dist/index.js"]
