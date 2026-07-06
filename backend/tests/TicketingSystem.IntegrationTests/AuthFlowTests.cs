using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Common;

namespace TicketingSystem.IntegrationTests;

// T08.1 — exercises the highest-risk flow (sign up -> verify -> log in -> authenticated call) end
// to end against a real MySQL (Testcontainers) and a real SMTP hop (Mailpit), not mocks.
[Collection("Integration")]
public class AuthFlowTests(IntegrationTestFixture fixture)
{
    [Fact]
    public async Task AuthFlow_SignUpVerifyLoginAndCallMe_SucceedsThenRejectsReusedVerificationToken()
    {
        var client = fixture.CreateClient();
        var email = $"auth-flow-{Guid.NewGuid():N}@example.com";
        const string password = "correct-horse-battery-staple";

        var signUpResponse = await client.PostAsJsonAsync("/api/v1/auth/signup", new { email, password });
        Assert.Equal(HttpStatusCode.Created, signUpResponse.StatusCode);

        var token = await MailpitClient.GetVerificationTokenAsync(fixture.MailpitHttpClient, email, CancellationToken.None);

        var verifyResponse = await client.GetAsync($"/api/v1/auth/verify-email?token={Uri.EscapeDataString(token)}");
        Assert.Equal(HttpStatusCode.OK, verifyResponse.StatusCode);

        var loginResponse = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password });
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
        var loginBody = await loginResponse.Content.ReadFromJsonAsync<ApiResponse<AuthTokenResult>>(TestJson.Options);
        var accessToken = loginBody!.Data!.AccessToken;
        Assert.False(string.IsNullOrWhiteSpace(accessToken));

        using var meRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        meRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var meResponse = await client.SendAsync(meRequest);
        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
        var meBody = await meResponse.Content.ReadFromJsonAsync<ApiResponse<CurrentUserResult>>(TestJson.Options);
        Assert.Equal(email, meBody!.Data!.Email, ignoreCase: true);
        Assert.True(meBody.Data.EmailVerified);

        // Reusing the same (already-consumed) token must fail: VerifyEmailCommandHandler finds
        // entity.UsedAt no longer null and throws BadRequestException(AuthErrorCodes.TokenInvalid),
        // mapped by GlobalExceptionHandler to 400.
        var reuseResponse = await client.GetAsync($"/api/v1/auth/verify-email?token={Uri.EscapeDataString(token)}");
        Assert.Equal(HttpStatusCode.BadRequest, reuseResponse.StatusCode);
        var reuseBody = await reuseResponse.Content.ReadFromJsonAsync<ApiResponse>(TestJson.Options);
        Assert.Equal(AuthErrorCodes.TokenInvalid, reuseBody!.Error!.Code);
    }
}
