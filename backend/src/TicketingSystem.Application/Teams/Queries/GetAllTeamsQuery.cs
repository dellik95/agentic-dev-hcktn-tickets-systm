using MediatR;

namespace TicketingSystem.Application.Teams.Queries;

public record GetAllTeamsQuery : IRequest<IReadOnlyList<TeamDto>>;
