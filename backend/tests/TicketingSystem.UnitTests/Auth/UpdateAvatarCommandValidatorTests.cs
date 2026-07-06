using TicketingSystem.Application.Auth.Commands;

namespace TicketingSystem.UnitTests.Auth;

public class UpdateAvatarCommandValidatorTests
{
    private readonly UpdateAvatarCommandValidator _validator = new();

    [Fact]
    public void Validate_Fails_ForValueNotStartingWithDataImagePrefix()
    {
        var result = _validator.Validate(new UpdateAvatarCommand(Guid.NewGuid(), "not-a-data-url"));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Fails_ForValueExceedingMaxLength()
    {
        var tooLong = "data:image/" + new string('A', 2_000_000);

        var result = _validator.Validate(new UpdateAvatarCommand(Guid.NewGuid(), tooLong));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Succeeds_ForValidDataUrl()
    {
        var result = _validator.Validate(new UpdateAvatarCommand(Guid.NewGuid(), "data:image/png;base64,AAAA"));

        Assert.True(result.IsValid);
    }
}
