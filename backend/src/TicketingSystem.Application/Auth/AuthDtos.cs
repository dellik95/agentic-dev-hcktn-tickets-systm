namespace TicketingSystem.Application.Auth;

public record SignUpRequest(string Email, string Password);

public record LoginRequest(string Email, string Password);

public record RefreshTokenRequest(string RefreshToken);

public record ResendVerificationRequest(string Email);

public record AuthTokenResult(string AccessToken, string RefreshToken, int ExpiresInSeconds);

public record CurrentUserResult(Guid Id, string Email, DateTime? EmailVerifiedAt);

public static class AuthErrorCodes
{
    public const string EmailTaken = "EMAIL_TAKEN";
    public const string InvalidEmail = "INVALID_EMAIL";
    public const string WeakPassword = "WEAK_PASSWORD";
    public const string InvalidCredentials = "INVALID_CREDENTIALS";
    public const string EmailNotVerified = "EMAIL_NOT_VERIFIED";
    public const string TokenInvalid = "TOKEN_INVALID";
    public const string TokenExpired = "TOKEN_EXPIRED";
}
