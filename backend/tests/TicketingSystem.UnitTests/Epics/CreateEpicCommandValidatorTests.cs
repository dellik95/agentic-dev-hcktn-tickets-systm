using TicketingSystem.Application.Epics.Commands;

namespace TicketingSystem.UnitTests.Epics;

public class CreateEpicCommandValidatorTests
{
    private readonly CreateEpicCommandValidator _validator = new();

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_Fails_ForEmptyOrWhitespaceTitle(string title)
    {
        var result = _validator.Validate(new CreateEpicCommand(Guid.NewGuid(), title, null));

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Succeeds_ForNonEmptyTitle()
    {
        var result = _validator.Validate(new CreateEpicCommand(Guid.NewGuid(), "Improve onboarding", null));

        Assert.True(result.IsValid);
    }
}
