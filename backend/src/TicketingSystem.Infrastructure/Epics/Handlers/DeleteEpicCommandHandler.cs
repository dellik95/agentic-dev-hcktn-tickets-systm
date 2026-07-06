using MediatR;
using Microsoft.EntityFrameworkCore;
using TicketingSystem.Application.Common;
using TicketingSystem.Application.Epics;
using TicketingSystem.Application.Epics.Commands;
using TicketingSystem.Infrastructure.Persistence;

namespace TicketingSystem.Infrastructure.Epics.Handlers;

public class DeleteEpicCommandHandler(TicketingSystemDbContext db) : IRequestHandler<DeleteEpicCommand>
{
    public async Task Handle(DeleteEpicCommand request, CancellationToken cancellationToken)
    {
        var epic = await db.Epics.FindAsync([request.Id], cancellationToken)
            ?? throw new NotFoundException(EpicErrorCodes.NotFound, "Epic not found.");

        var hasTickets = await db.Tickets.AnyAsync(t => t.EpicId == request.Id, cancellationToken);
        if (hasTickets)
            throw new ConflictException(EpicErrorCodes.HasTickets, "Epic cannot be deleted because it still has tickets.");

        db.Epics.Remove(epic);
        await db.SaveChangesAsync(cancellationToken);
    }
}
