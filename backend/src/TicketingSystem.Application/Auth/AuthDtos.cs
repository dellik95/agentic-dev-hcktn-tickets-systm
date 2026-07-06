namespace TicketingSystem.Application.Auth;

public record AuthTokenResult(string AccessToken, string RefreshToken, int ExpiresInSeconds);

public record CurrentUserResult(Guid Id, string Email, bool EmailVerified);

// Codes for handler-thrown domain exceptions. Input-shape errors (empty email, short password,
// etc.) go through FluentValidation instead and surface as a generic VALIDATION_ERROR with
// per-field messages — see GlobalExceptionHandler.
public static class AuthErrorCodes
{
    public const string EmailTaken = "EMAIL_TAKEN";
    public const string InvalidCredentials = "INVALID_CREDENTIALS";
    public const string EmailNotVerified = "EMAIL_NOT_VERIFIED";
    public const string TokenInvalid = "TOKEN_INVALID";
    public const string TokenExpired = "TOKEN_EXPIRED";
}
