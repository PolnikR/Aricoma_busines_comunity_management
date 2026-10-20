#!/bin/sh
# Writes the nginx server blocks for TLS_MODE (https | http | both) and, when HTTPS is
# on, creates the self-signed certificate once. An existing certificate is never
# replaced, so it must live on a volume: to renew it, delete the files and restart.
set -e

TLS_MODE="${TLS_MODE:-https}"
CERT_DIR=/etc/nginx/certs
CERT="$CERT_DIR/tls.crt"
KEY="$CERT_DIR/tls.key"
CONF=/etc/nginx/conf.d/default.conf
LOCATIONS=/etc/nginx/conf.d/locations.inc

case "$TLS_MODE" in
  https|http|both) ;;
  *) echo "TLS_MODE must be https, http or both (got '$TLS_MODE')" >&2; exit 1 ;;
esac

if [ "$TLS_MODE" != http ]; then
  if [ ! -s "$CERT" ] || [ ! -s "$KEY" ]; then
    CERT_CN="${CERT_CN:-Aricoma}"
    CERT_O="${CERT_O:-Aricoma}"
    CERT_DAYS="${CERT_DAYS:-730}"
    SAN=$(echo "${CERT_SAN:-abco.aricoma.local,localhost}" | sed 's/[[:space:]]//g; s/,/,DNS:/g; s/^/DNS:/')
    mkdir -p "$CERT_DIR"
    openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes \
      -keyout "$KEY" -out "$CERT" -days "$CERT_DAYS" \
      -subj "/CN=$CERT_CN/O=$CERT_O" \
      -addext "subjectAltName=$SAN" \
      -addext "basicConstraints=critical,CA:FALSE" \
      -addext "keyUsage=critical,digitalSignature" \
      -addext "extendedKeyUsage=serverAuth"
    chmod 600 "$KEY"
    echo "TLS: generated self-signed certificate ($SAN, $CERT_DAYS days)"
  fi
  echo "TLS: certificate expires $(openssl x509 -in "$CERT" -noout -enddate | cut -d= -f2)"
  if ! openssl x509 -in "$CERT" -noout -checkend $((30 * 86400)) >/dev/null; then
    echo "TLS: WARNING certificate expires within 30 days (delete $CERT_DIR/tls.* and restart to renew)" >&2
  fi
fi

http_server() {
  cat <<CONF
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;
    include $LOCATIONS;
}
CONF
}

https_server() {
  cat <<CONF
server {
    listen 443 ssl;
    http2 on;
    server_name _;
    ssl_certificate $CERT;
    ssl_certificate_key $KEY;
    ssl_protocols TLSv1.2 TLSv1.3;
    root /usr/share/nginx/html;
    index index.html;
    include $LOCATIONS;
}
CONF
}

redirect_server() {
  port=""
  [ "${HTTPS_PUBLIC_PORT:-443}" != 443 ] && port=":${HTTPS_PUBLIC_PORT}"
  cat <<CONF
server {
    listen 80;
    server_name _;
    location = /health {
        access_log off;
        default_type text/plain;
        return 200 "ok\n";
    }
    location / {
        return 301 https://\$host$port\$request_uri;
    }
}
CONF
}

case "$TLS_MODE" in
  http) http_server ;;
  https) https_server ;;
  both) redirect_server; https_server ;;
esac > "$CONF"
echo "TLS: mode $TLS_MODE"
