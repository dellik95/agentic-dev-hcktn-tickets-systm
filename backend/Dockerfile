FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY NuGet.Config Directory.Build.props Directory.Packages.props TicketingSystem.slnx ./
COPY src/TicketingSystem.Api/TicketingSystem.Api.csproj src/TicketingSystem.Api/
COPY src/TicketingSystem.Application/TicketingSystem.Application.csproj src/TicketingSystem.Application/
COPY src/TicketingSystem.Domain/TicketingSystem.Domain.csproj src/TicketingSystem.Domain/
COPY src/TicketingSystem.Infrastructure/TicketingSystem.Infrastructure.csproj src/TicketingSystem.Infrastructure/
RUN dotnet restore src/TicketingSystem.Api/TicketingSystem.Api.csproj

COPY src/ src/
RUN dotnet publish src/TicketingSystem.Api/TicketingSystem.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
RUN useradd --uid 5678 --user-group --create-home appuser
COPY --from=build /app ./
USER appuser

ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "TicketingSystem.Api.dll"]
