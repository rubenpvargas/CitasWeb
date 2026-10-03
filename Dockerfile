FROM node:24-alpine AS build
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# nginx sin privilegios: usuario 101 (nginx), puerto 8080.
FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root
RUN mkdir -p /etc/nginx/generated /etc/nginx/snippets /etc/nginx/templates-custom \
    && rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/citas-web.conf
COPY docker/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY docker/runtime-config.json.template /etc/nginx/templates-custom/runtime-config.json.template
COPY docker/entrypoint.sh /usr/local/bin/citas-web-entrypoint.sh
COPY --from=build --chown=101:101 /workspace/dist/app/browser /usr/share/nginx/html
RUN chmod 0755 /usr/local/bin/citas-web-entrypoint.sh \
    && chown -R 101:101 /etc/nginx/generated /usr/share/nginx/html
USER 101

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/health >/dev/null || exit 1
ENTRYPOINT ["/usr/local/bin/citas-web-entrypoint.sh"]
