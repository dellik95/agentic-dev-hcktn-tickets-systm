using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Tickets.Commands;

public record ReplaceTicketStateTransitionRulesCommand(IReadOnlyList<TicketStateTransitionRuleDto> Rules)
    : IRequest<IReadOnlyList<TicketStateTransitionRuleDto>>;

public class ReplaceTicketStateTransitionRulesCommandValidator : AbstractValidator<ReplaceTicketStateTransitionRulesCommand>
{
    public ReplaceTicketStateTransitionRulesCommandValidator()
    {
        RuleForEach(x => x.Rules).ChildRules(rule =>
        {
            rule.RuleFor(r => r.FromState)
                .Must(v => v is "new" or "ready_for_implementation" or "in_progress" or "ready_for_acceptance" or "done")
                .WithMessage("FromState must be one of: new, ready_for_implementation, in_progress, ready_for_acceptance, done.");

            rule.RuleFor(r => r.ToState)
                .Must(v => v is "new" or "ready_for_implementation" or "in_progress" or "ready_for_acceptance" or "done")
                .WithMessage("ToState must be one of: new, ready_for_implementation, in_progress, ready_for_acceptance, done.");

            rule.RuleFor(r => r)
                .Must(r => r.FromState != r.ToState)
                .WithMessage("FromState and ToState must differ — a transition to the same state isn't a transition.");
        });

        // Without this, a duplicate (FromState, ToState) pair in the same request passes per-item
        // validation and then hits the unique index at SaveChangesAsync, surfacing as an unhandled
        // DbUpdateException (500) instead of a clean validation error.
        RuleFor(x => x.Rules)
            .Must(rules => rules.Select(r => (r.FromState, r.ToState)).Distinct().Count() == rules.Count)
            .WithMessage("Rules must not contain duplicate (FromState, ToState) pairs.");
    }
}
