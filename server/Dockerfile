# ── deps: install all dependencies (incl. dev, for tsx/tsc) ───────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# ── dev: hot-reload via tsx (used by docker-compose, source bind-mounted) ─────
FROM deps AS dev
COPY tsconfig.json ./
COPY src ./src
EXPOSE 5000
CMD ["npm", "run", "dev"]

# ── build: compile TypeScript to dist/ ────────────────────────────────────────
FROM deps AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── production: runtime image with only prod deps + compiled output ───────────
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
