FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
FROM nginx:alpine
ENV NGINX_ENVSUBST_FILTER="^BACKEND_URL$"
COPY frontend/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/flowcity/browser /usr/share/nginx/html
EXPOSE 80
