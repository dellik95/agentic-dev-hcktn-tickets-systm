using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Epics.Commands;

public record CreateEpicCommand(Guid TeamId, string Title, string? Description) : IRequest<EpicDto>;

public class CreateEpicCommandValidator : AbstractValidator<CreateEpicCommand>
{
    public CreateEpicCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Epic title is required.");
    }
}
