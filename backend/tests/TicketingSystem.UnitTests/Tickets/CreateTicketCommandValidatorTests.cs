using TicketingSystem.Application.Tickets.Commands;

namespace TicketingSystem.UnitTests.Tickets;

public class CreateTicketCommandValidatorTests
{
    private readonly CreateTicketCommandValidator _validator = new();

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_Fails_ForEmptyOrWhitespaceTitle(string title)
    {
        var result = _validator.Validate(new CreateTicketCommand(
            Guid.NewGuid(), Guid.NewGuid(), "bug", title, "Some body", null));

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_Fails_ForEmptyOrWhitespaceBody(string body)
    {
        var result = _validator.Validate(new CreateTicketCommand(
            Guid.NewGuid(), Guid.NewGuid(), "bug", "Some title", body, null));

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("Bug")]
    [InlineData("BUG")]
    [InlineData("unknown")]
    public void Validate_Fails_ForInvalidOrWrongCaseType(string type)
    {
        var result = _validator.Validate(new CreateTicketCommand(
            Guid.NewGuid(), Guid.NewGuid(), type, "Some title", "Some body", null));

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("bug")]
    [InlineData("feature")]
    [InlineData("fix")]
    public void Validate_Succeeds_ForValidType(string type)
    {
        var result = _validator.Validate(new CreateTicketCommand(
            Guid.NewGuid(), Guid.NewGuid(), type, "Some title", "Some body", null));

        Assert.True(result.IsValid);
    }
}
