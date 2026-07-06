using MediatR;

namespace TicketingSystem.Application.Teams.Queries;

public record GetTeamByIdQuery(Guid Id) : IRequest<TeamDto>;
