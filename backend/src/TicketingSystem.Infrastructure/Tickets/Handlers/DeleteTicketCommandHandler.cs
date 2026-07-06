using MediatR;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Tickets;
using TicketingSystem.Application.Tickets.Commands;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Tickets.Handlers;

public class DeleteTicketCommandHandler(TicketingSystemDbContext db) : IRequestHandler<DeleteTicketCommand>
{
    public async Task Handle(DeleteTicketCommand request, CancellationToken cancellationToken)
    {
        var ticket = await db.Tickets.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(TicketErrorCodes.NotFound, "Ticket not found.");

        db.Tickets.Remove(ticket);
        await db.SaveChangesAsync(cancellationToken);
    }
}
