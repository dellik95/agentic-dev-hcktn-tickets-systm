using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class LogoutCommandHandler(TicketingSystemDbContext db) : IRequestHandler<LogoutCommand>
{
    public async Task Handle(LogoutCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = TokenCrypto.Hash(request.RefreshToken);
        var entity = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (entity is not null && entity.RevokedAt is null)
        {
            entity.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
