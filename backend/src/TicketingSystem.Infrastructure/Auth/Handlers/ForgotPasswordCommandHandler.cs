using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Application.Options;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class ForgotPasswordCommandHandler(
    TicketingSystemDbContext db,
    IEmailSender emailSender,
    IOptions<FrontendOptions> frontendOptions) : IRequestHandler<ForgotPasswordCommand>
{
    public async Task Handle(ForgotPasswordCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        // Silent no-op for unknown accounts — never reveal whether an email is registered.
        if (user is null)
            return;

        var now = DateTime.UtcNow;

        var rawToken = TokenCrypto.GenerateRawToken();
        db.PasswordResetTokens.Add(new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = TokenCrypto.Hash(rawToken),
            ExpiresAt = now.AddHours(1),
            CreatedAt = now,
        });

        await db.SaveChangesAsync(cancellationToken);

        await PasswordResetEmailer.SendAsync(emailSender, frontendOptions.Value, user.Email, rawToken, cancellationToken);
    }
}
