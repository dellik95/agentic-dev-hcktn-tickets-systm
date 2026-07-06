using MediatR;

namespace TicketingSystem.Application.Tickets.Commands;

public record DeleteTicketCommand(Guid Id) : IRequest;
