using TicketingSystem.Application.Auth.Commands;

namespace TicketingSystem.UnitTests.Auth;

public class ForgotPasswordCommandValidatorTests
{
    private readonly ForgotPasswordCommandValidator _validator = new();

    [Fact]
    public void Validate_Fails_ForEmptyEmail()
    {
        var result = _validator.Validate(new ForgotPasswordCommand(""));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Succeeds_ForValidEmail()
    {
        var result = _validator.Validate(new ForgotPasswordCommand("user@example.com"));

        Assert.True(result.IsValid);
    }
}
