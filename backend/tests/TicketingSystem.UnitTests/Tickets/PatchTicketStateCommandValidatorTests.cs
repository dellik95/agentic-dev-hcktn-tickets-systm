using TicketingSystem.Application.Tickets.Commands;

namespace TicketingSystem.UnitTests.Tickets;

public class PatchTicketStateCommandValidatorTests
{
    private readonly PatchTicketStateCommandValidator _validator = new();

    [Theory]
    [InlineData("")]
    [InlineData("unknown")]
    [InlineData("New")]
    public void Validate_Fails_ForInvalidState(string state)
    {
        var result = _validator.Validate(new PatchTicketStateCommand(Guid.NewGuid(), state));

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
        var result = _validator.Validate(new PatchTicketStateCommand(Guid.NewGuid(), state));

        Assert.True(result.IsValid);
    }
}
