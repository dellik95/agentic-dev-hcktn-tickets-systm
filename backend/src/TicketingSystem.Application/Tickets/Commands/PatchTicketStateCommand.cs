using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Tickets.Commands;

public record PatchTicketStateCommand(Guid Id, string State) : IRequest<TicketDto>;

public class PatchTicketStateCommandValidator : AbstractValidator<PatchTicketStateCommand>
{
    public PatchTicketStateCommandValidator()
    {
        RuleFor(x => x.State)
            .Must(v => v is "new" or "ready_for_implementation" or "in_progress" or "ready_for_acceptance" or "done")
            .WithMessage("Invalid state value.");
    }
}
