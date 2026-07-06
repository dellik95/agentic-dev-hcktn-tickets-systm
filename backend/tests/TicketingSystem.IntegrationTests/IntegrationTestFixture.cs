using DotNet.Testcontainers.Builders;
using DotNet.Testcontainers.Containers;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Testcontainers.MySql;

namespace TicketingSystem.IntegrationTests;

// Shared by every test class in the "Integration" collection (see IntegrationTestCollection below).
// Starting a MySQL + Mailpit container pair and booting a WebApplicationFactory is expensive, so
// xunit hands every test class in the collection this SAME instance rather than one per test.
public class IntegrationTestFixture : IAsyncLifetime
{
    private const int MailpitSmtpPort = 1025;
    private const int MailpitHttpPort = 8025;

    // Matches the MySqlServerVersion(8, 0, 0) Program.cs targets.
    private readonly MySqlContainer _mySqlContainer = new MySqlBuilder("mysql:8.0").Build();

    // No dedicated Testcontainers.Mailpit module exists, so this uses the generic ContainerBuilder
    // from the core Testcontainers package (brought in transitively by Testcontainers.MySql).
    private readonly IContainer _mailpitContainer = new ContainerBuilder("axllent/mailpit:latest")
        .WithPortBinding(MailpitSmtpPort, true)
        .WithPortBinding(MailpitHttpPort, true)
        .WithWaitStrategy(Wait.ForUnixContainer()
            .UntilHttpRequestIsSucceeded(request => request.ForPort(MailpitHttpPort).ForPath("/api/v1/messages")))
        .Build();

    private WebApplicationFactory<Api.Program>? _factory;
    private HttpClient? _mailpitHttpClient;

    public async Task InitializeAsync()
    {
        await Task.WhenAll(_mySqlContainer.StartAsync(), _mailpitContainer.StartAsync());

        _mailpitHttpClient = new HttpClient
        {
            BaseAddress = new Uri($"http://{_mailpitContainer.Hostname}:{_mailpitContainer.GetMappedPublicPort(MailpitHttpPort)}"),
        };

        _factory = new WebApplicationFactory<Api.Program>().WithWebHostBuilder(builder =>
        {
            // A name other than "Testing" so Program.cs's migrate-on-startup logic (gated on
            // !IsEnvironment("Testing")) actually runs, applying real migrations to the
            // Testcontainers MySQL instance instead of being skipped.
            builder.UseEnvironment("IntegrationTesting");
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:Default"] = _mySqlContainer.GetConnectionString(),
                    ["Jwt:SigningKey"] = "integration-test-signing-key-not-for-real-use-0123456789",
                    ["Jwt:Issuer"] = "ticketing-system-integration-tests",
                    ["Smtp:Host"] = _mailpitContainer.Hostname,
                    ["Smtp:Port"] = _mailpitContainer.GetMappedPublicPort(MailpitSmtpPort).ToString(),
                    ["Smtp:From"] = "no-reply@ticketing-system.test",
                    // Required by FrontendOptions — SignUpCommandHandler/ResendVerificationCommandHandler
                    // build the verification link from this to embed in the email Mailpit captures.
                    ["Frontend:BaseUrl"] = "http://localhost:5173",
                });
            });
        });
    }

    public async Task DisposeAsync()
    {
        if (_factory is not null)
            await _factory.DisposeAsync();

        _mailpitHttpClient?.Dispose();

        await _mySqlContainer.DisposeAsync();
        await _mailpitContainer.DisposeAsync();
    }

    /// <summary>Creates a fresh <see cref="HttpClient"/> against the API under test.</summary>
    public HttpClient CreateClient() => Factory.CreateClient();

    /// <summary>Mailpit's HTTP API (message listing/retrieval) — see MailpitClient.</summary>
    public HttpClient MailpitHttpClient => _mailpitHttpClient ?? throw NotInitialized();

    private WebApplicationFactory<Api.Program> Factory => _factory ?? throw NotInitialized();

    private static InvalidOperationException NotInitialized() =>
        new("IntegrationTestFixture has not been initialized yet — InitializeAsync must run first.");
}

[CollectionDefinition("Integration")]
public class IntegrationTestCollection : ICollectionFixture<IntegrationTestFixture>;
