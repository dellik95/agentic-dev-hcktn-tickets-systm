using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Options;

namespace TicketingSystem.Infrastructure.Auth;

// Shared by ForgotPasswordCommandHandler.
internal static class PasswordResetEmailer
{
    public static Task SendAsync(
        IEmailSender emailSender,
        FrontendOptions frontendOptions,
        string email,
        string rawToken,
        CancellationToken cancellationToken)
    {
        var link = $"{frontendOptions.BaseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(rawToken)}";
        var html = $"""
            <p>We received a request to reset your password. Click the link below to choose a new one:</p>
            <p><a href="{link}">{link}</a></p>
            <p>This link expires in 1 hour and can only be used once. If you didn't request this, you can safely ignore this email.</p>
            """;
        return emailSender.SendAsync(email, "Reset your password", html, cancellationToken);
    }
}
