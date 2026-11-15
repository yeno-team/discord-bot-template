FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
ENV HEALTHCHECK_FILE=/tmp/bot-heartbeat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/data && chown -R node:node /app
USER node
# Healthy only while the bot refreshes its heartbeat, which requires Discord and Redis.
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "const s=require('node:fs').statSync(process.env.HEALTHCHECK_FILE);process.exit(Date.now()-s.mtimeMs<30000?0:1)"]
CMD ["node", "--enable-source-maps", "dist/index.js"]
