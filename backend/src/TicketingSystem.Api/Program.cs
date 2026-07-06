using Microsoft.EntityFrameworkCore;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Api;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        // Connection string is read lazily from DI's IConfiguration (not builder.Configuration
        // directly) so that config overrides applied by WebApplicationFactory in tests — which
        // attach after this point in the minimal-hosting pipeline — are honored.
        // Fixed server version (matches the mysql:8 image pinned in docker-compose.yml) rather
        // than ServerVersion.AutoDetect, which would require a live DB connection just to build
        // the DbContext options.
        builder.Services.AddDbContext<TicketingSystemDbContext>((serviceProvider, options) =>
        {
            var connectionString = serviceProvider.GetRequiredService<IConfiguration>().GetConnectionString("Default")
                ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured.");
            options.UseMySql(connectionString, new MySqlServerVersion(new Version(8, 0, 0)));
        });

        var app = builder.Build();

        // Skipped under the "Testing" environment (WebApplicationFactory-based tests) so a
        // health-endpoint smoke test doesn't require a live MySQL instance; real DB-backed
        // integration tests run against an actual database instead (see Epic 08).
        if (!app.Environment.IsEnvironment("Testing"))
        {
            using var scope = app.Services.CreateScope();
            scope.ServiceProvider.GetRequiredService<TicketingSystemDbContext>().Database.Migrate();
        }

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseAuthorization();

        app.MapControllers();

        // Liveness: process is up, no dependency check.
        app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

        // Readiness: only healthy once the database is reachable — used by
        // docker-compose / orchestrators to gate dependent startup.
        app.MapGet("/health/ready", async (TicketingSystemDbContext db) =>
        {
            var canConnect = await db.Database.CanConnectAsync();
            return canConnect
                ? Results.Ok(new { status = "ready" })
                : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        });

        app.Run();
    }
}
