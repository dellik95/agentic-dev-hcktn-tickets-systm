using TicketingSystem.Application.Auth;
using TicketingSystem.Application.Options;

namespace TicketingSystem.Infrastructure.Auth;

// Shared by SignUpCommandHandler and ResendVerificationCommandHandler.
internal static class VerificationEmailer
{
    public static Task SendAsync(
        IEmailSender emailSender,
        FrontendOptions frontendOptions,
        string email,
        string rawToken,
        CancellationToken cancellationToken)
    {
        var link = $"{frontendOptions.BaseUrl.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(rawToken)}";
        var html = $"""
            <p>Welcome! Confirm your email address to activate your account:</p>
            <p><a href="{link}">{link}</a></p>
            <p>This link expires in 24 hours and can only be used once.</p>
            """;
        return emailSender.SendAsync(email, "Verify your email", html, cancellationToken);
    }
}
