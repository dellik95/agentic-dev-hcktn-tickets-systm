using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Application.Options;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class ResendVerificationCommandHandler(
    TicketingSystemDbContext db,
    IEmailSender emailSender,
    IOptions<FrontendOptions> frontendOptions) : IRequestHandler<ResendVerificationCommand>
{
    public async Task Handle(ResendVerificationCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        // Silent no-op for unknown/already-verified accounts — avoids user enumeration.
        if (user is null || user.IsEmailVerified)
            return;

        var now = DateTime.UtcNow;

        var priorTokens = await db.EmailVerificationTokens
            .Where(t => t.UserId == user.Id && t.UsedAt == null && t.InvalidatedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var priorToken in priorTokens)
            priorToken.InvalidatedAt = now;

        var rawToken = TokenCrypto.GenerateRawToken();
        db.EmailVerificationTokens.Add(new Domain.Entities.EmailVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = TokenCrypto.Hash(rawToken),
            ExpiresAt = now.AddHours(24),
            CreatedAt = now,
        });

        await db.SaveChangesAsync(cancellationToken);

        await VerificationEmailer.SendAsync(emailSender, frontendOptions.Value, user.Email, rawToken, cancellationToken);
    }
}
