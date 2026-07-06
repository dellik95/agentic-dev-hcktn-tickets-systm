using MediatR;

namespace TicketingSystem.Application.Epics.Queries;

public record GetEpicsByTeamQuery(Guid TeamId) : IRequest<IReadOnlyList<EpicDto>>;
