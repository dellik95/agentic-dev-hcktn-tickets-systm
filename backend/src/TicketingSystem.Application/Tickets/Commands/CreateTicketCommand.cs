using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Tickets.Commands;

public record CreateTicketCommand(
    Guid TeamId,
    Guid CreatedById,
    string Type,
    string Title,
    string Body,
    Guid? EpicId) : IRequest<TicketDto>;

public class CreateTicketCommandValidator : AbstractValidator<CreateTicketCommand>
{
    public CreateTicketCommandValidator()
    {
        RuleFor(x => x.Type)
            .Must(v => v is "bug" or "feature" or "fix")
            .WithMessage("Type must be one of: bug, feature, fix.");
        RuleFor(x => x.Title).NotEmpty().WithMessage("Title is required.");
        RuleFor(x => x.Body).NotEmpty().WithMessage("Body is required.");
    }
}
