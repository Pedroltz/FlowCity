FROM node:24-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /src
COPY backend/ backend/
COPY datasets/ datasets/
RUN dotnet publish backend/FlowCity.Api/FlowCity.Api.csproj -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor gettext-base \
    && rm -rf /var/lib/apt/lists/* \
    && rm -f /etc/nginx/sites-enabled/default
WORKDIR /app
COPY --from=api-build /app .
COPY --from=frontend-build /frontend/dist/flowcity/browser /usr/share/nginx/html
COPY deploy/render/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/render/supervisord.conf /etc/supervisor/conf.d/linkplan.conf
COPY deploy/render/entrypoint.sh /usr/local/bin/linkplan-entrypoint
RUN chmod 755 /usr/local/bin/linkplan-entrypoint \
    && mkdir -p /data \
    && chown app:app /data
ENV PORT=10000 \
    ASPNETCORE_URLS=http://+:8080 \
    ConnectionStrings__FlowCity="Data Source=/data/flowcity.db"
EXPOSE 10000
ENTRYPOINT ["/usr/local/bin/linkplan-entrypoint"]
