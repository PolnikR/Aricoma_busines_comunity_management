FROM node:22.23.1-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --global npm@11.19.1 && npm ci

COPY . .
RUN npm run lint && npm run typecheck && npm run test && npx vite build

FROM nginx:1.27.5-alpine AS runtime

RUN apk add --no-cache bash vim busybox-extras && \
    sed -i 's#/bin/sh#/bin/bash#' /etc/passwd

SHELL ["/bin/bash", "-c"]

COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/config.js.template /etc/nginx/app-templates/config.js.template
COPY docker/40-generate-config.sh /docker-entrypoint.d/40-generate-config.sh
RUN chmod +x /docker-entrypoint.d/40-generate-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

ENV BACKEND_URL=http://10.99.99.53:8000
ENV KEYCLOAK_URL=http://10.99.99.53:8081
ENV KEYCLOAK_REALM=aricoma
ENV KEYCLOAK_CLIENT_ID=abcm-fe

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/health || exit 1
