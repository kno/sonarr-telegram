# syntax=docker/dockerfile:1
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile || bun install

FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM oven/bun:1-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY package.json bun.lockb* .
COPY --from=deps /app/node_modules ./node_modules
EXPOSE 3000
CMD ["bun", "dist/server.js"]
