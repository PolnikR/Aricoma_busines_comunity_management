#!/bin/bash
set -e

REQUIRED_USER="aricoma"
DEFAULT_PATH="$HOME/abco/abco-fe"
DEFAULT_BACKEND_HOST="abco-be.aricoma.local"
DEFAULT_APP_HOST="abco.aricoma.local"
HTTP_PORT=8080
HTTPS_PORT=8443
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

# --- Helpers ------------------------------------------------------------------

# ask VAR "question" default
# Uses the value already present in the environment (unattended runs), otherwise prompts.
ask() {
    local var="$1" question="$2" default="$3" answer
    if [ -n "${!var+x}" ]; then
        return
    fi
    read -r -p "$question [$default]: " answer
    printf -v "$var" '%s' "${answer:-$default}"
}

# ask_bool VAR "question" default(true|false) -> VAR becomes "true" or "false"
ask_bool() {
    local var="$1" question="$2" default="$3" hint value
    [ "$default" = "true" ] && hint="Y/n" || hint="y/N"
    while true; do
        if [ -n "${!var+x}" ]; then
            value="${!var}"
        else
            read -r -p "$question [$hint]: " value
            value="${value:-$default}"
        fi
        case "${value,,}" in
            y|yes|true)  printf -v "$var" '%s' true;  return ;;
            n|no|false)  printf -v "$var" '%s' false; return ;;
        esac
        echo "Please answer yes or no."
        unset "$var"
    done
}

is_ipv4() {
    [[ "$1" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] &&
        awk -F. '{ for (i=1; i<=4; i++) if ($i > 255) exit 1 }' <<< "$1"
}

is_dns_name() {
    [[ "$1" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]
}

confirm() {
    local answer
    read -r -p "$1 [y/N]: " answer
    [[ "${answer,,}" =~ ^(y|yes)$ ]]
}

# --- Preliminary checks -------------------------------------------------------

if [ "$#" -ne 0 ]; then
    echo "Usage: $0"
    echo "The script prompts for its inputs. To skip a prompt, set its variable in the"
    echo "environment: BACKEND_HOST, AUTH_ENABLED, TLS_ENABLED, LOCAL_PATH, APP_HOST."
    echo "Example: TLS_ENABLED=false AUTH_ENABLED=true $0"
    exit 1
fi

if [ "$(id -un)" != "$REQUIRED_USER" ]; then
    echo "ERROR: this script must be run as user '$REQUIRED_USER' (current user: $(id -un))."
    exit 1
fi

if ! id -nG | tr ' ' '\n' | grep -qx docker; then
    echo "ERROR: user '$REQUIRED_USER' is not in the 'docker' group."
    echo "Fix: sudo usermod -aG docker $REQUIRED_USER, then log out and back in."
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "ERROR: cannot run docker commands as '$REQUIRED_USER'."
    echo "If the user was just added to the 'docker' group, log out and back in (or run: newgrp docker)."
    echo "Otherwise check that the docker daemon is running."
    exit 1
fi

if [ ! -f "$SCRIPT_DIR/abco-fe_img.tar" ]; then
    echo "ERROR: Docker image archive not found: $SCRIPT_DIR/abco-fe_img.tar"
    exit 1
fi

# --- Inputs -------------------------------------------------------------------

ask BACKEND_HOST "Backend IP address or DNS name" "$DEFAULT_BACKEND_HOST"
if ! is_ipv4 "$BACKEND_HOST" && ! is_dns_name "$BACKEND_HOST"; then
    echo "ERROR: invalid backend address: $BACKEND_HOST"
    exit 1
fi

ask_bool AUTH_ENABLED "Enable authentication (Keycloak)?" false
ask_bool TLS_ENABLED "Enable TLS (HTTPS with a self-signed certificate)?" true

if [ "$TLS_ENABLED" = "true" ]; then
    ask LOCAL_PATH "Directory for persistency files (certificate)" "$DEFAULT_PATH"
    if [ -z "${LOCAL_PATH//[[:space:]]/}" ]; then
        echo "ERROR: path must not be empty."
        exit 1
    fi
    # Expand a leading ~ and make the path absolute (docker -v needs an absolute path)
    LOCAL_PATH="${LOCAL_PATH/#\~/$HOME}"
    LOCAL_PATH="$(realpath -m -- "$LOCAL_PATH")"

    ask APP_HOST "Frontend DNS name (the certificate is issued for it)" "$DEFAULT_APP_HOST"
    if ! is_dns_name "$APP_HOST" || is_ipv4 "$APP_HOST"; then
        echo "ERROR: the frontend must be a DNS name, not an IP address: $APP_HOST"
        exit 1
    fi
fi

# --- Docker image -------------------------------------------------------------

DOCKER_IMAGE=$(docker load -i "$SCRIPT_DIR/abco-fe_img.tar" | sed -n 's/^Loaded image: //p')

# Validate Docker image exists locally
if ! docker image inspect "$DOCKER_IMAGE" >/dev/null 2>&1; then
    echo "ERROR: Docker image not found: $DOCKER_IMAGE"
    exit 1
fi

# --- DNS checks ---------------------------------------------------------------
# nginx resolves the backend name when it starts and exits if it cannot, so check it
# from inside a container too: a name that only exists in the host's /etc/hosts is
# not visible there.

RUN_ARGS=()
if ! is_ipv4 "$BACKEND_HOST"; then
    HOST_IP=$(getent hosts "$BACKEND_HOST" | awk '{print $1; exit}' || true)
    if docker run --rm --entrypoint getent "$DOCKER_IMAGE" hosts "$BACKEND_HOST" >/dev/null 2>&1; then
        echo "Backend $BACKEND_HOST resolves to ${HOST_IP:-an address} (host and container)."
    elif [ -n "$HOST_IP" ]; then
        echo "Backend $BACKEND_HOST resolves to $HOST_IP on this host but not inside the container;"
        echo "adding it to the container with --add-host."
        RUN_ARGS+=(--add-host "${BACKEND_HOST}:${HOST_IP}")
    else
        echo "WARNING: backend DNS name '$BACKEND_HOST' does not resolve (host or container)."
        echo "nginx will fail to start with 'host not found in upstream'."
        confirm "Continue anyway?" || exit 1
    fi
fi

if [ "$TLS_ENABLED" = "true" ]; then
    APP_IP=$(getent hosts "$APP_HOST" | awk '{print $1; exit}' || true)
    if [ -z "$APP_IP" ]; then
        echo "WARNING: frontend DNS name '$APP_HOST' does not resolve on this host;"
        echo "         users need a DNS or hosts entry pointing it to this server."
    elif ! hostname -I 2>/dev/null | tr ' ' '\n' | grep -qx "$APP_IP"; then
        echo "WARNING: $APP_HOST resolves to $APP_IP, which is not an address of this host."
    fi
fi

# --- Persistency directory and permission check -------------------------------
# The container must be able to create, write and delete in the certificate directory
# and to read+write every copied file. Done before the running container is removed,
# so a failure leaves it untouched.

if [ "$TLS_ENABLED" = "true" ]; then
    CERT_DIR="$LOCAL_PATH/certs"
    echo "Using directory: $LOCAL_PATH"
    for DIR in "$LOCAL_PATH" "$CERT_DIR"; do
        if [ ! -d "$DIR" ]; then
            echo "Directory does not exist: $DIR, creating ..."
            mkdir -p "$DIR"
        fi
    done

    # The container runs as root, so a certificate it created earlier is root-owned and
    # would block this copy and later renewal by $REQUIRED_USER. Reclaim ownership first
    # (through a throwaway container, since $REQUIRED_USER is in the docker group).
    echo "Reclaiming ownership of $CERT_DIR for $REQUIRED_USER ..."
    if ! docker run --rm --entrypoint chown \
            -v "$CERT_DIR:/etc/nginx/certs" \
            "$DOCKER_IMAGE" -R "$(id -u):$(id -g)" /etc/nginx/certs; then
        echo "ERROR: could not reclaim ownership of $CERT_DIR."
        exit 1
    fi

    # Optional files shipped next to the script (e.g. your own tls.crt / tls.key).
    if [ -n "$(ls -A "$SCRIPT_DIR/persistency" 2>/dev/null)" ]; then
        cp -r "$SCRIPT_DIR/persistency/." "$CERT_DIR/"
    fi

    echo "Checking that the container has full access to $CERT_DIR ..."
    if ! docker run --rm --entrypoint sh \
            -v "$CERT_DIR:/etc/nginx/certs" \
            "$DOCKER_IMAGE" -c '
        d=/etc/nginx/certs
        t="$d/.perm_check_$$"
        if ! { touch "$t" && echo x >> "$t" && rm "$t"; }; then
            echo "cannot create/write/delete in $d"; exit 1
        fi
        bad=0
        for f in $(find "$d" -type f); do
            if [ ! -r "$f" ] || [ ! -w "$f" ]; then echo "no read/write access: $f"; bad=1; fi
        done
        exit $bad'; then
        echo "ERROR: the abco-fe container does not have full permissions over $CERT_DIR."
        echo "Suggested fixes:"
        echo "  - ownership/mode:  sudo chmod -R u+rwX,g+rwX \"$CERT_DIR\""
        echo "  - SELinux hosts:   sudo chcon -Rt container_file_t \"$CERT_DIR\""
        echo "  - also check the mount is not read-only / root-squashed (NFS) and the disk is not full."
        exit 1
    fi

    # An existing certificate is never regenerated; warn if it was issued for another name.
    if [ -s "$CERT_DIR/tls.crt" ]; then
        CERT_SAN_INFO=$(docker run --rm --entrypoint openssl -v "$CERT_DIR:/etc/nginx/certs:ro" \
            "$DOCKER_IMAGE" x509 -in /etc/nginx/certs/tls.crt -noout -ext subjectAltName 2>/dev/null || true)
        if [ -n "$CERT_SAN_INFO" ] && ! grep -q "DNS:${APP_HOST}\b" <<< "$CERT_SAN_INFO"; then
            echo "WARNING: the existing certificate in $CERT_DIR is not valid for $APP_HOST."
            echo "         To issue a new one: delete $CERT_DIR/tls.crt and tls.key, then rerun."
        fi
    fi

    # Same check as $REQUIRED_USER on the host: every file/dir must be owned by and
    # writable for this user, so the certificate can be renewed (deleted) without sudo.
    BLOCKED=$(find "$CERT_DIR" \( ! -user "$REQUIRED_USER" -o ! -readable -o ! -writable \) 2>/dev/null | head -n 5)
    if ! { touch "$CERT_DIR/.perm_check_user_$$" && rm "$CERT_DIR/.perm_check_user_$$"; }; then
        BLOCKED="$BLOCKED"$'\n'"$CERT_DIR (cannot create/delete as $REQUIRED_USER)"
    fi
    if [ -n "$BLOCKED" ]; then
        echo "ERROR: '$REQUIRED_USER' does not have full access to everything under $CERT_DIR:"
        echo "$BLOCKED"
        exit 1
    fi
fi

# --- Start container ----------------------------------------------------------

# The image defaults to TLS_MODE=https, so the mode is always passed explicitly.
if [ "$TLS_ENABLED" = "true" ]; then
    APP_URL="https://${APP_HOST}:${HTTPS_PORT}"
    # The browser reaches Keycloak through the app (/auth), which nginx forwards to
    # the real Keycloak: no mixed content and only one certificate to trust.
    RUN_ARGS+=(-e TLS_MODE=https
               -p "${HTTPS_PORT}:443"
               -v "$CERT_DIR:/etc/nginx/certs"
               -e HTTPS_PUBLIC_PORT="$HTTPS_PORT"
               -e CERT_SAN="${APP_HOST},localhost"
               -e KEYCLOAK_URL="${APP_URL}/auth"
               -e KEYCLOAK_INTERNAL_URL="http://${BACKEND_HOST}:8081")
else
    APP_URL="http://${BACKEND_HOST}:${HTTP_PORT}"
    RUN_ARGS+=(-e TLS_MODE=http
               -p "${HTTP_PORT}:80"
               -e KEYCLOAK_URL="http://${BACKEND_HOST}:8081")
fi

# Remove existing container
docker rm -f abco-fe 2>/dev/null || true

docker run -d \
  --name abco-fe \
  --restart unless-stopped \
  "${RUN_ARGS[@]}" \
  -e AUTH_ENABLED="$AUTH_ENABLED" \
  -e KEYCLOAK_REALM=aricoma \
  -e KEYCLOAK_CLIENT_ID=abcm-fe \
  -e BACKEND_URL="http://${BACKEND_HOST}:8000" \
  "$DOCKER_IMAGE"

# The container runs as root, so the certificate it generates on first start would be
# owned by root and could not be renewed (deleted) without sudo. Hand it to this user;
# nginx still reads it because its master process runs as root.
if [ "$TLS_ENABLED" = "true" ]; then
    echo "Waiting for the certificate ..."
    READY=false
    for _ in $(seq 30); do
        if docker exec abco-fe test -s /etc/nginx/certs/tls.crt -a -s /etc/nginx/certs/tls.key 2>/dev/null; then
            READY=true
            break
        fi
        sleep 1
    done
    if [ "$READY" != "true" ]; then
        echo "ERROR: the certificate was not created; container logs:"
        docker logs --tail 30 abco-fe
        exit 1
    fi
    if ! docker exec abco-fe chown -R "$(id -u):$(id -g)" /etc/nginx/certs; then
        echo "WARNING: could not change ownership of the certificate; it stays owned by root."
    fi
fi

echo "ABCO frontend started successfully."
echo "URL: $APP_URL"
echo "Backend: http://${BACKEND_HOST}:8000"
echo "Authentication enabled: $AUTH_ENABLED"
echo "TLS enabled: $TLS_ENABLED"
if [ "$TLS_ENABLED" = "true" ]; then
    echo "Certificate: $CERT_DIR (self-signed, kept across redeploys)"
    echo "Make sure $APP_HOST resolves to this server and, with authentication, that Keycloak client"
    echo "abcm-fe allows ${APP_URL}/* (see docs/keycloak-https-setup.md)."
fi
