using TicketingSystem.Application.Tickets.Commands;

namespace TicketingSystem.UnitTests.Tickets;

public class UpdateTicketCommandValidatorTests
{
    private readonly UpdateTicketCommandValidator _validator = new();

    private static UpdateTicketCommand ValidCommand(string type = "bug", string state = "new") =>
        new(Guid.NewGuid(), Guid.NewGuid(), type, null, "Some title", "Some body", state);

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_Fails_ForEmptyOrWhitespaceTitle(string title)
    {
        var command = ValidCommand() with { Title = title };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Validate_Fails_ForEmptyOrWhitespaceBody(string body)
    {
        var command = ValidCommand() with { Body = body };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("Bug")]
    [InlineData("BUG")]
    [InlineData("unknown")]
    public void Validate_Fails_ForInvalidOrWrongCaseType(string type)
    {
        var command = ValidCommand() with { Type = type };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("")]
    [InlineData("New")]
    [InlineData("unknown")]
    public void Validate_Fails_ForInvalidState(string state)
    {
        var command = ValidCommand() with { State = state };

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("new")]
    [InlineData("ready_for_implementation")]
    [InlineData("in_progress")]
    [InlineData("ready_for_acceptance")]
    [InlineData("done")]
    public void Validate_Succeeds_ForValidState(string state)
    {
        var command = ValidCommand() with { State = state };

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }
}
