using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Auth.Commands;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Options;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth.Handlers;

public class LoginCommandHandler(
    TicketingSystemDbContext db,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService,
    IOptions<JwtOptions> jwtOptions) : IRequestHandler<LoginCommand, AuthTokenResult>
{
    public async Task<AuthTokenResult> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null || !passwordHasher.Verify(request.Password, user.PasswordHash))
            throw new UnauthorizedException(AuthErrorCodes.InvalidCredentials, "Invalid email or password.");

        if (!user.IsEmailVerified)
            throw new ForbiddenException(AuthErrorCodes.EmailNotVerified, "Please verify your email before logging in.");

        var (tokens, _) = await AuthTokenIssuer.IssueAsync(db, jwtTokenService, jwtOptions.Value, user, cancellationToken);
        return tokens;
    }
}
