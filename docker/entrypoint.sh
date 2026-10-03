#!/bin/sh
# Genera la configuración de ejecución y la CSP a partir de API_URL y arranca
# nginx en primer plano. Falla de inmediato si API_URL no es válida.
set -eu

if [ -z "${API_URL:-}" ]; then
  echo "ERROR: la variable API_URL es obligatoria (p. ej. API_URL=http://localhost:8080)." >&2
  exit 1
fi

case "$API_URL" in
  http://*|https://*) ;;
  *)
    echo "ERROR: API_URL debe empezar por http:// o https:// (valor recibido no válido)." >&2
    exit 1
    ;;
esac

# Origen (esquema://host[:puerto]) para connect-src.
API_ORIGIN=$(printf '%s' "$API_URL" | sed -E 's#^(https?://[^/]+).*$#\1#')
if printf '%s' "$API_ORIGIN" | grep -q '[[:space:];"'"'"']'; then
  echo "ERROR: API_URL contiene caracteres no permitidos." >&2
  exit 1
fi

HTML_DIR=/usr/share/nginx/html
mkdir -p "$HTML_DIR/assets"
envsubst '${API_URL}' < /etc/nginx/templates-custom/runtime-config.json.template > "$HTML_DIR/assets/runtime-config.json"

CSP="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://lh3.googleusercontent.com; connect-src 'self' ${API_ORIGIN}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
printf 'add_header Content-Security-Policy "%s" always;\n' "$CSP" > /etc/nginx/generated/csp.conf

echo "citas-web: API_URL configurada (origen ${API_ORIGIN}); escuchando en el puerto 8080."
exec nginx -g 'daemon off;'
