#!/bin/bash
# Builds a runtime-only copy of the image (stub page instead of the Vite bundle) and
# checks every TLS_MODE plus certificate persistence. Needs a running Docker daemon.
set -euo pipefail

cd "$(dirname "$0")/.."
IMG=abco-fe-tls-test
VOL=abco-fe-tls-test-certs
NAME=abco-fe-tls-test
fail() { echo "FAIL: $*" >&2; exit 1; }
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; docker volume rm -f "$VOL" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker build -q -t "$IMG" -f - . <<'DOCKERFILE'
FROM nginx:1.27.5-alpine
RUN apk add --no-cache bash openssl
COPY docker/locations.inc.template /etc/nginx/templates/locations.inc.template
COPY docker/config.js.template /etc/nginx/app-templates/config.js.template
COPY docker/30-configure-tls.sh /docker-entrypoint.d/30-configure-tls.sh
COPY docker/40-generate-config.sh /docker-entrypoint.d/40-generate-config.sh
COPY docker/healthcheck.sh /usr/local/bin/healthcheck.sh
RUN chmod +x /docker-entrypoint.d/*.sh /usr/local/bin/healthcheck.sh && echo stub > /usr/share/nginx/html/index.html
ENV BACKEND_URL=http://127.0.0.1:1 KEYCLOAK_INTERNAL_URL=http://127.0.0.1:1 KEYCLOAK_URL=x KEYCLOAK_REALM=x KEYCLOAK_CLIENT_ID=x AUTH_ENABLED=true
DOCKERFILE

run() { # mode
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  docker run -d --name "$NAME" -v "$VOL:/etc/nginx/certs" -e TLS_MODE="$1" -e HTTPS_PUBLIC_PORT=8443 "$IMG" >/dev/null
  for _ in $(seq 20); do docker exec "$NAME" wget -qO- http://127.0.0.1/health >/dev/null 2>&1 && return; \
    docker exec "$NAME" wget --no-check-certificate -qO- https://127.0.0.1/health >/dev/null 2>&1 && return; sleep 1; done
  docker logs "$NAME" >&2; fail "mode $1 did not start"
}
http_code() { docker exec "$NAME" wget -S -qO /dev/null "$1" 2>&1 | head -1 | awk '{print $2}'; }

echo "== https"; run https
docker exec "$NAME" /usr/local/bin/healthcheck.sh >/dev/null || fail "https healthcheck"
docker exec "$NAME" wget -qO- --timeout=2 http://127.0.0.1/health >/dev/null 2>&1 && fail "port 80 open in https mode"
CERT=$(docker exec "$NAME" openssl x509 -in /etc/nginx/certs/tls.crt -noout -subject -ext subjectAltName -dates -fingerprint)
echo "$CERT"
echo "$CERT" | grep -q "CN *= *Aricoma" || fail "subject CN"
echo "$CERT" | grep -q "DNS:abco.aricoma.local" || fail "SAN dns"
docker exec "$NAME" openssl x509 -in /etc/nginx/certs/tls.crt -noout -checkend $((729 * 86400)) >/dev/null || fail "validity below 729 days"
docker exec "$NAME" openssl x509 -in /etc/nginx/certs/tls.crt -noout -checkend $((731 * 86400)) >/dev/null && fail "validity above 731 days"
FP1=$(echo "$CERT" | grep -i fingerprint)

echo "== both (certificate must persist)"; run both
FP2=$(docker exec "$NAME" openssl x509 -in /etc/nginx/certs/tls.crt -noout -fingerprint)
[ "$FP1" = "$FP2" ] || fail "certificate was regenerated"
[ "$(http_code http://127.0.0.1/health)" = 200 ] || fail "both: /health on 80"
REDIRECT=$(docker exec "$NAME" wget -S -qO /dev/null http://127.0.0.1/ 2>&1 || true)
echo "$REDIRECT" | grep -q "Location: https://.*:8443/" || fail "both: redirect"

echo "== http"; run http
docker exec "$NAME" /usr/local/bin/healthcheck.sh >/dev/null || fail "http healthcheck"
docker exec "$NAME" wget --no-check-certificate -qO- --timeout=2 https://127.0.0.1/health >/dev/null 2>&1 && fail "port 443 open in http mode"

echo "== invalid mode"
docker rm -f "$NAME" >/dev/null 2>&1 || true
BOGUS=$(docker run --rm -e TLS_MODE=bogus "$IMG" 2>&1 || true)
echo "$BOGUS" | grep -q "TLS_MODE must be" || fail "invalid mode accepted"
echo "OK"
