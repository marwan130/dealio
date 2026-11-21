FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080
EXPOSE 8081

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src

COPY ["server/Dealio.API/Dealio.API.csproj", "server/Dealio.API/"]
COPY ["server/Dealio.Application/Dealio.Application.csproj", "server/Dealio.Application/"]
COPY ["server/Dealio.Domain/Dealio.Domain.csproj", "server/Dealio.Domain/"]
COPY ["server/Dealio.Infrastructure/Dealio.Infrastructure.csproj", "server/Dealio.Infrastructure/"]

RUN dotnet restore "server/Dealio.API/Dealio.API.csproj"

COPY . .
WORKDIR "/src/server/Dealio.API"
RUN dotnet build "Dealio.API.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "Dealio.API.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
USER $APP_UID
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080 && printf "GET /health/ready HTTP/1.0\r\n\r\n" >&3 && grep -q "200 OK" <&3'
ENTRYPOINT ["dotnet", "Dealio.API.dll"]
