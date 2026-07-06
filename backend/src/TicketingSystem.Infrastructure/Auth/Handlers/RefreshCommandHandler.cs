using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Options;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class RefreshCommandHandler(
    TicketingSystemDbContext db,
    IJwtTokenService jwtTokenService,
    IOptions<JwtOptions> jwtOptions) : IRequestHandler<RefreshCommand, AuthTokenResult>
{
    public async Task<AuthTokenResult> Handle(RefreshCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = TokenCrypto.Hash(request.RefreshToken);
        var entity = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        var now = DateTime.UtcNow;
        if (entity is null || !entity.IsActive(now))
            throw new BadRequestException(AuthErrorCodes.TokenInvalid, "Refresh token is invalid, expired, or revoked.");

        var user = await db.Users.FirstAsync(u => u.Id == entity.UserId, cancellationToken);

        entity.RevokedAt = now;
        var (tokens, newEntity) = await AuthTokenIssuer.IssueAsync(db, jwtTokenService, jwtOptions.Value, user, cancellationToken);
        entity.ReplacedByTokenId = newEntity.Id;
        await db.SaveChangesAsync(cancellationToken);

        return tokens;
    }
}
