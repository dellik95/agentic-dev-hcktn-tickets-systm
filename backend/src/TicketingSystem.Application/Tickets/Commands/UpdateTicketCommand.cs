using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Tickets.Commands;

public record UpdateTicketCommand(
    Guid Id,
    Guid TeamId,
    string Type,
    Guid? EpicId,
    string Title,
    string Body,
    string State) : IRequest<TicketDto>;

public class UpdateTicketCommandValidator : AbstractValidator<UpdateTicketCommand>
{
    public UpdateTicketCommandValidator()
    {
        RuleFor(x => x.Type)
            .Must(v => v is "bug" or "feature" or "fix")
            .WithMessage("Type must be one of: bug, feature, fix.");
        RuleFor(x => x.Title).NotEmpty().WithMessage("Title is required.");
        RuleFor(x => x.Body).NotEmpty().WithMessage("Body is required.");
        RuleFor(x => x.State)
            .Must(v => v is "new" or "ready_for_implementation" or "in_progress" or "ready_for_acceptance" or "done")
            .WithMessage("Invalid state value.");
    }
}
