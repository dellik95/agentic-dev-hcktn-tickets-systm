using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Options;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth;

// Shared by LoginCommandHandler and RefreshCommandHandler — issuing a fresh access+refresh
// pair is identical in both flows; only what happens to the *old* refresh token differs.
internal static class AuthTokenIssuer
{
    public static async Task<(AuthTokenResult Tokens, RefreshToken Entity)> IssueAsync(
        TicketingSystemDbContext db,
        IJwtTokenService jwtTokenService,
        JwtOptions jwtOptions,
        User user,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var rawRefreshToken = TokenCrypto.GenerateRawToken();

        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = TokenCrypto.Hash(rawRefreshToken),
            ExpiresAt = now.AddDays(jwtOptions.RefreshTokenDays),
            CreatedAt = now,
        };
        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        var accessToken = jwtTokenService.GenerateAccessToken(user);
        var tokens = new AuthTokenResult(accessToken, rawRefreshToken, jwtOptions.AccessTokenMinutes * 60);
        return (tokens, entity);
    }
}
