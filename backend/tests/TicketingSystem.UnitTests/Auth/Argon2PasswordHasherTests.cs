using TicketingSystem.Infrastructure.Auth;

namespace TicketingSystem.UnitTests.Auth;

public class Argon2PasswordHasherTests
{
    private readonly Argon2PasswordHasher _hasher = new();

    [Fact]
    public void Verify_ReturnsTrue_ForCorrectPassword()
    {
        var hash = _hasher.Hash("correct-horse-battery-staple");

        Assert.True(_hasher.Verify("correct-horse-battery-staple", hash));
    }

    [Fact]
    public void Verify_ReturnsFalse_ForWrongPassword()
    {
        var hash = _hasher.Hash("correct-horse-battery-staple");

        Assert.False(_hasher.Verify("wrong-password", hash));
    }

    [Fact]
    public void Hash_NeverProducesPlainText()
    {
        var password = "correct-horse-battery-staple";

        var hash = _hasher.Hash(password);

        Assert.DoesNotContain(password, hash);
        Assert.StartsWith("argon2id$", hash);
    }

    [Fact]
    public void Hash_ProducesDifferentOutput_ForSamePasswordEachTime()
    {
        var password = "correct-horse-battery-staple";

        var hash1 = _hasher.Hash(password);
        var hash2 = _hasher.Hash(password);

        Assert.NotEqual(hash1, hash2); // random salt per call
        Assert.True(_hasher.Verify(password, hash1));
        Assert.True(_hasher.Verify(password, hash2));
    }
}
