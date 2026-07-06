using System.Security.Cryptography;
using System.Text;

namespace TicketingSystem.Infrastructure.Auth;

// Shared by every auth command handler that issues or checks a token (verification, refresh).
internal static class TokenCrypto
{
    public static string GenerateRawToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))
            .Replace('+', '-').Replace('/', '_').TrimEnd('=');

    public static string Hash(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}
