# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# Persist the SQLite file across deploys via the host's volume mount at /data
# (Fly.io, Railway volumes, etc). We don't declare a Docker VOLUME here — Railway
# rejects images that do — the mount is configured in the platform instead.
ENV DATABASE_URL=/data/coach.sqlite
EXPOSE 3000
CMD ["node", "dist/bot.js"]
