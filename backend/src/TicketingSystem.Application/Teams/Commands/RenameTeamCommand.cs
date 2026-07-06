using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Teams.Commands;

public record RenameTeamCommand(Guid Id, string Name) : IRequest<TeamDto>;

public class RenameTeamCommandValidator : AbstractValidator<RenameTeamCommand>
{
    public RenameTeamCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Team name is required.");
    }
}
