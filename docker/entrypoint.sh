#!/bin/sh
set -eu
mkdir -p /usr/share/nginx/html/assets
envsubst '${API_URL}' < /etc/nginx/runtime-config.json.template > /usr/share/nginx/html/assets/runtime-config.json
exec nginx -g 'daemon off;'
