using MediatR;

namespace TicketingSystem.Application.Epics.Commands;

public record DeleteEpicCommand(Guid Id) : IRequest;
