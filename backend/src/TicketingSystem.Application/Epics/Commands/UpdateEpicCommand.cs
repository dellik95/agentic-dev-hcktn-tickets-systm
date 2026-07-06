using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Epics.Commands;

public record UpdateEpicCommand(Guid Id, string Title, string? Description) : IRequest<EpicDto>;

public class UpdateEpicCommandValidator : AbstractValidator<UpdateEpicCommand>
{
    public UpdateEpicCommandValidator()
    {
        RuleFor(x => x.Title).NotEmpty().WithMessage("Epic title is required.");
    }
}
