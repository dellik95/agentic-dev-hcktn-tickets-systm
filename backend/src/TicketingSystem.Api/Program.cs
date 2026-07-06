using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using TicketingSystem.Api.Middleware;
using TicketingSystem.Application.Options;
using TicketingSystem.Infrastructure;
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

        builder.Services.AddInfrastructure(builder.Configuration);

        builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
        builder.Services.AddProblemDetails();

        builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer();

        // Bound from IOptions<JwtOptions> (not builder.Configuration directly) so this resolves
        // lazily against the fully-merged configuration — same reasoning as the DbContext
        // connection string above.
        builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<IOptions<JwtOptions>>((bearerOptions, jwtOptions) =>
            {
                var jwt = jwtOptions.Value;
                bearerOptions.MapInboundClaims = false; // keep short claim names ("sub", "email") as issued
                bearerOptions.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Issuer,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                    ClockSkew = TimeSpan.FromSeconds(30),
                };
            });

        // Default policy for bare [Authorize] attributes: authenticated AND email-verified.
        // Every controller in later epics relies on this instead of re-declaring the check.
        builder.Services.AddAuthorizationBuilder()
            .SetDefaultPolicy(new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .RequireClaim("email_verified", "true")
                .Build());

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

        app.UseExceptionHandler();

        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        // Under /api (not versioned — health checks are deliberately excluded from /api/v1) so
        // nginx's prefix-preserving proxy_pass (see frontend/nginx.conf) reaches them.

        // Liveness: process is up, no dependency check.
        app.MapGet("/api/health", () => Results.Ok(new { status = "healthy" }));

        // Readiness: only healthy once the database is reachable — used by
        // docker-compose / orchestrators to gate dependent startup.
        app.MapGet("/api/health/ready", async (TicketingSystemDbContext db) =>
        {
            var canConnect = await db.Database.CanConnectAsync();
            return canConnect
                ? Results.Ok(new { status = "ready" })
                : Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
        });

        app.Run();
    }
}
