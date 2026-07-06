using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Commands;

namespace TicketingSystem.UnitTests.Tickets;

public class ReplaceTicketStateTransitionRulesCommandValidatorTests
{
    private readonly ReplaceTicketStateTransitionRulesCommandValidator _validator = new();

    [Fact]
    public void Validate_Succeeds_ForEmptyList()
    {
        var command = new ReplaceTicketStateTransitionRulesCommand([]);

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_Succeeds_ForValidList()
    {
        var command = new ReplaceTicketStateTransitionRulesCommand(
        [
            new TicketStateTransitionRuleDto("new", "ready_for_implementation"),
            new TicketStateTransitionRuleDto("ready_for_implementation", "in_progress"),
            new TicketStateTransitionRuleDto("in_progress", "ready_for_acceptance"),
            new TicketStateTransitionRuleDto("ready_for_acceptance", "done"),
        ]);

        var result = _validator.Validate(command);

        Assert.True(result.IsValid);
    }

    [Theory]
    [InlineData("unknown", "done")]
    [InlineData("New", "done")]
    [InlineData("", "done")]
    public void Validate_Fails_ForUnknownFromState(string fromState, string toState)
    {
        var command = new ReplaceTicketStateTransitionRulesCommand(
            [new TicketStateTransitionRuleDto(fromState, toState)]);

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("new", "unknown")]
    [InlineData("new", "Done")]
    [InlineData("new", "")]
    public void Validate_Fails_ForUnknownToState(string fromState, string toState)
    {
        var command = new ReplaceTicketStateTransitionRulesCommand(
            [new TicketStateTransitionRuleDto(fromState, toState)]);

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Theory]
    [InlineData("new")]
    [InlineData("in_progress")]
    [InlineData("done")]
    public void Validate_Fails_WhenFromStateEqualsToState(string state)
    {
        var command = new ReplaceTicketStateTransitionRulesCommand(
            [new TicketStateTransitionRuleDto(state, state)]);

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }

    [Fact]
    public void Validate_Fails_ForDuplicatePair()
    {
        // Without this rule, a duplicate pair passes validation and only fails later at
        // SaveChangesAsync's unique-index constraint, surfacing as an unhandled 500 instead of a
        // clean validation error.
        var command = new ReplaceTicketStateTransitionRulesCommand(
        [
            new TicketStateTransitionRuleDto("new", "done"),
            new TicketStateTransitionRuleDto("new", "done"),
        ]);

        var result = _validator.Validate(command);

        Assert.False(result.IsValid);
    }
}
