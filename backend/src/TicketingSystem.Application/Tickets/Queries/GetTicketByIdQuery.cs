using MediatR;

namespace TicketingSystem.Application.Tickets.Queries;

public record GetTicketByIdQuery(Guid Id) : IRequest<TicketDto>;
