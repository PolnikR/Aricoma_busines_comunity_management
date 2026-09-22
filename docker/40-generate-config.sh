#!/bin/sh
set -e

envsubst '${KEYCLOAK_URL} ${KEYCLOAK_REALM} ${KEYCLOAK_CLIENT_ID}' \
  < /etc/nginx/app-templates/config.js.template \
  > /usr/share/nginx/html/config.js