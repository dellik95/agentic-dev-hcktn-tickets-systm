using System.Net.Http.Headers;
using System.Net.Http.Json;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Common;

namespace TicketingSystem.IntegrationTests;

// Shared by every integration test that needs a verified, logged-in user in order to call the
// [Authorize]-protected Teams/Epics/Tickets endpoints (T08.2, T08.3) — every one of those tests
// needs this exact same setup, so it isn't duplicated per test class.
internal static class AuthenticatedUserHelper
{
    /// <summary>
    /// Signs up a brand-new user, verifies their email via the token captured from Mailpit, logs
    /// in, and returns an <see cref="HttpClient"/> against the API with the resulting access token
    /// already attached as a Bearer header.
    /// </summary>
    public static async Task<HttpClient> CreateAuthenticatedClientAsync(IntegrationTestFixture fixture, CancellationToken ct)
    {
        var client = fixture.CreateClient();
        var email = $"user-{Guid.NewGuid():N}@example.com";
        const string password = "correct-horse-battery-staple";

        var signUpResponse = await client.PostAsJsonAsync("/api/v1/auth/signup", new { email, password }, ct);
        signUpResponse.EnsureSuccessStatusCode();

        var token = await MailpitClient.GetVerificationTokenAsync(fixture.MailpitHttpClient, email, ct);

        var verifyResponse = await client.GetAsync($"/api/v1/auth/verify-email?token={Uri.EscapeDataString(token)}", ct);
        verifyResponse.EnsureSuccessStatusCode();

        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password }, ct);
        loginResponse.EnsureSuccessStatusCode();

        var loginBody = await loginResponse.Content.ReadFromJsonAsync<ApiResponse<AuthTokenResult>>(TestJson.Options, ct);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", loginBody!.Data!.AccessToken);

        return client;
    }
}
