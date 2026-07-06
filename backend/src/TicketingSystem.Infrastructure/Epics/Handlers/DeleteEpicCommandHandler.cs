using MediatR;
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

        // No dependent-check needed yet — tickets don't exist until Epic 04. Extend this handler
        // with the same EPIC_HAS_TICKETS conflict described in docs/epics/EPIC-03-epics.md T03.3
        // once they do.
        db.Epics.Remove(epic);
        await db.SaveChangesAsync(cancellationToken);
    }
}
