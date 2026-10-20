#!/bin/bash
set -e

if [ "$#" -lt 2 ] || [ "$#" -gt 4 ]; then
    echo "Usage: $0 <server-ip> <auth-enabled> [tls-mode] [dns-name]"
    echo "  tls-mode: http (default) | https | both (HTTP redirects to HTTPS)"
    echo "  dns-name: name the certificate is issued for and users open the app by"
    echo "            (default abco.aricoma.local); it must resolve to <server-ip>"
    echo "Example: $0 10.99.99.53 true"
    echo "Example: $0 10.99.99.53 false"
    echo "Example: $0 10.99.99.53 true https"
    echo "Example: $0 10.99.99.53 true https abco.aricoma.local"
    exit 1
fi

SERVER_IP="$1"
AUTH_ENABLED="$2"
TLS_MODE="${3:-http}"
APP_HOST="${4:-abco.aricoma.local}"
HTTP_PORT=8080
HTTPS_PORT=8443
CERT_VOLUME=abco-fe-certs

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

# Validate IPv4 address
if ! [[ "$SERVER_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] ||
   ! awk -F. '{
       for (i=1; i<=4; i++)
           if ($i > 255) exit 1
   }' <<< "$SERVER_IP"; then
    echo "ERROR: Invalid IPv4 address: $SERVER_IP"
    exit 1
fi

# Validate AUTH_ENABLED parameter
if [[ "$AUTH_ENABLED" != "true" && "$AUTH_ENABLED" != "false" ]]; then
    echo "ERROR: auth-enabled must be 'true' or 'false'."
    exit 1
fi

# Validate TLS_MODE and the DNS name
if [[ "$TLS_MODE" != "http" && "$TLS_MODE" != "https" && "$TLS_MODE" != "both" ]]; then
    echo "ERROR: tls-mode must be 'http', 'https' or 'both'."
    exit 1
fi
if ! [[ "$APP_HOST" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]; then
    echo "ERROR: Invalid DNS name: $APP_HOST"
    exit 1
fi

# Load Docker image
DOCKER_IMAGE=$(docker load -i "$SCRIPT_DIR/abco-fe_img.tar" | sed -n 's/^Loaded image: //p')

# Validate Docker image exists locally
if ! docker image inspect "$DOCKER_IMAGE" >/dev/null 2>&1; then
    echo "ERROR: Docker image not found: $DOCKER_IMAGE"
    exit 1
fi

# Remove existing container
docker rm -f abco-fe 2>/dev/null || true

# Start container
# The image defaults to TLS_MODE=https, so the mode is always passed explicitly.
RUN_ARGS=(-e TLS_MODE="$TLS_MODE")

if [ "$TLS_MODE" = "http" ]; then
    # Plain HTTP, browser talks to Keycloak directly.
    APP_URL="http://${SERVER_IP}:${HTTP_PORT}"
    RUN_ARGS+=(-p "${HTTP_PORT}:80"
               -e KEYCLOAK_URL="http://${SERVER_IP}:8081")
else
    # HTTPS: the self-signed certificate is generated once on first start into a
    # named volume. `docker rm -f` below keeps named volumes, so redeploying (also
    # with a new image) reuses the same certificate instead of creating a new one.
    # The browser reaches Keycloak through the app (/auth), which nginx forwards to
    # the real Keycloak, so there is no mixed content and only one certificate.
    APP_URL="https://${APP_HOST}:${HTTPS_PORT}"
    RUN_ARGS+=(-p "${HTTPS_PORT}:443"
               -v "${CERT_VOLUME}:/etc/nginx/certs"
               -e HTTPS_PUBLIC_PORT="$HTTPS_PORT"
               -e CERT_SAN="${APP_HOST},localhost"
               -e KEYCLOAK_URL="${APP_URL}/auth"
               -e KEYCLOAK_INTERNAL_URL="http://${SERVER_IP}:8081")
    if [ "$TLS_MODE" = "both" ]; then
        RUN_ARGS+=(-p "${HTTP_PORT}:80")
    fi

    # An existing certificate is never regenerated; warn if it was issued for another name.
    if docker volume inspect "$CERT_VOLUME" >/dev/null 2>&1; then
        CERT_SAN_INFO=$(docker run --rm --entrypoint openssl -v "${CERT_VOLUME}:/etc/nginx/certs:ro"             "$DOCKER_IMAGE" x509 -in /etc/nginx/certs/tls.crt -noout -ext subjectAltName 2>/dev/null || true)
        if [ -n "$CERT_SAN_INFO" ] && ! grep -q "DNS:${APP_HOST}" <<< "$CERT_SAN_INFO"; then
            echo "WARNING: existing certificate in volume '$CERT_VOLUME' is not valid for $APP_HOST."
            echo "         To issue a new one: docker rm -f abco-fe && docker volume rm $CERT_VOLUME, then rerun."
        fi
    fi
fi

docker run -d   --name abco-fe   --restart unless-stopped   "${RUN_ARGS[@]}"   -e AUTH_ENABLED="$AUTH_ENABLED"   -e KEYCLOAK_REALM=aricoma   -e KEYCLOAK_CLIENT_ID=abcm-fe   -e BACKEND_URL="http://${SERVER_IP}:8000"   "$DOCKER_IMAGE"

echo "ABCO frontend started successfully."
echo "Authentication enabled: $AUTH_ENABLED"
echo "TLS mode: $TLS_MODE"
echo "URL: $APP_URL"
if [ "$TLS_MODE" != "http" ]; then
    echo "Certificate volume: $CERT_VOLUME (self-signed, kept across redeploys)"
    echo "Make sure $APP_HOST resolves to $SERVER_IP and Keycloak client abcm-fe allows ${APP_URL}/*"
    echo "(see docs/keycloak-https-setup.md)."
fi
