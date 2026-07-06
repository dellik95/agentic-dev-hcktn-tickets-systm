using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Application.Common;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class ResetPasswordCommandHandler(TicketingSystemDbContext db, IPasswordHasher passwordHasher)
    : IRequestHandler<ResetPasswordCommand>
{
    public async Task Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
    {
        var tokenHash = TokenCrypto.Hash(request.Token);
        var entity = await db.PasswordResetTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (entity is null || entity.UsedAt is not null || entity.InvalidatedAt is not null)
            throw new BadRequestException(AuthErrorCodes.TokenInvalid, "This password reset link is invalid or has already been used.");

        var now = DateTime.UtcNow;
        if (entity.ExpiresAt <= now)
            throw new BadRequestException(AuthErrorCodes.TokenExpired, "This password reset link has expired.");

        entity.UsedAt = now;

        var user = await db.Users.FirstAsync(u => u.Id == entity.UserId, cancellationToken);
        user.PasswordHash = passwordHasher.Hash(request.NewPassword);
        user.UpdatedAt = now;

        await db.SaveChangesAsync(cancellationToken);
    }
}
