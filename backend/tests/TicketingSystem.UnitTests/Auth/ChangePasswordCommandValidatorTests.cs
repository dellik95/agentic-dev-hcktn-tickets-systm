using TicketingSystem.Application.Auth.Commands;

namespace TicketingSystem.UnitTests.Auth;

public class ChangePasswordCommandValidatorTests
{
    private readonly ChangePasswordCommandValidator _validator = new();

    [Fact]
    public void Validate_Fails_ForNewPasswordUnderEightCharacters()
    {
        var result = _validator.Validate(new ChangePasswordCommand(Guid.NewGuid(), "currentpass", "short"));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Succeeds_ForValidNewPassword()
    {
        var result = _validator.Validate(new ChangePasswordCommand(Guid.NewGuid(), "currentpass", "correcthorse123"));

        Assert.True(result.IsValid);
    }
}
