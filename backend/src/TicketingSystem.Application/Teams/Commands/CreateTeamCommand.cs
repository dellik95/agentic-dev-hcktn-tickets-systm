using FluentValidation;
using MediatR;

namespace TicketingSystem.Application.Teams.Commands;

public record CreateTeamCommand(string Name) : IRequest<TeamDto>;

public class CreateTeamCommandValidator : AbstractValidator<CreateTeamCommand>
{
    public CreateTeamCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().WithMessage("Team name is required.");
    }
}
