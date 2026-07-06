using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Options;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class SignUpCommandHandler(
    TicketingSystemDbContext db,
    IPasswordHasher passwordHasher,
    IEmailSender emailSender,
    IOptions<FrontendOptions> frontendOptions) : IRequestHandler<SignUpCommand>
{
    public async Task Handle(SignUpCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        if (await db.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken))
            throw new ConflictException(AuthErrorCodes.EmailTaken, "An account with this email already exists.");

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = passwordHasher.Hash(request.Password),
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Users.Add(user);

        var rawToken = TokenCrypto.GenerateRawToken();
        db.EmailVerificationTokens.Add(new EmailVerificationToken
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
