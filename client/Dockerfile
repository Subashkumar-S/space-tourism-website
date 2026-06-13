# ── build: compile the CRA app to static files ────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# CRA inlines REACT_APP_* at build time. Default "/api" works with the nginx
# reverse proxy below (same-origin). CI=false so build warnings don't fail it.
ARG REACT_APP_API_BASE_URL=/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV CI=false
RUN npm run build

# ── production: serve the build + reverse-proxy /api to the server ────────────
FROM nginx:alpine AS production
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
