using MediatR;

namespace TicketingSystem.Application.Epics.Queries;

public record GetEpicByIdQuery(Guid Id) : IRequest<EpicDto>;
