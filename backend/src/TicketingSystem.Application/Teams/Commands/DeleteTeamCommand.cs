using MediatR;

namespace TicketingSystem.Application.Teams.Commands;

public record DeleteTeamCommand(Guid Id) : IRequest;
