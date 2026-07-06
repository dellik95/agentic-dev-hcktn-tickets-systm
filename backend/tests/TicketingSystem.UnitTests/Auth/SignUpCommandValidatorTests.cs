using TicketingSystem.Application.Auth.Commands;

namespace TicketingSystem.UnitTests.Auth;

public class SignUpCommandValidatorTests
{
    private readonly SignUpCommandValidator _validator = new();

    [Fact]
    public void Validate_Fails_ForInvalidEmail()
    {
        var result = _validator.Validate(new SignUpCommand("not-an-email", "correcthorse123"));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Fails_ForPasswordUnderEightCharacters()
    {
        var result = _validator.Validate(new SignUpCommand("user@example.com", "short"));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Succeeds_ForValidEmailAndPassword()
    {
        var result = _validator.Validate(new SignUpCommand("user@example.com", "correcthorse123"));

        Assert.True(result.IsValid);
    }
}
