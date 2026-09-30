FROM node:24-alpine AS build
WORKDIR /workspace
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /workspace/dist/app/browser /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/runtime-config.json.template /etc/nginx/runtime-config.json.template
COPY docker/entrypoint.sh /docker-entrypoint-custom.sh
EXPOSE 80
ENTRYPOINT ["sh", "/docker-entrypoint-custom.sh"]
