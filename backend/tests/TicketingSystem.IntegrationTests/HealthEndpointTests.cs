using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace TicketingSystem.IntegrationTests;

public class HealthEndpointTests : IClassFixture<WebApplicationFactory<Api.Program>>
{
    private readonly WebApplicationFactory<Api.Program> _factory;

    public HealthEndpointTests(WebApplicationFactory<Api.Program> factory)
    {
        // "Testing" environment skips the startup DB migration (Program.cs) and a dummy
        // connection string satisfies DI registration — /health itself never touches the DB.
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:Default"] = "Server=localhost;Port=3306;Database=test;User=root;Password=x;",
                });
            });
        });
    }

    [Fact]
    public async Task Health_ReturnsOk_WithoutAnyDependency()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
