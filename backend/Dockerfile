FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend/ backend/
COPY datasets/ datasets/
RUN dotnet publish backend/FlowCity.Api/FlowCity.Api.csproj -c Release -o /app
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
RUN mkdir /data && chown app:app /data
USER app
ENV ASPNETCORE_URLS=http://+:8080
ENV ConnectionStrings__FlowCity="Data Source=/data/flowcity.db"
EXPOSE 8080
ENTRYPOINT ["dotnet", "FlowCity.Api.dll"]
