#!/bin/bash
# Simulación del contenedor citas-web sin Docker: ejecuta el entrypoint real y sirve
# el build de producción con nginx 1.27 (Windows) usando el nginx.conf del repo.
# Uso: NGINX_HOME=<nginx 1.27 Windows> docker/simulate-without-docker.sh <API_URL> [puerto]
# Requiere npm run build previo y envsubst (Git Bash lo incluye).
set -u
REPO=$(cd "$(dirname "$0")/.." && pwd); API_URL_VALUE=$1; PORT=${2:-18080}
: "${NGINX_HOME:?Define NGINX_HOME con la ruta de nginx}"
NGX=$NGINX_HOME
SIM=${TMPDIR:-/tmp}/citas-web-sim
rm -rf "$SIM"; mkdir -p "$SIM"/{html,generated,snippets,conf,logs,temp}
cp -r "$REPO"/dist/app/browser/. "$SIM/html/"
M() { cygpath -m "$1"; }

# Entrypoint real con rutas remapeadas; nginx se arranca aparte.
sed -e "s#/usr/share/nginx/html#$SIM/html#g" \
    -e "s#/etc/nginx/templates-custom#$REPO/docker#g" \
    -e "s#/etc/nginx/generated#$SIM/generated#g" \
    -e "s#^exec nginx.*#exit 0#" "$REPO/docker/entrypoint.sh" > "$SIM/entrypoint.sh"

echo "== Entrypoint: validación de API_URL"
for bad in "" "ftp://api.test" "http://api.test\"x"; do
  API_URL="$bad" sh "$SIM/entrypoint.sh" >/dev/null 2>"$SIM/err.txt"; rc=$?
  echo "  API_URL='$bad' -> exit $rc ($(head -1 "$SIM/err.txt"))"
done
API_URL="$API_URL_VALUE" sh "$SIM/entrypoint.sh" || { echo "entrypoint falló"; exit 1; }

# Configuración nginx: server del repo con rutas remapeadas y puerto de simulación.
sed -e "s#/etc/nginx/generated#$(M "$SIM/generated")#g" "$REPO/docker/security-headers.conf" > "$SIM/snippets/security-headers.conf"
sed -e "s#/usr/share/nginx/html#$(M "$SIM/html")#g" \
    -e "s#/etc/nginx/snippets#$(M "$SIM/snippets")#g" \
    -e "s#listen 8080;#listen $PORT;#" -e "/listen \[::\]/d" "$REPO/docker/nginx.conf" > "$SIM/conf/citas-web.conf"
cp "$NGX/conf/mime.types" "$SIM/conf/"
cat > "$SIM/conf/nginx.conf" <<EOF
worker_processes 1;
pid $(M "$SIM/logs/nginx.pid");
error_log $(M "$SIM/logs/error.log");
events { worker_connections 64; }
http {
  include mime.types;
  default_type application/octet-stream;
  access_log off;
  client_body_temp_path $(M "$SIM/temp");
  include citas-web.conf;
}
EOF
cd "$NGX"
./nginx.exe -p "$(M "$SIM")/" -c conf/nginx.conf -t 2>&1 | sed 's/^/  /'
./nginx.exe -p "$(M "$SIM")/" -c conf/nginx.conf &
sleep 2

B=http://127.0.0.1:$PORT
hdr() { curl -s -D - -o /dev/null "$B$1" | tr -d '\r'; }
echo "== Comportamiento HTTP"
echo "  /health: $(curl -s -o /dev/null -w '%{http_code}' $B/health) $(curl -s $B/health)"
echo "  /mis-citas (fallback SPA): $(curl -s -o /dev/null -w '%{http_code}' $B/mis-citas) contiene app-root=$(curl -s $B/mis-citas | grep -c '<app-root')"
echo "  index Cache-Control: $(hdr /mis-citas | grep -i '^cache-control' )"
echo "  runtime-config: $(curl -s $B/assets/runtime-config.json | tr -d ' \n') | $(hdr /assets/runtime-config.json | grep -i '^cache-control')"
asset=$(ls "$SIM/html" | grep -E '^main-[A-Z0-9]{8}\.js$' | head -1)
echo "  $asset: $(hdr /$asset | grep -i '^cache-control')"
echo "  asset inexistente main-ZZZZZZZZ.js: $(curl -s -o /dev/null -w '%{http_code}' $B/main-ZZZZZZZZ.js)"
echo "  CSP connect-src: $(hdr / | grep -i '^content-security-policy' | grep -o "connect-src [^;]*")"
echo "  Cabeceras: $(hdr / | grep -iE '^(x-content-type-options|x-frame-options|referrer-policy)' | tr '\n' ' ')"
echo "  index.html scripts inline: $(grep -c 'onload=' "$SIM/html/index.html")"
./nginx.exe -p "$(M "$SIM")/" -c conf/nginx.conf -s stop
