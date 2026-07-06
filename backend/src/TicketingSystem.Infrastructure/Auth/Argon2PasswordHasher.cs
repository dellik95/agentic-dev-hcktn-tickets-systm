using System.Security.Cryptography;
using System.Text;
using Konscious.Security.Cryptography;
using TicketingSystem.Application.Auth;

namespace TicketingSystem.Infrastructure.Auth;

// Encodes the Argon2id parameters into the stored hash string so work factors can change over
// time without invalidating hashes created under older settings.
public class Argon2PasswordHasher : IPasswordHasher
{
    private const string Prefix = "argon2id";
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int DefaultIterations = 4;
    private const int DefaultMemoryKb = 65536; // 64 MB
    private const int DefaultParallelism = 2;

    public string Hash(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = ComputeHash(password, salt, DefaultMemoryKb, DefaultIterations, DefaultParallelism, HashSize);

        return $"{Prefix}$m={DefaultMemoryKb},t={DefaultIterations},p={DefaultParallelism}" +
               $"${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public bool Verify(string password, string encodedHash)
    {
        var parts = encodedHash.Split('$');
        if (parts.Length != 4 || parts[0] != Prefix)
            return false;

        var parameters = parts[1].Split(',')
            .Select(p => p.Split('='))
            .ToDictionary(kv => kv[0], kv => int.Parse(kv[1]));

        var salt = Convert.FromBase64String(parts[2]);
        var expectedHash = Convert.FromBase64String(parts[3]);

        var actualHash = ComputeHash(password, salt, parameters["m"], parameters["t"], parameters["p"], expectedHash.Length);

        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }

    private static byte[] ComputeHash(string password, byte[] salt, int memoryKb, int iterations, int parallelism, int hashSize)
    {
        using var argon2 = new Argon2id(Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            DegreeOfParallelism = parallelism,
            Iterations = iterations,
            MemorySize = memoryKb,
        };
        return argon2.GetBytes(hashSize);
    }
}
