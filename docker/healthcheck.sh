#!/bin/sh
if [ "${TLS_MODE:-https}" = http ]; then
  wget -qO- http://127.0.0.1/health
else
  wget --no-check-certificate -qO- https://127.0.0.1/health
fi
