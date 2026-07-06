using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Options;
using TicketingSystem.Domain.Entities;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Auth;

// Orchestrates the auth use cases against the real DbContext, so it lives here rather than in
// TicketingSystem.Application — keeps Application free of EF Core for fast, DB-less unit tests
// (see docs/02-architecture-and-tech-stack.md).
public class AuthService(
    TicketingSystemDbContext db,
    IPasswordHasher passwordHasher,
    IEmailSender emailSender,
    IJwtTokenService jwtTokenService,
    IOptions<JwtOptions> jwtOptions,
    IOptions<FrontendOptions> frontendOptions) : IAuthService
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;
    private readonly FrontendOptions _frontendOptions = frontendOptions.Value;

    public async Task<Result> SignUpAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);

        if (string.IsNullOrWhiteSpace(normalizedEmail) || !normalizedEmail.Contains('@'))
            return Result.Failure(AuthErrorCodes.InvalidEmail, "A valid email address is required.");

        if (password.Length < 8)
            return Result.Failure(AuthErrorCodes.WeakPassword, "Password must be at least 8 characters.");

        if (await db.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken))
            return Result.Failure(AuthErrorCodes.EmailTaken, "An account with this email already exists.");

        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            PasswordHash = passwordHasher.Hash(password),
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Users.Add(user);

        var rawToken = CreateVerificationToken(user.Id, now);
        await db.SaveChangesAsync(cancellationToken);

        await SendVerificationEmailAsync(user.Email, rawToken, cancellationToken);

        return Result.Success();
    }

    public async Task<Result> VerifyEmailAsync(string token, CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(token);
        var entity = await db.EmailVerificationTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (entity is null || entity.UsedAt is not null || entity.InvalidatedAt is not null)
            return Result.Failure(AuthErrorCodes.TokenInvalid, "This verification link is invalid or has already been used.");

        var now = DateTime.UtcNow;
        if (entity.ExpiresAt <= now)
            return Result.Failure(AuthErrorCodes.TokenExpired, "This verification link has expired.");

        entity.UsedAt = now;

        var user = await db.Users.FirstAsync(u => u.Id == entity.UserId, cancellationToken);
        user.EmailVerifiedAt = now;

        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task ResendVerificationAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
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

        var rawToken = CreateVerificationToken(user.Id, now);
        await db.SaveChangesAsync(cancellationToken);

        await SendVerificationEmailAsync(user.Email, rawToken, cancellationToken);
    }

    public async Task<Result<AuthTokenResult>> LoginAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = NormalizeEmail(email);
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user is null || !passwordHasher.Verify(password, user.PasswordHash))
            return Result<AuthTokenResult>.Failure(AuthErrorCodes.InvalidCredentials, "Invalid email or password.");

        if (!user.IsEmailVerified)
            return Result<AuthTokenResult>.Failure(AuthErrorCodes.EmailNotVerified, "Please verify your email before logging in.");

        var (tokens, _) = await IssueTokenPairAsync(user, cancellationToken);
        return Result<AuthTokenResult>.Success(tokens);
    }

    public async Task<Result<AuthTokenResult>> RefreshAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(refreshToken);
        var entity = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        var now = DateTime.UtcNow;
        if (entity is null || !entity.IsActive(now))
            return Result<AuthTokenResult>.Failure(AuthErrorCodes.TokenInvalid, "Refresh token is invalid, expired, or revoked.");

        var user = await db.Users.FirstAsync(u => u.Id == entity.UserId, cancellationToken);

        entity.RevokedAt = now;
        var (tokens, newEntity) = await IssueTokenPairAsync(user, cancellationToken);
        entity.ReplacedByTokenId = newEntity.Id;
        await db.SaveChangesAsync(cancellationToken);

        return Result<AuthTokenResult>.Success(tokens);
    }

    public async Task LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = HashToken(refreshToken);
        var entity = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, cancellationToken);

        if (entity is not null && entity.RevokedAt is null)
        {
            entity.RevokedAt = DateTime.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<(AuthTokenResult Tokens, RefreshToken Entity)> IssueTokenPairAsync(User user, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var rawRefreshToken = GenerateRawToken();

        var entity = new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            TokenHash = HashToken(rawRefreshToken),
            ExpiresAt = now.AddDays(_jwtOptions.RefreshTokenDays),
            CreatedAt = now,
        };
        db.RefreshTokens.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        var accessToken = jwtTokenService.GenerateAccessToken(user);
        return (new AuthTokenResult(accessToken, rawRefreshToken, _jwtOptions.AccessTokenMinutes * 60), entity);
    }

    private string CreateVerificationToken(Guid userId, DateTime now)
    {
        var rawToken = GenerateRawToken();
        db.EmailVerificationTokens.Add(new EmailVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TokenHash = HashToken(rawToken),
            ExpiresAt = now.AddHours(24),
            CreatedAt = now,
        });
        return rawToken;
    }

    private async Task SendVerificationEmailAsync(string email, string rawToken, CancellationToken cancellationToken)
    {
        var link = $"{_frontendOptions.BaseUrl.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(rawToken)}";
        var html = $"""
            <p>Welcome! Confirm your email address to activate your account:</p>
            <p><a href="{link}">{link}</a></p>
            <p>This link expires in 24 hours and can only be used once.</p>
            """;
        await emailSender.SendAsync(email, "Verify your email", html, cancellationToken);
    }

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();

    private static string GenerateRawToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    private static string HashToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
