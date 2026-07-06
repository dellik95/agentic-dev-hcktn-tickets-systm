using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Tickets.Queries;

public record GetTicketsByTeamQuery(Guid TeamId, string? Type, Guid? EpicId, string? State, string? Q)
    : IRequest<IReadOnlyList<TicketDto>>;

// Filters are optional query-string values, but WHEN present they must still be one of the known
// enum values — otherwise the handler's Enum.Parse throws an unhandled exception (500) instead of
// a clean 400, the exact anti-pattern T04.2 warns against on the write path.
public class GetTicketsByTeamQueryValidator : AbstractValidator<GetTicketsByTeamQuery>
{
    public GetTicketsByTeamQueryValidator()
    {
        RuleFor(x => x.Type)
            .Must(v => v is null or "bug" or "feature" or "fix")
            .WithMessage("Type must be one of: bug, feature, fix.");

        RuleFor(x => x.State)
            .Must(v => v is null or "new" or "ready_for_implementation" or "in_progress" or "ready_for_acceptance" or "done")
            .WithMessage("Invalid state value.");
    }
}
