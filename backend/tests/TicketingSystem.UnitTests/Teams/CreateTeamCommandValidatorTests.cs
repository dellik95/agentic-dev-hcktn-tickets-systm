using TicketingSystem.Application.Teams.Commands;

namespace TicketingSystem.UnitTests.Teams;

public class CreateTeamCommandValidatorTests
{
    private readonly CreateTeamCommandValidator _validator = new();

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_Fails_ForEmptyOrWhitespaceName(string name)
    {
        var result = _validator.Validate(new CreateTeamCommand(name));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Succeeds_ForNonEmptyName()
    {
        var result = _validator.Validate(new CreateTeamCommand("Platform"));

        Assert.True(result.IsValid);
    }
}
