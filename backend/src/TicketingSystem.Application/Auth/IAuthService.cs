using TicketingSystem.Application.Common;

namespace TicketingSystem.Application.Auth;

public interface IAuthService
{
    Task<Result> SignUpAsync(string email, string password, CancellationToken cancellationToken = default);

    Task<Result> VerifyEmailAsync(string token, CancellationToken cancellationToken = default);

    /// Always no-op-safe: never reveals whether the email exists or is already verified.
    Task ResendVerificationAsync(string email, CancellationToken cancellationToken = default);

    Task<Result<AuthTokenResult>> LoginAsync(string email, string password, CancellationToken cancellationToken = default);

    Task<Result<AuthTokenResult>> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default);

    Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default);
}
