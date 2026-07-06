using TicketingSystem.Application.Auth.Commands;

namespace TicketingSystem.UnitTests.Auth;

public class ResetPasswordCommandValidatorTests
{
    private readonly ResetPasswordCommandValidator _validator = new();

    [Fact]
    public void Validate_Fails_ForEmptyToken()
    {
        var result = _validator.Validate(new ResetPasswordCommand("", "correcthorse123"));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Fails_ForNewPasswordUnderEightCharacters()
    {
        var result = _validator.Validate(new ResetPasswordCommand("some-token", "short"));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Succeeds_ForValidTokenAndPassword()
    {
        var result = _validator.Validate(new ResetPasswordCommand("some-token", "correcthorse123"));

        Assert.True(result.IsValid);
    }
}
